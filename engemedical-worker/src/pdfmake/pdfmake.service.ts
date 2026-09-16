import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as fs from 'fs';
import { getExamesList, getExameByCodigo } from 'src/exames/exames.provider';

import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

@Injectable()
export class PdfmakeService {
  private normalizeProfissional(
    data: any,
    profissional: any,
    grupo: any,
  ): Record<string, any> {
    if (profissional && typeof profissional === 'object') {
      return profissional;
    }

    const exames = Array.isArray(data?.EXAMES) ? data.EXAMES : [];
    const exameGrupo = exames.find(
      (exam: any) =>
        String(exam?.grupo || '').trim() === String(grupo || '').trim(),
    );

    const codigoFallback =
      data?.ASOINFO?.codigoProfissional ||
      data?.MEDICO?.codigo ||
      exameGrupo?.codigoProfissional ||
      '';
    const nomeFallback =
      data?.ASOINFO?.professional?.nome ||
      data?.MEDICO?.nome ||
      exameGrupo?.profissional ||
      'N/D';

    return {
      codigo: String(codigoFallback || '').trim(),
      nome: nomeFallback,
    };
  }

  async createPdf(
    data: any,
    profissional: any,
    grupo: any,
    assinaturaDigitalObrigatoria: boolean = false,
  ): Promise<Buffer> {
    try {
      const examList = getExamesList();
      const grupoKey = Object.keys(examList).find(
        (k) => k.trim().toLowerCase() === (grupo || '').trim().toLowerCase(),
      );
      const exameGrupo = grupoKey ? examList[grupoKey] : undefined;
      if (!exameGrupo || exameGrupo.length === 0) {
        throw new Error(`Nenhum exame encontrado para o grupo: ${grupo}`);
      }

      // Procura o exame específico no agendamento para usar seu código correspondente
      const examInAgendamento = data?.EXAMES?.find(
        (e: any) => String(e.grupo || '').trim().toLowerCase() === String(grupo || '').trim().toLowerCase()
      );
      
      let templateFn: Function | undefined;
      let exameEntry = exameGrupo[0];
      
      if (examInAgendamento?.codigoExame) {
        const exameByCodigo = getExameByCodigo(examInAgendamento.codigoExame);
        if (exameByCodigo?.template) {
          templateFn = exameByCodigo.template;
          exameEntry = exameByCodigo as any;
        }
      }

      if (!templateFn) {
        templateFn = exameEntry.template;
      }

      if (!templateFn) {
        throw new Error(
          `Template nao definido para o exame: ${exameEntry.nome}`,
        );
      }

      const normalizedProfissional = this.normalizeProfissional(
        data,
        profissional,
        grupo,
      );

      const docDefinition = await templateFn(
        data,
        normalizedProfissional,
        assinaturaDigitalObrigatoria,
      );
      const pdfDoc = pdfMake.createPdf(docDefinition);

      const fileName = `${exameEntry.nome}.pdf`;
      const dir = './temp_pdfs';
      const filePath = `${dir}/${fileName}`;

      if (!fs.existsSync(dir)) fs.mkdirSync(dir);

      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        pdfDoc.getBuffer((buffer) =>
          buffer
            ? resolve(Buffer.from(buffer))
            : reject('Erro ao gerar buffer PDF'),
        );
      });

      void filePath;
      return pdfBuffer;
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      throw new InternalServerErrorException(`Erro ao gerar PDF: ${err}`);
    }
  }
}