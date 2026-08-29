import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as pdfMake from 'pdfmake/build/pdfmake';
import { WorkerAsoInput } from './aso-worker.types';
import { gerarTemplateAsoWorker } from './templates/asoWorker';
import { gerarTemplateRelatorioAtendimento } from './templates/relatorioAtendimento';
import { AzureBlobService } from 'src/azure/AzureBlob.service';
import { standardizeFileName } from 'src/utils/util';
import { resolveRelatorioEvidenciasUrl } from './autenticacao-evidencias-url.util';
import * as crypto from 'crypto';

import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

@Injectable()
export class AsoWorkerService {
  constructor(private readonly blobService: AzureBlobService) {}

  async gerar(data: WorkerAsoInput) {
    try {
      // Tenta baixar a imagem da biometria se houver um caminho de blob
      if (
        data.autenticacaoAtendimento.metodo === 'BIOMETRIA' &&
        data.autenticacaoAtendimento.biometria?.digitalDocumentalBlobPath
      ) {
        try {
          const container = process.env.AZURE_CONTAINER_DOCUMENTS || 'documents';
          const blobPath =
            data.autenticacaoAtendimento.biometria.digitalDocumentalBlobPath;

          const imageBuffer = await this.blobService.download(
            container,
            blobPath,
          );
          if (imageBuffer && imageBuffer.length > 0) {
            data.autenticacaoAtendimento.biometria.imageBase64 =
              'data:image/png;base64,' + imageBuffer.toString('base64');
          }
        } catch (imgError) {
          console.warn(
            `[ASO_WORKER] Falha ao baixar imagem biometrica: ${imgError.message}`,
          );
        }
      }

      const relatorioEvidenciasUrl = resolveRelatorioEvidenciasUrl(
        data.atendimento.prontuarioId,
        data.autenticacaoAtendimento.evidencias?.relatorioEvidenciasUrl,
      );
      data.autenticacaoAtendimento.evidencias = {
        ...(data.autenticacaoAtendimento.evidencias || {}),
        relatorioEvidenciasUrl,
      };

      // 1. Gera o PDF do ASO
      const asoDocDefinition = await gerarTemplateAsoWorker(data);
      const asoPdfDoc = pdfMake.createPdf(asoDocDefinition);

      const asoBuffer = await new Promise<Buffer>((resolve, reject) => {
        asoPdfDoc.getBuffer((buffer) =>
          buffer
            ? resolve(Buffer.from(buffer))
            : reject('Erro ao gerar buffer PDF do ASO'),
        );
      });

      // Gera relatório de atendimento e mescla ao ASO (fallback gracioso)
      let finalBuffer = asoBuffer;
      try {
        const reportDef = await gerarTemplateRelatorioAtendimento(data);
        const reportPdf = pdfMake.createPdf(reportDef);
        const reportBuffer = await new Promise<Buffer>((resolve, reject) => {
          reportPdf.getBuffer((buf) =>
            buf
              ? resolve(Buffer.from(buf))
              : reject('Erro ao gerar buffer PDF do relatório'),
          );
        });

        const { PDFDocument } = await import('pdf-lib');
        const asoDoc = await PDFDocument.load(asoBuffer);
        const reportDoc = await PDFDocument.load(reportBuffer);
        const copiedPages = await asoDoc.copyPages(reportDoc, reportDoc.getPageIndices());
        copiedPages.forEach((page) => asoDoc.addPage(page));
        finalBuffer = Buffer.from(await asoDoc.save());
        console.log('[ASO_WORKER] Relatório de atendimento mesclado ao ASO com sucesso.');
      } catch (reportErr) {
        console.warn(`[ASO_WORKER] Falha ao gerar/mesclar relatório: ${reportErr.message}. Continuando apenas com ASO.`);
      }

      const documentHash = crypto
        .createHash('sha256')
        .update(finalBuffer)
        .digest('hex');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const fileName = standardizeFileName(
        'ASO',
        data.funcionario.nome,
        data.atendimento.tipoExameNome || 'EXAME',
        `${day}-${month}-${year}`,
      );

      const blobPath = `aso/${year}/${month}/${data.empresa.codigo}/${data.funcionario.codigo}/${fileName}`;
      const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';

      const url = await this.blobService.uploadPublic(publicContainer, blobPath, finalBuffer);

      return {
        url,
        blobPath,
        documentHash,
        filename: fileName,
      };
    } catch (error) {
      console.error('Erro ao gerar ASO via Worker:', error);
      throw new InternalServerErrorException(`Erro ao gerar ASO: ${error.message}`);
    }
  }
}
