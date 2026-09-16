import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as fs from 'fs';
import * as path from 'path';
import { getExamesList, getExameByCodigo } from 'src/exames/exames.provider';
import { HtmlPdfService } from './html-pdf.service';

import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

@Injectable()
export class PdfmakeService {
  private readonly logger = new Logger(PdfmakeService.name);
  private readonly imageCache = new Map<string, string>();

  constructor(private readonly htmlPdfService: HtmlPdfService) {}
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

  async createPdfFromHtml(
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

      const examInAgendamento = data?.EXAMES?.find(
        (e: any) => String(e.grupo || '').trim().toLowerCase() === String(grupo || '').trim().toLowerCase()
      );
      
      let exameEntry = exameGrupo[0];
      
      if (examInAgendamento?.codigoExame) {
        const exameByCodigo = getExameByCodigo(examInAgendamento.codigoExame);
        if (exameByCodigo) {
          exameEntry = exameByCodigo as any;
        }
      }

      const normalizedProfissional = this.normalizeProfissional(
        data,
        profissional,
        grupo,
      );

      const form = data?.EXAMES?.find(
        (e: any) => e.grupo === 'Exame Clínico',
      )?.formulario || {};

      const idade = data?.DATANASCIMENTO
        ? Math.floor(
            (Date.now() -
              new Date(data.DATANASCIMENTO.split('/').reverse().join('-')).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : 'N/D';

      const logoLocalPath = path.resolve(
        process.cwd(),
        'src',
        'assets',
        'images',
        'logo.png',
      );
      const logoEmpresa = fs.existsSync(logoLocalPath)
        ? `data:image/png;base64,${fs.readFileSync(logoLocalPath).toString('base64')}`
        : '';

      const iconeLocalPath = path.resolve(
        process.cwd(),
        'src',
        'assets',
        'images',
        'icone.png',
      );
      const watermarkBase64 = fs.existsSync(iconeLocalPath)
        ? `data:image/png;base64,${fs.readFileSync(iconeLocalPath).toString('base64')}`
        : '';

      const templateData = {
        ...data,
        logoEmpresa,
        watermarkBase64,
        idade,
        dataExame: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
        isAdmissional: data?.TIPOEXAME === '1' || data?.TIPOEXAME === 1,
        conclusao: (form.conclusao || 'Pendente').toUpperCase(),
        conclusaoClass: (form.conclusao || '').toLowerCase() === 'inapto' ? 'inapto' : 'apto',
        form: {
          doencasFamiliares: form.doencasFamiliares?.join(', ') || 'N/D',
          doencasPessoais: form.doencasPessoais?.join(', ') || 'N/D',
          observacoesDoencasPessoais: form.observacoesDoencasPessoais || 'N/D',
          afastamento: form.afastamento || 'N/D',
          tabagismo: form.tabagismo || 'N/D',
          etilismo: form.etilismo || 'N/D',
          atividadeFisica: form.atividadeFisica || 'N/D',
          acimaPeso: form.acimaPeso || 'N/D',
          trabalhoAltura: form.trabalhoAltura || 'N/D',
          trabalhoEspacoConfinado: form.trabalhoEspacoConfinado || 'N/D',
          cabecaPescoco: form.cabecaPescoco || 'N/D',
          torax: form.torax || 'N/D',
          abdome: form.abdome || 'N/D',
          coluna: form.coluna || 'N/D',
          membrosSuperiores: form.membrosSuperiores || 'N/D',
          membrosInferiores: form.membrosInferiores || 'N/D',
          peso: form.peso || 'N/D',
          altura: form.altura || 'N/D',
          imc: form.imc || 'N/D',
          resultadoImc: form.resultadoImc || 'N/D',
          observacoesMedicas: form.observacoesMedicas || '',
        },
        pressaoArterial: form.pressaoArterial?.map((r: any) => ({
          valor: r.valor || 'N/D',
          horario: r.horario ? `${r.horario}h` : 'N/D',
        })) || [{ valor: 'N/D', horario: 'N/D' }],
      };

      const templateName = this.mapGrupoToTemplate(exameEntry.nome);
      
      return await this.htmlPdfService.generatePdf(templateName, templateData);
    } catch (err) {
      this.logger.error('Erro ao gerar PDF HTML:', err);
      throw new InternalServerErrorException(`Erro ao gerar PDF HTML: ${err}`);
    }
  }

  private mapGrupoToTemplate(nome: string): string {
    const map: Record<string, string> = {
      'Exame Clínico': 'exameClinico',
      'Audiometria': 'audiometria',
      'Restrição Temporária': 'restricao',
      'ASO Worker': 'asoWorker',
    };
    return map[nome] || 'exameClinico';
  }
}
