import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { generateAudiogramSVG } from '../AudiometriaGraphics';
import { buildPdfFooter } from '../pdfFooterHelper';
import { getPaginaOrientacaoPlugSilicone } from './orientacaoPlug';

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

  // Via Aérea
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

  // Via Óssea
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

  // Mascaramento Via Aérea - SEPARADO POR TIPO
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

  // Mascaramento Via Óssea - SEPARADO POR TIPO
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

  // IRF
  realizarIRF: boolean;
  srtOD: string;
  srtOE: string;
  irfOD: string;
  irfOE: string;
  irfDBOD: string;
  irfDBOE: string;

  // Resultados calculados
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
    // Entalhe só é válido quando há perda fora da zona de normalidade (> 25 dB)
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

export async function gerarDocAudiometria(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#114E34';
  const LIGHT_TEXT = '#333333';
  const COR_OD = '#B71C1C';
  const COR_OE = '#0D47A1';

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
    : 'N/D'; // --- Assets

  const logoEmpresa = await getImageBase64(
    'https://cmsocupacional.com.br/images/logo.png',
  );
  const watermarkBase64 = await getImageBase64(
    'https://centromedicodesaudeocupacional.formaedu.com.br/wp-content/uploads/sites/6/2024/11/LOGO-220x221.png',
  );
  let assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[codigo]);

  // fallback caso não tenha assinatura
  if (!assinaturaProfissional)
    assinaturaProfissional = await getImageBase64(
      'https://cmsocupacional.com.br/images/logo.png',
    );

  // --- GRÁFICO AUDIOMÉTRICO SVG ---
  const { od: odSVG, oe: oeSVG } = generateAudiogramSVG(form); // ======= 1. DADOS TÉCNICOS DO EXAME E MEATOSCOPIA (ATUALIZADO) =======

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

  // ======= 3. ANAMNESE AUDIOLÓGICA (ATUALIZADO para 6 colunas e incluir todos os campos) =======

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
  ]; // ======= 4. RESULTADOS LLOYD & KAPLAN + CLASSIFICAÇÕES =======

  const resultadosGrid = {
    headerRows: 1,
    widths: ['*', '*', '*', '*', '*'],
    body: [
      [
        { text: 'Ouvido', style: 'tableHeader', alignment: 'center' },
        { text: 'Média Tonal (4F)', style: 'tableHeader', alignment: 'center' },
        { text: 'Grau da Perda', style: 'tableHeader', alignment: 'center' },
        { text: 'Configuração', style: 'tableHeader', alignment: 'center' },
        { text: 'Tipo de Perda', style: 'tableHeader', alignment: 'center' },
      ],
      [
        {
          text: 'Direito (OD)',
          color: COR_OD,
          alignment: 'center',
          bold: true,
        },
        {
          text: form.perdaAuditivaOD || 'N/D',
          alignment: 'center',
          fontSize: 8,
        }, // Grau de Perda
        {
          text: form.classificacaoOD || 'N/D',
          alignment: 'center',
          fontSize: 8,
        },
        {
          text: form.configuracaoOD || 'N/D',
          alignment: 'center',
          fontSize: 8,
        },
        { text: form.tipoPerdaOD || 'N/D', alignment: 'center', fontSize: 8 },
      ],
      [
        {
          text: 'Esquerdo (OE)',
          color: COR_OE,
          alignment: 'center',
          bold: true,
        },
        {
          text: form.perdaAuditivaOE || 'N/D',
          alignment: 'center',
          fontSize: 8,
        }, // Grau de Perda
        {
          text: form.classificacaoOE || 'N/D',
          alignment: 'center',
          fontSize: 8,
        },
        {
          text: form.configuracaoOE || 'N/D',
          alignment: 'center',
          fontSize: 8,
        },
        { text: form.tipoPerdaOE || 'N/D', alignment: 'center', fontSize: 8 },
      ],
    ],
  }; // ======= SRT / IRF (mesmo layout da tabela resultados) =======

  const exibirIRF =
    form.realizarIRF &&
    (form.srtOD ||
      form.srtOE ||
      form.irfOD ||
      form.irfOE ||
      form.irfDBOD ||
      form.irfDBOE ||
      form.resultadoIRFMonoauralOD ||
      form.resultadoIRFMonoauralOE ||
      form.resultadoIRFDissimetrica);

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
            {
              text: 'Direito (OD)',
              color: COR_OD,
              alignment: 'center',
              bold: true,
            },
            { text: form.srtOD || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfOD || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfDBOD || '-', alignment: 'center', fontSize: 9 },
            {
              text: form.resultadoIRFMonoauralOD || '-',
              alignment: 'center',
              fontSize: 9,
            },
          ],
          [
            {
              text: 'Esquerdo (OE)',
              color: COR_OE,
              alignment: 'center',
              bold: true,
            },
            { text: form.srtOE || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfOE || '-', alignment: 'center', fontSize: 9 },
            { text: form.irfDBOE || '-', alignment: 'center', fontSize: 9 },
            {
              text: form.resultadoIRFMonoauralOE || '-',
              alignment: 'center',
              fontSize: 9,
            },
          ],
          [
            {
              text: `IRF Dissimétrica: ${form.resultadoIRFDissimetrica || ''}`,
              colSpan: 5,
              alignment: 'center',
              fontSize: 9,
            },
          ],
        ],
      }
    : null; // ======= Conteúdo Dinâmico Adicional =======

  const detalhesAdicionais: Content[] = [
    // Detalhes Entalhe
    {
      columns: [
        {
          text: `Entalhe 4000Hz: OD: ${form.entalhe4000HzOD ? 'SIM' : 'NÃO'} | OE: ${form.entalhe4000HzOE ? 'SIM' : 'NÃO'}`,
          fontSize: 6,
          bold: true,
          alignment: 'right',
          color: LIGHT_TEXT,
        },
      ],
      margin: [0, 5, 0, 5],
    },
  ]; // ======= DOCUMENTO FINAL =======

  return {
    pageSize: 'A4',
    pageMargins: [30, 35, 30, 110],
    background: watermarkBase64
      ? [
          {
            image: watermarkBase64,
            width: 350,
            opacity: 0.04,
            absolutePosition: { x: 150, y: 250 },
          },
        ]
      : undefined,
    content: [
      // TÍTULO
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'AUDIOMETRIA OCUPACIONAL',
                style: 'mainTitle',
                margin: [0, 0, 0, 5],
                color: PRIMARY,
              },
              { text: `${TIPOEXAMENOME}` },
              { text: `OD: ${form.resultadoOD}`, color: COR_OD, fontSize: 8 },
              { text: `OE: ${form.resultadoOE}`, color: COR_OE, fontSize: 8 },
              form.criterioPCD?.includes('Atende')
                ? {
                    text: `PCD: ${form.criterioPCD || ''}`,
                    fontSize: 8,
                  }
                : { text: '' },
            ],
          },
          {
            stack: [
              logoEmpresa
                ? {
                    image: logoEmpresa,
                    width: 120,
                    alignment: 'right',
                    margin: [0, 0, 0, 5],
                  }
                : {},
              {
                text: `${UNIDADEATENDIMENTO}, ${new Date().toLocaleDateString('pt-br')}`,
                alignment: 'right',
                fontSize: 7,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 5],
      }, // DADOS PACIENTE

      {
        columns: [
          {
            width: '*',
            stack: [
              { text: NOME || 'N/D', bold: true, fontSize: 11 },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}   Nasc: ${DATANASCIMENTO || 'N/D'}   Idade: ${idade} anos`,
                fontSize: 10,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      }, // EMPRESA

      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: `${NOMEEMPRESA || 'N/D'}` },
                  {
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'}   Cargo: ${NOMECARGO || 'N/D'}   Setor: ${NOMESETOR || 'N/D'}`,
                    fontSize: 10,
                    color: LIGHT_TEXT,
                  },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      }, // SEÇÕES

      createGridSection('Dados Técnicos do Exame', dadosTecnicosGrid, {
        fontSize: 8,
      }), // GRÁFICO AUDIOMÉTRICO (Novo elemento)

      // Título da Seção
      {
        text: 'Audiometria',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 0, 0, 0],
      },

      // Container Columns para renderizar lado a lado
      {
        columns: [
          // Gráfico Ouvido Direito (OD)
          {
            // Ocupa a metade da largura
            width: '*',
            stack: [
              {
                svg: odSVG,
                width: 260,
                alignment: 'center',
              },
            ],
          },

          // Gráfico Ouvido Esquerdo (OE)
          {
            // Ocupa a outra metade da largura
            width: '*',
            stack: [
              {
                svg: oeSVG,
                width: 260,
                alignment: 'center',
              },
            ],
          },
        ],
        // Margem abaixo do bloco de colunas
        margin: [0, 0, 0, 0],
      }, // RESULTADOS (centralizada)
      //       createGridSection('Audiometria Tonal', audiometriaGrid, { fontSize: 7 }),

      {
        text: 'Resultados',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 0, 0, 0],
      },
      {
        table: resultadosGrid,
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 0],
        alignment: 'center',
      }, // DETALHES ADICIONAIS (Média Tonal / Entalhe)

      ...detalhesAdicionais, // SRT / IRF

      ...(exibirIRF
        ? [
            {
              text: 'Índices de Reconhecimento de Fala (SRT / IRF)',
              style: 'sectionTitle',
              alignment: 'center',
              margin: [0, 5, 0, 5],
            },
            {
              table: irfGrid,
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 10],
              alignment: 'center',
            },
          ]
        : []), // CONCLUSÃO

      //       // ANAMNESE AUDIOLÓGICA (com a nova grade de 6 colunas)
      //       {
      //         ...createGridSection('', anamneseGrid, { fontSize: 8 }),
      //         margin: [0, 0, 0, 15],
      //       },

      {
        text: 'Os dados obtidos são subjetivos e correspondem ao exame realizado na presente data',
        alignment: 'center',
        bold: true,
        fontSize: 9,
      },
      {
        text: form.observacoes || ' ',
        alignment: 'center',
        italics: true,
        margin: [0, 0, 0, 10],
      },

      // --- ANAMNESE EM NOVA PÁGINA (6 colunas via createGridSection) ---

      {
        text: 'Anamnese Audiológica',
        style: 'sectionTitle',
        alignment: 'center',
        pageBreak: 'before',
        margin: [0, 5, 0, 10],
      }, // Repete dados paciente na página da anamnese

      {
        columns: [
          {
            width: '*',
            stack: [
              { text: NOME || 'N/D', bold: true, fontSize: 11 },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}   Nasc: ${DATANASCIMENTO || 'N/D'}   Idade: ${idade} anos`,
                fontSize: 10,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      }, // repete info da empresa

      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: `${NOMEEMPRESA || 'N/D'}`, bold: true },
                  {
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'}   Cargo: ${NOMECARGO || 'N/D'}   Setor: ${NOMESETOR || 'N/D'}`,
                    fontSize: 10,
                    color: LIGHT_TEXT,
                  },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      }, // ANAMNESE AUDIOLÓGICA (com a nova grade de 6 colunas)

      {
        ...createGridSection('', anamneseGrid, { fontSize: 8 }),
        margin: [0, 0, 0, 15],
      },
      ...(await getPaginaOrientacaoPlugSilicone(
        form,
        asoData,
        profissional,
        assinaturaProfissional,
        audiometria?.profissional,
      )),
    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome: audiometria?.profissional || profissional?.nome,
        profissional:
          audiometria?.profissional ||
          profissional?.profissional ||
          profissional?.nome,
      },
      NOME,
      CPFFUNCIONARIO,
      CODIGOPRONTUARIO || '',
      UNIDADEATENDIMENTO,
      assinaturaProfissional,
      assinaturaDigitalObrigatoria,
    ),

    styles: {
      mainTitle: { fontSize: 16, bold: true, color: PRIMARY },
      sectionTitle: { fontSize: 12, bold: true, color: PRIMARY },
      tableHeader: { bold: true, fillColor: '#E8EAF6', color: PRIMARY },
      tableLabel: { bold: true, color: LIGHT_TEXT },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
