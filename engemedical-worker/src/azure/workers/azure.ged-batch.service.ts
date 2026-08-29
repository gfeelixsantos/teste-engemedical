import { Injectable } from '@nestjs/common';
import { DequeuedMessageItem } from '@azure/storage-queue';
import { AzureBaseWorker } from '../azure-worker';
import { MongoService } from '../../mongo/mongo.service';
import { AzureBlobService } from '../AzureBlob.service';
import { GedBatchQueueMessage, GedBatchResult } from '../types/ged-batch.types';
import { SchedulingDocument } from '../../mongo/types/scheduling';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver') as typeof import('archiver');
import * as stream from 'stream';
import { resolveBackendBaseUrl } from '../../core/runtime-mode';

@Injectable()
export class AzureGedBatchWorkerService extends AzureBaseWorker {
  protected queueName = process.env.AZURE_QUEUE_GED_BATCH || 'ged-batch';
  protected readonly MAX_CONCURRENT_MESSAGES = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_GED_BATCH_MAX_CONCURRENT_MESSAGES || 1),
  );
  protected readonly RECEIVE_BATCH_SIZE = Math.max(
    1,
    Number(process.env.AZURE_QUEUE_GED_BATCH_RECEIVE_BATCH_SIZE || 1),
  );
  protected readonly DELAY_BETWEEN_MESSAGES = 1000;
  private readonly containerName =
    process.env.AZURE_CONTAINER_DOCUMENTS ||
    process.env.AZURE_STORAGE_CONTAINER ||
    'documents';

  constructor(
    private readonly mongoService: MongoService,
    private readonly azureBlob: AzureBlobService,
  ) {
    super();
  }

  isWorkerEnabled(): boolean {
    return false;
  }

  private normalizeSegment(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .trim() || 'empresa';
  }

  protected async handleMessage(message: DequeuedMessageItem): Promise<void> {
    const payload = JSON.parse(message.messageText) as GedBatchQueueMessage;
    this.logger.log(
      `[${this.queueName}] Processando batch jobId=${payload.jobId} | ${payload.prontuarios.length} prontuarios | empresa=${payload.empresaNome}`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new stream.PassThrough();
    archive.pipe(passThrough);

    const bufferParts: Buffer[] = [];
    passThrough.on('data', (chunk: Buffer) => bufferParts.push(chunk));

    const zipDone = new Promise<void>((resolve, reject) => {
      passThrough.on('end', () => resolve());
      passThrough.on('error', (err) => reject(err));
    });

    let succeededCount = 0;
    let failedCount = 0;

    for (const prontuario of payload.prontuarios) {
      try {
        this.logger.log(
          `Processando prontuario ${prontuario.codigoProntuario} (${prontuario.nome})`,
        );

        const filter: Record<string, unknown> = {
          CODIGOPRONTUARIO: prontuario.codigoProntuario,
        };

        if (payload.periodo?.ano && payload.periodo?.mes) {
          const year = parseInt(payload.periodo.ano, 10);
          const month = parseInt(payload.periodo.mes, 10) - 1;
          const start = new Date(year, month, 1);
          const end = new Date(year, month + 1, 1);
          filter.DATAAGENDAMENTO_DATE = { $gte: start, $lt: end };
        }

        const docs = (await this.mongoService.schedulingsCollection
          .find(filter)
          .sort({ DATAAGENDAMENTO_DATE: -1, _id: -1 })
          .toArray()) as unknown as SchedulingDocument[];

        this.logger.log(
          `Prontuario ${prontuario.codigoProntuario} (${prontuario.nome}): ${docs.length} documento(s) encontrado(s) no periodo`,
        );

        if (!docs.length) {
          this.logger.warn(
            `Prontuario ${prontuario.codigoProntuario} nao encontrado. Pulando.`,
          );
          await this.sendCallback({
            jobId: payload.jobId,
            itemCodigoProntuario: prontuario.codigoProntuario,
            status: 'failed',
            error: 'Documento nao encontrado',
          });
          failedCount++;
          continue;
        }

        const isAsoBatch = payload.tipo === 'aso';
        const pdfBuffer = isAsoBatch
          ? await this.buildAsoPdf(docs)
          : await this.buildProntuarioPdf(docs);

        if (!pdfBuffer) {
          const errorMsg = isAsoBatch
            ? 'Nenhum ASO com URL encontrado'
            : 'Nenhum exame com URL encontrado';
          this.logger.warn(
            `Nenhum PDF gerado para prontuario ${prontuario.codigoProntuario}. Pulando.`,
          );
          await this.sendCallback({
            jobId: payload.jobId,
            itemCodigoProntuario: prontuario.codigoProntuario,
            status: 'failed',
            error: errorMsg,
          });
          failedCount++;
          continue;
        }

        archive.append(pdfBuffer, {
          name: isAsoBatch
            ? this.buildAsoFileName(docs[0])
            : this.buildProntuarioFileName(docs[0]),
        });

        await this.sendCallback({
          jobId: payload.jobId,
          itemCodigoProntuario: prontuario.codigoProntuario,
          status: 'completed',
        });
        succeededCount++;
        this.logger.log(`Prontuario ${prontuario.codigoProntuario} processado com sucesso`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Erro no prontuario ${prontuario.codigoProntuario}: ${errorMsg}`);
        await this.sendCallback({
          jobId: payload.jobId,
          itemCodigoProntuario: prontuario.codigoProntuario,
          status: 'failed',
          error: errorMsg,
        });
        failedCount++;
      }
    }

    try {
      await archive.finalize();
      await zipDone;
      const zipBuffer = Buffer.concat(bufferParts as unknown as Uint8Array[]);
      if (succeededCount === 0) {
        await this.sendCallback({
          jobId: payload.jobId,
          status: 'failed',
          error:
            'Nenhum prontuario foi gerado para o lote. Verifique se os PDFs dos exames existem e se o worker consegue acessar o Blob.',
          finishedAt: new Date().toISOString(),
        });

        this.logger.warn(
          `[${this.queueName}] Lote ${payload.jobId} finalizado sem PDF consolidado.`,
        );
        return;
      }

      this.logger.log(
        `Batch ${payload.jobId}: consolidado ${succeededCount} sucesso / ${failedCount} falha / ${payload.prontuarios.length} total prontuarios. Iniciando upload ZIP...`,
      );

      const periodLabel =
        payload.periodo?.ano && payload.periodo?.mes
          ? `${payload.periodo.ano}_${payload.periodo.mes}`
          : 'completo';
      const blobName = `ged-batch/${payload.jobId}/${this.normalizeSegment(payload.empresaNome)}_${periodLabel}.zip`;
      const url = await this.azureBlob.upload(
        this.containerName,
        blobName,
        zipBuffer,
        {
          jobId: payload.jobId,
          empresaCodigo: payload.empresaCodigo,
          empresaNome: payload.empresaNome,
          periodoAno: payload.periodo?.ano || '',
          periodoMes: payload.periodo?.mes || '',
        },
        'application/zip',
      );

      const finalStatus: GedBatchResult['status'] =
        failedCount === 0
          ? 'completed'
          : succeededCount === 0
            ? 'failed'
            : 'partial';

      await this.sendCallback({
        jobId: payload.jobId,
        status: finalStatus,
        blobName,
        blobUrl: url,
        finishedAt: new Date().toISOString(),
      });

      this.logger.log(`[${this.queueName}] Zip upload completo: ${url} (${zipBuffer.length} bytes)`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[${this.queueName}] Falha ao finalizar zip do job ${payload.jobId}: ${errorMsg}`,
      );
      await this.sendCallback({
        jobId: payload.jobId,
        status: failedCount === 0 && succeededCount === 0 ? 'failed' : 'partial',
        error: errorMsg,
        finishedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Coleta buffers de exames e anexos PDF de múltiplos documentos e faz merge.
   * Lógica alinhada com collectExamBuffers + mergePdfs do backend (util.ts).
   */
  private async buildProntuarioPdf(
    docs: SchedulingDocument[],
  ): Promise<Buffer | null> {
    const codigoProntuario = docs[0]?.CODIGOPRONTUARIO || 'unknown';
    const nomeProntuario = docs[0]?.NOME || 'unknown';
    const buffers: Buffer[] = [];

    const totalExames = docs.reduce(
      (sum, doc) => sum + (doc.EXAMES?.length || 0), 0,
    );
    const examesComUrl = docs.reduce(
      (sum, doc) => sum + (doc.EXAMES?.filter((e) => e.url?.trim()).length || 0), 0,
    );
    const anexosPdf = docs.reduce(
      (sum, doc) => sum + (doc.ANEXOS?.filter((a) => a.StoragePath?.toLowerCase().endsWith('.pdf')).length || 0), 0,
    );
    const asosComUrl = docs.reduce(
      (sum, doc) => sum + (doc.ASOINFO?.url?.trim() ? 1 : 0), 0,
    );
    this.logger.log(
      `buildProntuarioPdf [${codigoProntuario}] ${nomeProntuario}: ${docs.length} doc(s), ` +
      `${totalExames} exame(s) (${examesComUrl} com URL), ${anexosPdf} anexo(s) PDF, ${asosComUrl} ASO(s) com URL`,
    );

    for (const doc of docs) {
      // 1) PDFs dos resultados de exames (equivalente a collectExamBuffers — exames)
      for (const exame of (doc.EXAMES || [])) {
        if (exame.url && exame.url.trim() !== '') {
          try {
            buffers.push(await this.downloadPdfBuffer(exame.url));
          } catch (err) {
            this.logger.warn(
              `Falha ao baixar exame ${exame.url}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      // 2) Anexos PDF (equivalente a collectExamBuffers — attachments, filtrado por .pdf)
      for (const anexo of (doc.ANEXOS || [])) {
        if (
          anexo.StoragePath &&
          anexo.StoragePath.toLowerCase().endsWith('.pdf')
        ) {
          try {
            buffers.push(await this.downloadPdfBuffer(anexo.StoragePath));
          } catch (err) {
            this.logger.warn(
              `Falha ao baixar anexo ${anexo.StoragePath}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      // 3) ASO PDF
      if (doc.ASOINFO?.url?.trim()) {
        try {
          buffers.push(await this.downloadPdfBuffer(doc.ASOINFO.url));
        } catch (err) {
          this.logger.warn(
            `Falha ao baixar ASO ${doc.ASOINFO.url}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    this.logger.log(
      `buildProntuarioPdf [${codigoProntuario}]: ${buffers.length} PDF(s) baixados, mergeando...`,
    );

    if (buffers.length === 0) return null;

    // Merge (equivalente a mergePdfs do backend)
    const mergedPdf = await PDFDocument.create();
    let pageCount = 0;

    let mergeIndex = 0;
    for (const buf of buffers) {
      try {
        const pdf = await PDFDocument.load(buf);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => {
          mergedPdf.addPage(page);
          pageCount++;
        });
      } catch (err) {
        this.logger.warn(
          `Erro ao mergear PDF #${mergeIndex} (${buf.length} bytes) do prontuario ${codigoProntuario}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      mergeIndex++;
    }

    if (pageCount === 0) {
      this.logger.warn(
        `buildProntuarioPdf [${codigoProntuario}]: ${buffers.length} buffer(s) carregados mas 0 paginas validas apos merge`,
      );
      return null;
    }

    return Buffer.from(await mergedPdf.save());
  }

  /**
   * Constrói o nome do arquivo PDF do prontuário.
   * Alinhado com formatDocumentFileName do backend (util.ts).
   */
  private buildProntuarioFileName(doc: SchedulingDocument): string {
    const nome = this.normalizeDocName(
      doc.NOME || doc.CODIGOPRONTUARIO || 'FUNCIONARIO',
    );
    const tipo = this.normalizeDocName(doc.TIPOEXAMENOME || 'ASO');
    const data = String(doc.DATAAGENDAMENTO || '').replace(/\//g, '-');
    return this.toPdfFileName(`PRONTUARIO - ${nome} - ${tipo}_${data}`);
  }

  /**
   * Constrói o nome do arquivo ASO PDF.
   */
  private buildAsoFileName(doc: SchedulingDocument): string {
    const nome = this.normalizeDocName(
      doc.NOME || doc.CODIGOPRONTUARIO || 'FUNCIONARIO',
    );
    const data = String(doc.DATAAGENDAMENTO || '').replace(/\//g, '-');
    return this.toPdfFileName(`ASO - ${nome}_${data}`);
  }

  /**
   * Baixa apenas o ASO PDF do primeiro documento que tiver ASOINFO.url.
   * Diferente de buildProntuarioPdf, nao faz merge — retorna o PDF original.
   */
  private async buildAsoPdf(
    docs: SchedulingDocument[],
  ): Promise<Buffer | null> {
    for (const doc of docs) {
      if (doc.ASOINFO?.url?.trim()) {
        try {
          return await this.downloadPdfBuffer(doc.ASOINFO.url);
        } catch (err) {
          this.logger.warn(
            `Falha ao baixar ASO ${doc.ASOINFO.url}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    this.logger.warn(
      `buildAsoPdf [${docs[0]?.CODIGOPRONTUARIO || 'unknown'}]: Nenhum ASO com URL encontrado`,
    );
    return null;
  }

  /**
   * Normaliza segmento de nome: remove acentos, mantém espaços/hifens, UPPERCASE.
   * Equivalente a standardizeDocumentName do backend (util.ts).
   */
  private normalizeDocName(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.\- ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  /**
   * Converte baseName em nome de arquivo .pdf seguro.
   * Equivalente ao buildPdfFileName do backend (soc.service.ts).
   */
  private toPdfFileName(baseName: string): string {
    return (
      String(baseName || 'ARQUIVO')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._\- ]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/, '')
        .replace(/\.PDF$/i, '') + '.pdf'
    );
  }

  private extractBlobPath(url: string): string {
    const baseUrl =
      process.env.AZURE_BLOB_BASE_URL ||
      'https://cmsodocuments.blob.core.windows.net';
    const container = this.containerName;

    let path = url;
    if (path.startsWith('http')) {
      const parsed = new URL(path);
      path = parsed.pathname.replace(new RegExp(`^/${container}/`), '');
    }
    return decodeURIComponent(path);
  }

  private async downloadPdfBuffer(url: string): Promise<Buffer> {
    const blobPath = this.extractBlobPath(url);

    try {
      return await this.azureBlob.download(this.containerName, blobPath);
    } catch (err) {
      this.logger.warn(
        `Download via SDK falhou para ${blobPath}, tentando via SAS: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      const signedUrl = this.azureBlob.generateSasUrl(
        this.containerName,
        url,
        15,
      );
      const response = await axios.get(signedUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch (err) {
      const is404 = axios.isAxiosError(err) && err.response?.status === 404;
      const msg = is404
        ? `Arquivo não encontrado no Storage (404): ${blobPath}`
        : `Download via SAS falhou para ${blobPath}: ${err instanceof Error ? err.message : String(err)}`;
      this.logger.warn(msg);
      throw new Error(msg);
    }
  }

  private async sendCallback(payload: GedBatchResult): Promise<void> {
    try {
      const baseUrl = resolveBackendBaseUrl();
      const token = String(process.env.INTERNAL_WORKER_TOKEN || '').trim();

      if (!baseUrl || !token) {
        throw new Error(
          `BACKEND_INTERNAL_BASE_URL/INTERNAL_WORKER_TOKEN nao configurados para callback do job ${payload.jobId}`,
        );
      }

      const callbackDesc = `${payload.jobId}${payload.itemCodigoProntuario ? `/${payload.itemCodigoProntuario}` : ''}`;
      this.logger.log(
        `Enviando callback: ${callbackDesc}, status=${payload.status}, blobUrl=${(payload as any).blobUrl || 'none'}`,
      );

      await axios.post(
        `${baseUrl}/schedulings/ged/batch/callback`,
        payload,
        {
          headers: {
            'x-internal-token': token,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      this.logger.log(
        `Callback enviado com sucesso: ${callbackDesc} = ${payload.status}`,
      );
    } catch (err) {
      this.logger.error(
        `Falha ao enviar callback para ${payload.jobId}${payload.itemCodigoProntuario ? `/${payload.itemCodigoProntuario}` : ''}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
