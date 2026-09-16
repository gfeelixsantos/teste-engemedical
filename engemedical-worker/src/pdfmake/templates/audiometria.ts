import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import * as fs from 'fs';
import * as path from 'path';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { generateAudiogramSVG } from '../AudiometriaGraphics';
import { buildPdfFooter } from '../pdfFooterHelper';


export interface AudiometriaData {
  tipoAudiometro: string;
  dataCalibracao: string;
  repousoAuditivo: string;
  horasRepouso: number;
  queixaAuditiva: string;
  audiometriaAnterior: string;
  infeccaoCirurgiaOuvido: string;
  tratamentoOtotoxicos: string;
  dataTratamentoOtotoxicos: string;
  surdezFamilia: string;
  parentescoSurdez: string;
  trabalhoAnteriorRuido: string;
  trabalhoAtualRuido: string;
  usoProtetorAuricular: string;
  contatoQuimicos: string;
  habitoSomAlto: string;
  exposicaoExplosoes: string;
  traumaCabecaOuvido: string;
  labirintiteTontura: string;
  usoMedicamentos: string;
  quaisMedicamentos: string;
  meatoscopiaOD: string;
  meatoscopiaOE: string;
  observacoesMeatoscopia: string;
  orientacaoPlugSilicone: string;

  viaAereaOD250: string;
  viaAereaOD500: string;
  viaAereaOD1000: string;
  viaAereaOD2000: string;
  viaAereaOD3000: string;
  viaAereaOD4000: string;
  viaAereaOD6000: string;
  viaAereaOD8000: string;
  viaAereaOE250: string;
  viaAereaOE500: string;
  viaAereaOE1000: string;
  viaAereaOE2000: string;
  viaAereaOE3000: string;
  viaAereaOE4000: string;
  viaAereaOE6000: string;
  viaAereaOE8000: string;

  viaOsseaOD500: string;
  viaOsseaOD1000: string;
  viaOsseaOD2000: string;
  viaOsseaOD3000: string;
  viaOsseaOD4000: string;
  viaOsseaOE500: string;
  viaOsseaOE1000: string;
  viaOsseaOE2000: string;
  viaOsseaOE3000: string;
  viaOsseaOE4000: string;

  mascaramentoVAOD250: boolean;
  mascaramentoVAOD500: boolean;
  mascaramentoVAOD1000: boolean;
  mascaramentoVAOD2000: boolean;
  mascaramentoVAOD3000: boolean;
  mascaramentoVAOD4000: boolean;
  mascaramentoVAOD6000: boolean;
  mascaramentoVAOD8000: boolean;
  mascaramentoVAOE250: boolean;
  mascaramentoVAOE500: boolean;
  mascaramentoVAOE1000: boolean;
  mascaramentoVAOE2000: boolean;
  mascaramentoVAOE3000: boolean;
  mascaramentoVAOE4000: boolean;
  mascaramentoVAOE6000: boolean;
  mascaramentoVAOE8000: boolean;

  mascaramentoVOOD500: boolean;
  mascaramentoVOOD1000: boolean;
  mascaramentoVOOD2000: boolean;
  mascaramentoVOOD3000: boolean;
  mascaramentoVOOD4000: boolean;
  mascaramentoVOOE500: boolean;
  mascaramentoVOOE1000: boolean;
  mascaramentoVOOE2000: boolean;
  mascaramentoVOOE3000: boolean;
  mascaramentoVOOE4000: boolean;

  realizarIRF: boolean;
  srtOD: string;
  srtOE: string;
  irfOD: string;
  irfOE: string;
  irfDBOD: string;
  irfDBOE: string;

  resultadoSRTOD: string;
  resultadoSRTOE: string;
  resultadoIRFOD: string;
  resultadoIRFOE: string;
  resultadoIRFMonoauralOD: string;
  resultadoIRFMonoauralOE: string;
  resultadoIRFDissimetrica: string;

  entalhe4000HzOD: boolean;
  entalhe4000HzOE: boolean;
  tipoPerdaOD: string;
  tipoPerdaOE: string;
  audiometriaReferenciaDisponivel: boolean;
  limiaresRAOD: { [key: number]: number };
  limiaresRAOE: { [key: number]: number };
  classificacaoNR7OD: string;
  classificacaoNR7OE: string;

  classificacaoOD: string;
  classificacaoOE: string;
  classificacaoGeral: string;
  configuracaoOD: string;
  configuracaoOE: string;

  conclusao: string;
  observacoes: string;
  perdaAuditivaOD: string;
  perdaAuditivaOE: string;
  resultadoOD: string;
  resultadoOE: string;
  frequenciasAlteradasOD: string;
  frequenciasAlteradasOE: string;
  criterioPCD: string;
  mediaTonalOD: number;
  mediaTonalOE: number;
}

function recalcularParaLaudo(form: AudiometriaData): AudiometriaData {
  if (!form) return form;

  const parseValor = (v: string | null | undefined | number): number | null => {
    if (v === null || v === undefined || v === '' || v === '-' || v === '--' || v === '---') {
      return null;
    }
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  const calcularMediaTonal = (freqs: string[]): number | null => {
    const valores = freqs
      .map((v) => parseValor(v))
      .filter((v): v is number => v !== null);
    if (valores.length === 0) return null;
    return Math.round(valores.reduce((acc, v) => acc + v, 0) / valores.length);
  };

  const classificarPerda = (limiares: { [key: number]: string }): string => {
    const freqCriticas = [500, 1000, 2000, 4000];
    for (const f of freqCriticas) {
      if (parseValor(limiares[f]) === null) return 'Perda Auditiva Profunda';
    }
    const media = calcularMediaTonal(freqCriticas.map((f) => limiares[f]));
    if (media === null) return 'Perda Auditiva Profunda';
    if (media >= 91) return 'Perda Auditiva Profunda';
    if (media >= 71) return 'Perda Auditiva Severa';
    if (media >= 56) return 'Perda Auditiva Moderada Severa';
    if (media >= 41) return 'Perda Auditiva Moderada';
    if (media >= 26) return 'Perda Auditiva Leve';

    const temAlteracao = Object.keys(limiares).map(Number).some(f => {
      const v = parseValor(limiares[f]);
      return v !== null && v > 25;
    });

    if (temAlteracao) {
      return 'Perda em Altas Frequências';
    }

    return 'Normal';
  };

  const possuiAlteracaoFrequencias = (limiares: { [key: number]: string }): boolean => {
    return Object.keys(limiares).map(Number).some(f => {
      const v = parseValor(limiares[f]);
      return v !== null && v > 25;
    });
  };

  const possuiGapAereoOsseo = (va: { [key: number]: string }, vo: { [key: number]: string }): boolean => {
    return [500, 1000, 2000, 3000, 4000].some(f => {
      const v_a = parseValor(va[f]);
      const v_o = parseValor(vo[f]);
      return v_a !== null && v_o !== null && (v_a - v_o >= 15);
    });
  };

  const determinarTipoPerda = (
    va: { [key: number]: string },
    vo: { [key: number]: string },
    mediaVA: number | null,
    mediaVO: number | null,
    possuiAlteracao: boolean,
  ): string => {
    if (mediaVA === null) return 'Neurossensorial';
    if (mediaVA <= 25) {
      return possuiAlteracao ? 'Neurossensorial' : '-';
    }
    if (mediaVO === null) return 'Neurossensorial';
    const hasGap = possuiGapAereoOsseo(va, vo);
    const voAlterada = [500, 1000, 2000, 3000, 4000].some(f => {
      const v = parseValor(vo[f]);
      return v !== null && v > 25;
    });
    if (!voAlterada && hasGap) return 'Condutiva';
    if (voAlterada && hasGap) return 'Mista';
    return 'Neurossensorial';
  };

  const vaOD = {
    250: form.viaAereaOD250,
    500: form.viaAereaOD500,
    1000: form.viaAereaOD1000,
    2000: form.viaAereaOD2000,
    3000: form.viaAereaOD3000,
    4000: form.viaAereaOD4000,
    6000: form.viaAereaOD6000,
    8000: form.viaAereaOD8000,
  };

  const vaOE = {
    250: form.viaAereaOE250,
    500: form.viaAereaOE500,
    1000: form.viaAereaOE1000,
    2000: form.viaAereaOE2000,
    3000: form.viaAereaOE3000,
    4000: form.viaAereaOE4000,
    6000: form.viaAereaOE6000,
    8000: form.viaAereaOE8000,
  };

  const voOD = {
    500: form.viaOsseaOD500,
    1000: form.viaOsseaOD1000,
    2000: form.viaOsseaOD2000,
    3000: form.viaOsseaOD3000,
    4000: form.viaOsseaOD4000,
  };

  const voOE = {
    500: form.viaOsseaOE500,
    1000: form.viaOsseaOE1000,
    2000: form.viaOsseaOE2000,
    3000: form.viaOsseaOE3000,
    4000: form.viaOsseaOE4000,
  };

  const mediaOD = calcularMediaTonal([form.viaAereaOD500, form.viaAereaOD1000, form.viaAereaOD2000, form.viaAereaOD4000]);
  const mediaOE = calcularMediaTonal([form.viaAereaOE500, form.viaAereaOE1000, form.viaAereaOE2000, form.viaAereaOE4000]);

  const mediaVoOD = calcularMediaTonal([form.viaOsseaOD500, form.viaOsseaOD1000, form.viaOsseaOD2000, form.viaOsseaOD4000]);
  const mediaVoOE = calcularMediaTonal([form.viaOsseaOE500, form.viaOsseaOE1000, form.viaOsseaOE2000, form.viaOsseaOE4000]);

  const classifOD = classificarPerda(vaOD);
  const classifOE = classificarPerda(vaOE);

  const alteracOD = possuiAlteracaoFrequencias(vaOD);
  const alteracOE = possuiAlteracaoFrequencias(vaOE);

  const tipoOD = determinarTipoPerda(vaOD, voOD, mediaOD, mediaVoOD, alteracOD);
  const tipoOE = determinarTipoPerda(vaOE, voOE, mediaOE, mediaVoOE, alteracOE);

  const verificarEntalhe4000 = (v2k: any, v4k: any, v8k: any): boolean => {
    const p2k = parseValor(v2k);
    const p4k = parseValor(v4k);
    const p8k = parseValor(v8k);
    if (p2k === null || p4k === null || p8k === null) return false;
    return p4k > 25 && p4k >= p2k + 10 && p4k >= p8k + 10;
  };

  const entalheOD = verificarEntalhe4000(form.viaAereaOD2000, form.viaAereaOD4000, form.viaAereaOD8000);
  const entalheOE = verificarEntalhe4000(form.viaAereaOE2000, form.viaAereaOE4000, form.viaAereaOE8000);

  return {
    ...form,
    mediaTonalOD: mediaOD ?? form.mediaTonalOD,
    mediaTonalOE: mediaOE ?? form.mediaTonalOE,
    perdaAuditivaOD: mediaOD !== null ? `${mediaOD} dB` : form.perdaAuditivaOD,
    perdaAuditivaOE: mediaOE !== null ? `${mediaOE} dB` : form.perdaAuditivaOE,
    classificacaoOD: classifOD,
    classificacaoOE: classifOE,
    tipoPerdaOD: tipoOD,
    tipoPerdaOE: tipoOE,
    entalhe4000HzOD: entalheOD,
    entalhe4000HzOE: entalheOE,
  };
}

// ═══════════════════════════════════════════════════════════════
// CORES PREMIUM CORPORATE HEALTH
// ═══════════════════════════════════════════════════════════════
const C = {
  verdeEscuro: '#1B5E20',
  verde: '#2E7D32',
  verdeClaro: '#4CAF50',
  ciano: '#0097A7',
  azulEscuro: '#0D47A1',
  preto: '#1A1A1A',
  texto: '#212121',
  muted: '#757575',
  borda: '#E0E0E0',
  fundo: '#F5F5F5',
  branco: '#FFFFFF',
  apto: '#2E7D32',
  inapto: '#C62828',
  COR_OD: '#B71C1C',
  COR_OE: '#0D47A1',
};

export async function gerarDocAudiometria(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const {
    NOMEEMPRESA,
    CNPJEMPRESA,
    NOME,
    CPFFUNCIONARIO,
    DATANASCIMENTO,
    NOMESETOR,
    NOMECARGO,
    EXAMES,
    TIPOEXAMENOME,
    UNIDADEATENDIMENTO,
    CODIGOPRONTUARIO,
  } = asoData;

  const { codigo } = profissional;

  const audiometria = EXAMES?.find((e: any) => e.grupo === 'Audiometria');

  const rawForm: AudiometriaData =
    audiometria?.formulario || ({} as AudiometriaData);

  const form = recalcularParaLaudo(rawForm);

  const idade = DATANASCIMENTO
    ? Math.floor(
        (Date.now() -
          new Date(DATANASCIMENTO.split('/').reverse().join('-')).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : 'N/D';

  // ═══ LOGOS LOCAIS ═══
  const logoLocalPath = path.resolve(
    process.cwd(),
    'src',
    'assets',
    'images',
    'logo.png',
  );
  const logoEmpresa = fs.existsSync(logoLocalPath)
    ? `data:image/png;base64,${fs.readFileSync(logoLocalPath).toString('base64')}`
    : await getImageBase64('https://engemedical.com.br/images/logo.png');

  const iconeLocalPath = path.resolve(
    process.cwd(),
    'src',
    'assets',
    'images',
    'icone.png',
  );
  const watermarkBase64 = fs.existsSync(iconeLocalPath)
    ? `data:image/png;base64,${fs.readFileSync(iconeLocalPath).toString('base64')}`
    : await getImageBase64('https://engemedical.com.br/images/icone.png');

  let assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[codigo]);
  if (!assinaturaProfissional) {
    assinaturaProfissional = await getImageBase64(
      'https://engemedical.com.br/images/logo.png',
    );
  }

  const { od: odSVG, oe: oeSVG } = generateAudiogramSVG(form);

  const dadosTecnicosGrid: TableCell[][] = [
    [
      'Data Exame',
      new Date().toLocaleDateString('pt-BR') || 'N/D',
      'Hora Exame',
      new Date().toLocaleTimeString('pt-BR') || 'N/D',
      'Local Exame',
      UNIDADEATENDIMENTO || 'N/D',
    ],
    [
      'Tipo Audiômetro',
      form.tipoAudiometro || 'N/D',
      'Data Calibração',
      `${new Date(form?.dataCalibracao).toLocaleDateString('pt-BR') || 'N/D'}`,
      'Repouso Auditivo',
      `${form.repousoAuditivo || 'N/D'} (${form.horasRepouso || 'N/D'}h)`,
    ],
    [
      'Meatoscopia OD',
      form.meatoscopiaOD ? form.meatoscopiaOD.replace(/_/g, ' ') : 'N/D',
      'Meatoscopia OE',
      form.meatoscopiaOE ? form.meatoscopiaOD.replace(/_/g, ' ') : 'N/D',
      'Observações Meatoscopia',
      form.observacoesMeatoscopia || '-',
    ],
  ];

  const anamneseGrid: TableCell[][] = [
    [
      'Queixa Auditiva',
      form.queixaAuditiva || 'N/D',
      'Audiometria Anterior',
      form.audiometriaAnterior || 'N/D',
      'Infecção/Cirurgia Ouvido',
      form.infeccaoCirurgiaOuvido || 'N/D',
    ],
    [
      'Surdez na Família',
      form.surdezFamilia || 'N/D',
      'Parentesco Surdez',
      form.parentescoSurdez || 'N/D',
      'Trabalho Ant. c/ Ruído',
      form.trabalhoAnteriorRuido || 'N/D',
    ],
    [
      'Trabalho Atual c/ Ruído',
      form.trabalhoAtualRuido || 'N/D',
      'Uso de Prot. Auricular',
      form.usoProtetorAuricular || 'N/D',
      'Contato c/ Químicos',
      form.contatoQuimicos || 'N/D',
    ],
    [
      'Hábito de Som Alto',
      form.habitoSomAlto || 'N/D',
      'Exposição a Explosões',
      form.exposicaoExplosoes || 'N/D',
      'Trauma Cabeça/Ouvido',
      form.traumaCabecaOuvido || 'N/D',
    ],
    [
      'Labirintite/Tontura',
      form.labirintiteTontura || 'N/D',
      'Uso de Medicamentos',
      form.usoMedicamentos || 'N/D',
      'Quais Medicamentos',
      form.quaisMedicamentos || '-',
    ],
    [
      'Trat. Ototóxicos',
      form.tratamentoOtotoxicos || 'N/D',
      'Data Tratamento',
      form.dataTratamentoOtotoxicos || '-',
      '',
      '',
    ],
  ];

  const resultadosGrid = {
    headerRows: 1,
    widths: ['12%', '15%', '25%', '24%', '24%'],
    body: [
      [
        { text: 'Ouvido', style: 'tableHeader', alignment: 'center' },
        { text: 'Média Tonal (4F)', style: 'tableHeader', alignment: 'center' },
        { text: 'Grau da Perda', style: 'tableHeader', alignment: 'center' },
        { text: 'Configuração', style: 'tableHeader', alignment: 'center' },
        { text: 'Tipo de Perda', style: 'tableHeader', alignment: 'center' },
      ],
      [
        { text: 'Direito (OD)', color: C.COR_OD, alignment: 'center', bold: true },
        { text: form.perdaAuditivaOD || 'N/D', alignment: 'center', fontSize: 8 },
        { text: form.classificacaoOD || 'N/D', alignment: 'center', fontSize: 8 },
        { text: form.configuracaoOD || 'N/D', alignment: 'center', fontSize: 8 },
        { text: form.tipoPerdaOD || 'N/D', alignment: 'center', fontSize: 8 },
      ],
      [
        { text: 'Esquerdo (OE)', color: C.COR_OE, alignment: 'center', bold: true },
        { text: form.perdaAuditivaOE || 'N/D', alignment: 'center', fontSize: 8 },
        { text: form.classificacaoOE || 'N/D', alignment: 'center', fontSize: 8 },
        { text: form.configuracaoOE || 'N/D', alignment: 'center', fontSize: 8 },
        { text: form.tipoPerdaOE || 'N/D', alignment: 'center', fontSize: 8 },
      ],
    ],
  };

  const exibirIRF =
    form.realizarIRF &&
    (form.srtOD || form.srtOE || form.irfOD || form.irfOE || form.irfDBOD || form.irfDBOE || form.resultadoIRFMonoauralOD || form.resultadoIRFMonoauralOE || form.resultadoIRFDissimetrica);

  const irfGrid = exibirIRF
    ? {
        headerRows: 1,
        widths: ['*', '*', '*', '*', '*'],
        body: [
          [
            { text: 'Ouvido', style: 'tableHeader', alignment: 'center' },
            { text: 'SRT (dB)', style: 'tableHeader', alignment: 'center' },
            { text: 'IRF (%)', style: 'tableHeader', alignment: 'center' },
            { text: 'IRF D.B. (%)', style: 'tableHeader', alignment: 'center' },
            { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
          ],
          [
            { text: 'Direito (OD)', color: C.COR_OD, alignment: 'center', bold: true },
            { text: form.srtOD || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfOD || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfDBOD || '-', alignment: 'center', fontSize: 9 },
            { text: form.resultadoIRFMonoauralOD || '-', alignment: 'center', fontSize: 9 },
          ],
          [
            { text: 'Esquerdo (OE)', color: C.COR_OE, alignment: 'center', bold: true },
            { text: form.srtOE || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfOE || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfDBOE || '-', alignment: 'center', fontSize: 9 },
            { text: form.resultadoIRFMonoauralOE || '-', alignment: 'center', fontSize: 9 },
          ],
          [
            { text: `IRF Dissimétrica: ${form.resultadoIRFDissimetrica || ''}`, colSpan: 5, alignment: 'center', fontSize: 9 },
          ],
        ],
      }
    : null;

  const detalhesAdicionais: Content[] = [
    {
      columns: [
        {
          text: `Entalhe 4000Hz: OD: ${form.entalhe4000HzOD ? 'SIM' : 'NÃO'} | OE: ${form.entalhe4000HzOE ? 'SIM' : 'NÃO'}`,
          fontSize: 6,
          bold: true,
          alignment: 'right',
          color: C.texto,
        },
      ],
      margin: [0, 5, 0, 5],
    },
  ];

  const section = (title: string, color: string = C.ciano) => ({
    table: {
      widths: ['*'],
      body: [[{
        columns: [
          { width: 4, text: '', fillColor: color },
          { width: '*', text: title, fontSize: 9.5, bold: true, color: C.texto, margin: [10, 5, 8, 5] },
        ],
      }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => '#ECEFF1',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 10, 0, 0],
  });

  const card = (content: any) => ({
    table: {
      widths: ['*'],
      body: [[{ stack: content, margin: [12, 8, 12, 8] }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => C.branco,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  });

  return {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 85],
    background: watermarkBase64
      ? [{ image: watermarkBase64, width: 600, opacity: 0.06, absolutePosition: { x: 320, y: 50 } }]
      : undefined,
    content: [
      // ═══ CABEÇALHO ═══
      {
        columns: [
          { width: 120, stack: [logoEmpresa ? { image: logoEmpresa, fit: [110, 110], alignment: 'center' } : { text: '' }] },
          {
            width: '*',
            stack: [
              { text: 'AUDIOMETRIA', fontSize: 22, bold: true, color: C.azulEscuro, alignment: 'center', characterSpacing: 3, margin: [0, 4, 0, 3] },
              { text: TIPOEXAMENOME || 'Avaliação Audiológica Ocupacional', fontSize: 9, color: C.muted, alignment: 'center', characterSpacing: 1, margin: [0, 0, 0, 0] },
              { text: `OD: ${form.resultadoOD}`, fontSize: 8, color: C.COR_OD, alignment: 'center', margin: [2, 2, 0, 0] },
              { text: `OE: ${form.resultadoOE}`, fontSize: 8, color: C.COR_OE, alignment: 'center', margin: [2, 0, 0, 0] },
            ],
            margin: [0, 8, 0, 0],
          },
          { width: 120, text: '' },
        ],
        margin: [0, 0, 0, 0],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 553, y2: 0, lineWidth: 1.5, lineColor: C.ciano }],
        margin: [0, 4, 0, 8],
      },

      // ═══ DADOS DO FUNCIONÁRIO + EMPRESA ═══
      {
        columns: [
          {
            width: '50%',
            stack: [
              section('DADOS DO FUNCIONÁRIO', C.azulEscuro),
              card([
                { columns: [{ text: 'Nome:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: NOME || 'N/D', fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
                { columns: [{ text: 'CPF:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: formatCPF(CPFFUNCIONARIO), fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
                { columns: [{ text: 'Nascimento:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: `${DATANASCIMENTO || 'N/D'} — ${idade} anos`, fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
                { columns: [{ text: 'Cargo:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: NOMECARGO || 'N/D', fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
                { columns: [{ text: 'Setor:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: NOMESETOR || 'N/D', fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
              ]),
            ],
          },
          {
            width: '50%',
            stack: [
              section('DADOS DA EMPRESA', C.verde),
              card([
                { columns: [{ text: 'Razão social:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: NOMEEMPRESA || 'N/D', fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
                { columns: [{ text: 'CNPJ:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: CNPJEMPRESA || 'N/D', fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
                { columns: [{ text: 'Unidade:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: UNIDADEATENDIMENTO || 'N/D', fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
                { text: '', margin: [0, 0, 0, 0] },
                { columns: [{ text: 'Data do exame:', width: 90, fontSize: 7.5, bold: true, color: C.muted }, { text: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date()), fontSize: 9, color: C.texto }], margin: [0, 2, 0, 2] },
              ]),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 0],
      },

      // ═══ DADOS TÉCNICOS ═══
      section('DADOS TÉCNICOS DO EXAME', C.ciano),
      card([
        createGridSection('', dadosTecnicosGrid, { fontSize: 8 }),
      ]),

      // ═══ AUDIOMETRIA ═══
      section('AUDIOMETRIA TONAL', C.azulEscuro),
      {
        columns: [
          { width: '*', stack: [{ svg: odSVG, width: 260, alignment: 'center' }] },
          { width: '*', stack: [{ svg: oeSVG, width: 260, alignment: 'center' }] },
        ],
        margin: [0, 0, 0, 0],
      },

      // ═══ RESULTADOS ═══
      section('RESULTADOS LLOYD & KAPLAN', C.verde),
      card([
        { table: resultadosGrid, layout: 'lightHorizontalLines', margin: [0, 0, 0, 0], alignment: 'center' },
        ...detalhesAdicionais,
      ]),

      // ═══ SRT/IRF ═══
      ...(exibirIRF
        ? [
            section('ÍNDICES DE RECONHECIMENTO DE FALA', C.ciano),
            card([
              { table: irfGrid, layout: 'lightHorizontalLines', margin: [0, 0, 0, 0], alignment: 'center' },
            ]),
          ]
        : []),

      // ═══ CONCLUSÃO ═══
      {
        text: 'Os dados obtidos são subjetivos e correspondem ao exame realizado na presente data',
        alignment: 'center',
        bold: true,
        fontSize: 9,
        margin: [0, 10, 0, 5],
      },
      {
        text: form.observacoes || ' ',
        alignment: 'center',
        italics: true,
        margin: [0, 0, 0, 10],
      },

      // ═══ ANAMNESE EM NOVA PÁGINA ═══
      { text: '', pageBreak: 'before' },
      {
        columns: [
          { width: 120, stack: [logoEmpresa ? { image: logoEmpresa, fit: [110, 110], alignment: 'center' } : { text: '' }] },
          {
            width: '*',
            stack: [
              { text: 'ANAMNESE AUDIOLÓGICA', fontSize: 22, bold: true, color: C.azulEscuro, alignment: 'center', characterSpacing: 3, margin: [0, 4, 0, 3] },
              { text: TIPOEXAMENOME || 'Avaliação Audiológica Ocupacional', fontSize: 9, color: C.muted, alignment: 'center', characterSpacing: 1 },
            ],
            margin: [0, 8, 0, 0],
          },
          { width: 120, text: '' },
        ],
        margin: [0, 0, 0, 0],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 553, y2: 0, lineWidth: 1.5, lineColor: C.ciano }],
        margin: [0, 4, 0, 8],
      },
      {
        columns: [
          { text: NOME || 'N/D', bold: true, fontSize: 11, color: C.texto },
          { text: `CPF: ${formatCPF(CPFFUNCIONARIO)}  |  Nasc: ${DATANASCIMENTO || 'N/D'}  |  Idade: ${idade} anos`, fontSize: 9, color: C.muted, alignment: 'right' },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        columns: [
          { text: NOMEEMPRESA || 'N/D', bold: true, fontSize: 10, color: C.texto },
          { text: `Cargo: ${NOMECARGO || 'N/D'}  |  Setor: ${NOMESETOR || 'N/D'}`, fontSize: 9, color: C.muted, alignment: 'right' },
        ],
        margin: [0, 0, 0, 10],
      },
      section('ANAMNESE AUDIOLÓGICA', C.azulEscuro),
      card([
        createGridSection('', anamneseGrid, { fontSize: 8 }),
      ]),


    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome: audiometria?.profissional || profissional?.nome,
        profissional: audiometria?.profissional || profissional?.profissional || profissional?.nome,
      },
      NOME,
      CPFFUNCIONARIO,
      CODIGOPRONTUARIO || '',
      UNIDADEATENDIMENTO,
      assinaturaProfissional,
      assinaturaDigitalObrigatoria,
    ),

    styles: {
      mainTitle: { fontSize: 16, bold: true, color: C.azulEscuro },
      sectionTitle: { fontSize: 12, bold: true, color: C.azulEscuro },
      tableHeader: { bold: true, fillColor: '#E8EAF6', color: C.azulEscuro },
      tableLabel: { bold: true, color: C.texto },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15, color: C.texto },
  };
}
