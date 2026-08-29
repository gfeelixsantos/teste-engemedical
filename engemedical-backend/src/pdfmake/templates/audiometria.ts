import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { generateAudiogramSVG } from '../AudiometriaGraphics';

export interface AudiometriaData {
  // Dados do Exame
  // dataExame: string; // Removido no c├│digo anterior
  // horaExame: string; // Removido no c├│digo anterior
  tipoAudiometro: string;

  // Dados t├®cnicos do exame
  dataCalibracao: string;
  repousoAuditivo: string;
  horasRepouso: number;

  // Anamnese completa
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

  // Meatoscopia
  meatoscopiaOD: string;
  meatoscopiaOE: string;
  observacoesMeatoscopia: string;

  // Audiometria Tonal - Via A├®rea (INPUTS)
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

  // Audiometria Tonal - Via ├ôssea (INPUTS)
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

  // Mascaramento (INPUTS)
  mascaramentoOD250: string;
  mascaramentoOD500: string;
  mascaramentoOD1000: string;
  mascaramentoOD2000: string;
  mascaramentoOD3000: string;
  mascaramentoOD4000: string;
  mascaramentoOD6000: string;
  mascaramentoOD8000: string;

  mascaramentoOE250: string;
  mascaramentoOE500: string;
  mascaramentoOE1000: string;
  mascaramentoOE2000: string;
  mascaramentoOE3000: string;
  mascaramentoOE4000: string;
  mascaramentoOE6000: string;
  mascaramentoOE8000: string;

  // ├ìndices de Reconhecimento de Fala (INPUTS)
  realizarIRF: boolean;
  srtOD: string;
  srtOE: string;
  irfOD: string;
  irfOE: string;
  irfDBOD: string;
  irfDBOE: string;

  // Campos calculados (OUTPUTS)
  resultadoSRTOD: string;
  resultadoSRTOE: string;
  resultadoIRFOD: string;
  resultadoIRFOE: string;
  resultadoIRFMonoauralOD: string;
  resultadoIRFMonoauralOE: string;
  resultadoIRFDissimetrica: string;

  // === CRIT├ëRIOS PAIR NR-7 (OUTPUTS) ===
  entalhe4000HzOD: boolean;
  entalhe4000HzOE: boolean;
  tipoPerdaOD: string;
  tipoPerdaOE: string;

  audiometriaReferenciaDisponivel: boolean;
  limiaresRAOD: { [key: number]: number };
  limiaresRAOE: { [key: number]: number };
  classificacaoNR7OD: string;
  classificacaoNR7OE: string;

  // Classifica├º├Áes (Lloyd & Kaplan) (OUTPUTS)
  classificacaoOD: string;
  classificacaoOE: string;
  classificacaoGeral: string;
  configuracaoOD: string;
  configuracaoOE: string;

  // Laudo e Observa├º├Áes (OUTPUTS)
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
  
  const parseValor = (v: string | null | undefined): number | null => {
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

    // Se a média for normal (<= 25), mas houver qualquer frequência > 25 dB
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

  // Média quadritonal clínica (500, 1000, 2000, 4000 Hz)
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
 
   const { codigo, cpf, conselho, ufconselho } = profissional;
 
   const audiometria = EXAMES?.find((e: any) => {
     return Object.prototype.hasOwnProperty.call(getExamesList(), e.grupo);
   });
 
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
  const assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[codigo]);
  // --- GR├üFICO AUDIOM├ëTRICO SVG ---
  const { od: odSVG, oe: oeSVG } = generateAudiogramSVG(form); // ======= 1. DADOS T├ëCNICOS DO EXAME E MEATOSCOPIA (ATUALIZADO) =======

  const dadosTecnicosGrid: TableCell[][] = [
    [
      'Data Exame',
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date()) || 'N/D',
      'Hora Exame',
      new Date().toLocaleTimeString('pt-BR') || 'N/D',
      'Local Exame',
      UNIDADEATENDIMENTO || 'N/D',
    ],
    [
      'Tipo Audi├┤metro',
      form.tipoAudiometro || 'N/D',
      'Data Calibra├º├úo',
      form.dataCalibracao || 'N/D',
      'Repouso Auditivo',
      `${form.repousoAuditivo || 'N/D'} (${form.horasRepouso || 'N/D'}h)`,
    ],
    [
      'Meatoscopia OD',
      form.meatoscopiaOD || 'N/D',
      'Meatoscopia OE',
      form.meatoscopiaOE || 'N/D',
      'Observa├º├Áes Meatoscopia',
      form.observacoesMeatoscopia || '-',
    ],
  ]; // ======= 2. AUDIOMETRIA TONAL + MASCARAMENTO =======

  const audiometriaGrid: TableCell[][] = [
    [
      {
        text: 'Ouvido Direito (OD)',
        style: 'tableHeader',
        alignment: 'center',
        colSpan: 9,
        bold: true,
        color: COR_OD,
      },
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'Frequ├¬ncia (Hz)',
      '250',
      '500',
      '1000',
      '2000',
      '3000',
      '4000',
      '6000',
      '8000',
    ],
    [
      'VA',
      form.viaAereaOD250 || '-',
      form.viaAereaOD500 || '-',
      form.viaAereaOD1000 || '-',
      form.viaAereaOD2000 || '-',
      form.viaAereaOD3000 || '-',
      form.viaAereaOD4000 || '-',
      form.viaAereaOD6000 || '-',
      form.viaAereaOD8000 || '-',
    ],
    [
      'VO',
      '-',
      form.viaOsseaOD500 || '-',
      form.viaOsseaOD1000 || '-',
      form.viaOsseaOD2000 || '-',
      form.viaOsseaOD3000 || '-',
      form.viaOsseaOD4000 || '-',
      '-',
      '-',
    ],
    [
      'Mascaramento',
      form.mascaramentoOD250 || '-',
      form.mascaramentoOD500 || '-',
      form.mascaramentoOD1000 || '-',
      form.mascaramentoOD2000 || '-',
      form.mascaramentoOD3000 || '-',
      form.mascaramentoOD4000 || '-',
      form.mascaramentoOD6000 || '-',
      form.mascaramentoOD8000 || '-',
    ],

    [
      {
        text: 'Ouvido Esquerdo (OE)',
        style: 'tableHeader',
        alignment: 'center',
        colSpan: 9,
        bold: true,
        color: COR_OE,
      },
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],

    [
      'VA',
      form.viaAereaOE250 || '-',
      form.viaAereaOE500 || '-',
      form.viaAereaOE1000 || '-',
      form.viaAereaOE2000 || '-',
      form.viaAereaOE3000 || '-',
      form.viaAereaOE4000 || '-',
      form.viaAereaOE6000 || '-',
      form.viaAereaOE8000 || '-',
    ],
    [
      'VO',
      '-',
      form.viaOsseaOE500 || '-',
      form.viaOsseaOE1000 || '-',
      form.viaOsseaOE2000 || '-',
      form.viaOsseaOE3000 || '-',
      form.viaOsseaOE4000 || '-',
      '-',
      '-',
    ],
    [
      'Mascaramento',
      form.mascaramentoOE250 || '-',
      form.mascaramentoOE500 || '-',
      form.mascaramentoOE1000 || '-',
      form.mascaramentoOE2000 || '-',
      form.mascaramentoOE3000 || '-',
      form.mascaramentoOE4000 || '-',
      form.mascaramentoOE6000 || '-',
      form.mascaramentoOE8000 || '-',
    ],
  ]; // ======= 3. ANAMNESE AUDIOL├ôGICA (ATUALIZADO para 6 colunas e incluir todos os campos) =======

  const anamneseGrid: TableCell[][] = [
    [
      'Queixa Auditiva',
      form.queixaAuditiva || 'N/D',
      'Audiometria Anterior',
      form.audiometriaAnterior || 'N/D',
      'Infec├º├úo/Cirurgia Ouvido',
      form.infeccaoCirurgiaOuvido || 'N/D',
    ],
    [
      'Surdez na Fam├¡lia',
      form.surdezFamilia || 'N/D',
      'Parentesco Surdez',
      form.parentescoSurdez || 'N/D',
      'Trabalho Ant. c/ Ru├¡do',
      form.trabalhoAnteriorRuido || 'N/D',
    ],
    [
      'Trabalho Atual c/ Ru├¡do',
      form.trabalhoAtualRuido || 'N/D',
      'Uso de Prot. Auricular',
      form.usoProtetorAuricular || 'N/D',
      'Contato c/ Qu├¡micos',
      form.contatoQuimicos || 'N/D',
    ],
    [
      'H├íbito de Som Alto',
      form.habitoSomAlto || 'N/D',
      'Exposi├º├úo a Explos├Áes',
      form.exposicaoExplosoes || 'N/D',
      'Trauma Cabe├ºa/Ouvido',
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
      'Trat. Otot├│xicos',
      form.tratamentoOtotoxicos || 'N/D',
      'Data Tratamento',
      form.dataTratamentoOtotoxicos || '-',
      '',
      '',
    ],
  ]; // ======= 4. RESULTADOS LLOYD & KAPLAN + CLASSIFICA├ç├òES =======

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
              text: `IRF Dissim├®trica: ${form.resultadoIRFDissimetrica || ''}`,
              colSpan: 5,
              alignment: 'center',
              fontSize: 9,
            },
          ],
        ],
      }
    : null; // ======= Conte├║do Din├ómico Adicional =======

  const detalhesAdicionais: Content[] = [
    // Detalhes Entalhe
    {
      columns: [
        {
          text: `Entalhe 4000Hz: OD: ${form.entalhe4000HzOD ? 'SIM' : 'N├âO'} | OE: ${form.entalhe4000HzOE ? 'SIM' : 'N├âO'}`,
          fontSize: 9,
          bold: true,
          alignment: 'right',
          color: LIGHT_TEXT,
        },
      ],
      margin: [0, 5, 0, 10],
    },
  ]; // ======= DOCUMENTO FINAL =======

  return {
    pageSize: 'A4',
    pageMargins: [35, 35, 35, 45],
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
      // T├ìTULO
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
              { text: `OD: ${form.resultadoOD}`, color: COR_OD },
              { text: `OE: ${form.resultadoOE}`, color: COR_OE },
              form.criterioPCD.includes('POSSIBILIDADE')
                ? {
                    text: `PCD: ${form.criterioPCD || ''}`,
                    color: '#2660dcff',
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
                text: `${UNIDADEATENDIMENTO}, ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date())}`,
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
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)} ┬á Nasc: ${DATANASCIMENTO || 'N/D'} ┬á Idade: ${idade} anos`,
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
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'} ┬á Cargo: ${NOMECARGO || 'N/D'} ┬á Setor: ${NOMESETOR || 'N/D'}`,
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
      }, // SE├ç├òES

      createGridSection('Dados T├®cnicos do Exame', dadosTecnicosGrid, {
        fontSize: 8,
      }), // GR├üFICO AUDIOM├ëTRICO (Novo elemento)

      // T├¡tulo da Se├º├úo
      {
        text: 'Gr├íficos Audiom├®tricos',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 5, 0, 5],
      },

      // Container Columns para renderizar lado a lado
      {
        columns: [
          // Gr├ífico Ouvido Direito (OD)
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

          // Gr├ífico Ouvido Esquerdo (OE)
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
        margin: [0, 0, 0, 10],
      },
      createGridSection('Audiometria Tonal', audiometriaGrid, { fontSize: 7 }), // RESULTADOS (centralizada)

      {
        text: 'Resultados',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 5, 0, 5],
      },
      {
        table: resultadosGrid,
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 5],
        alignment: 'center',
      }, // DETALHES ADICIONAIS (M├®dia Tonal / Entalhe)

      ...detalhesAdicionais, // SRT / IRF

      ...(exibirIRF
        ? [
            {
              text: '├ìndices de Reconhecimento de Fala (SRT / IRF)',
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
        : []), // ANAMNESE AUDIOL├ôGICA (com a nova grade de 6 colunas)

      {
        ...createGridSection('', anamneseGrid, { fontSize: 8 }),
        margin: [0, 0, 0, 15],
      }, // CONCLUS├âO

      {
        text: `Conclus├úo: ${form.classificacaoGeral || 'N/D'}`,
        alignment: 'center',
        bold: true,
        fontSize: 12,
        color: PRIMARY,
        margin: [0, 10, 0, 5],
      },
      {
        text: 'Os dados obtidos s├úo subjetivos e correspondem ao exame realizado na presente data',
        alignment: 'center',
        bold: true,
        fontSize: 9,
      },
      {
        text: form.observacoes || ' ',
        alignment: 'center',
        italics: true,
        margin: [0, 0, 0, 25],
      }, // ASSINATURAS (p├ígina principal)
      {
        columns: [
          {
            width: '50%',
            stack: [
              assinaturaProfissional
                ? {
                    image: assinaturaProfissional,
                    width: 100,
                    margin: [0, 0, 0, 5],
                  }
                : {},
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 160,
                    y2: 0,
                    lineColor: PRIMARY,
                  },
                ],
              },
              { text: audiometria?.profissional || 'N/D', fontSize: 8 },
              {
                text: `Registro (CRF/CRM): ${conselho || 'N/D'} / ${ufconselho || 'N/D'} `,
                fontSize: 8,
              },
              { text: `CPF: ${formatCPF(cpf)}`, fontSize: 8 },
            ],
          },
          {
            width: '50%',
            stack: [
              {
                text: `O(A) paciente/funcion├írio(a) atesta a realiza├º├úo do exame em ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date()) || 'N/D'} e est├í ciente da finalidade de sa├║de ocupacional e legal deste documento. Confirma o aceite dos termos atrav├®s da autentica├º├úo biom├®trica/assinatura eletr├┤nica registrada no sistema SOC, conforme o Termo de Ciência e Registro de Aceite para Uso de Biometria.`,
                fontSize: 6,
                italics: true,
                alignment: 'right',
                margin: [0, 0, 0, 5],
              },
              { text: NOME, fontSize: 8, alignment: 'right' },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}`,
                fontSize: 8,
                alignment: 'right',
              },
            ],
          },
        ],
      }, // --- ANAMNESE EM NOVA P├üGINA (6 colunas via createGridSection) ---

      {
        text: 'Anamnese Audiol├│gica',
        style: 'sectionTitle',
        alignment: 'center',
        pageBreak: 'before',
        margin: [0, 5, 0, 10],
      }, // Repete dados paciente na p├ígina da anamnese

      {
        columns: [
          {
            width: '*',
            stack: [
              { text: NOME || 'N/D', bold: true, fontSize: 11 },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)} ┬á Nasc: ${DATANASCIMENTO || 'N/D'} ┬á Idade: ${idade} anos`,
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
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'} ┬á Cargo: ${NOMECARGO || 'N/D'} ┬á Setor: ${NOMESETOR || 'N/D'}`,
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
      }, // ANAMNESE AUDIOL├ôGICA (com a nova grade de 6 colunas)

      {
        ...createGridSection('', anamneseGrid, { fontSize: 8 }),
        margin: [0, 0, 0, 15],
      }, // ASSINATURAS NA P├üGINA DA ANAMNESE (replicadas)

      {
        columns: [
          {
            width: '50%',
            stack: [
              assinaturaProfissional
                ? {
                    image: assinaturaProfissional,
                    width: 100,
                    margin: [0, 0, 0, 5],
                  }
                : {},
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 160,
                    y2: 0,
                    lineColor: PRIMARY,
                  },
                ],
              },
              { text: audiometria?.profissional || 'N/D', fontSize: 8 },
              {
                text: `Registro: ${conselho || 'N/D'} / ${ufconselho || 'N/D'}`,
                fontSize: 8,
              },
              { text: `CPF: ${formatCPF(cpf)}`, fontSize: 8 },
            ],
          },
          {
            width: '50%',
            stack: [
              {
                text: `O(A) paciente/funcion├írio(a) atesta a realiza├º├úo do exame em ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date()) || 'N/D'} e est├í ciente da finalidade de sa├║de ocupacional e legal deste documento. Confirma o aceite dos termos atrav├®s da autentica├º├úo biom├®trica/assinatura eletr├┤nica registrada no sistema SOC, conforme o Termo de Ciência e Registro de Aceite para Uso de Biometria.`,
                fontSize: 6,
                italics: true,
                alignment: 'right',
                margin: [0, 0, 0, 5],
              },
              { text: NOME, fontSize: 8, alignment: 'right' },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}`,
                fontSize: 8,
                alignment: 'right',
              },
            ],
          },
        ],
      },
    ],

    footer: {
      columns: [
        {
          text: `${CODIGOPRONTUARIO} Processado em ${new Date().toLocaleString('pt-BR')} ÔÇô Centro M├®dico de Sa├║de Ocupacional - ${UNIDADEATENDIMENTO}`,
          alignment: 'left',
          fontSize: 6,
          color: '#555',
          margin: [35, 10, 35, 0],
        },
      ],
    },

    styles: {
      mainTitle: { fontSize: 16, bold: true, color: PRIMARY },
      sectionTitle: { fontSize: 12, bold: true, color: PRIMARY },
      tableHeader: { bold: true, fillColor: '#E8EAF6', color: PRIMARY },
      tableLabel: { bold: true, color: LIGHT_TEXT },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
