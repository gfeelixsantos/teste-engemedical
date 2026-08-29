import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { TermoConsentimentoInput } from '../termo-consentimento.types';
import { formatDataHora } from '../termo-consentimento.types';
import { getImageBase64 } from 'src/utils/util';

const PRIMARY = '#114E34';
const LIGHT_TEXT = '#333333';
const MUTED = '#666666';
const SECTION = '#0D6B3E';
const BORDER = '#CCCCCC';

function formatDedoLabel(dedo: string): string {
  const labels: Record<string, string> = {
    INDICADOR_DIREITO: 'Indicador direito',
    INDICADOR_ESQUERDO: 'Indicador esquerdo',
    POLEGAR_DIREITO: 'Polegar direito',
    POLEGAR_ESQUERDO: 'Polegar esquerdo',
    MEDIO_DIREITO: 'Medio direito',
    MEDIO_ESQUERDO: 'Medio esquerdo',
    ANELAR_DIREITO: 'Anelar direito',
    ANELAR_ESQUERDO: 'Anelar esquerdo',
    MINIMO_DIREITO: 'Minimo direito',
    MINIMO_ESQUERDO: 'Minimo esquerdo',
  };

  return labels[dedo] || dedo;
}

function buildIdentificacao(input: TermoConsentimentoInput): string {
  if (input.funcionario.cpfMascarado) {
    return `CPF: ${input.funcionario.cpfMascarado}`;
  }

  if (input.funcionario.codigo) {
    return `Codigo interno: ${input.funcionario.codigo}`;
  }

  return 'N/D';
}

function isFacial(input: TermoConsentimentoInput): boolean {
  return input.tipo === 'FACIAL';
}

function metodoLabel(input: TermoConsentimentoInput): string {
  return isFacial(input) ? 'Autenticacao Facial' : 'Biometria';
}

function metodoAdjetivo(input: TermoConsentimentoInput): string {
  return isFacial(input) ? 'facial' : 'biometrica';
}

function tableRow5Label(input: TermoConsentimentoInput): string {
  return isFacial(input) ? 'DATA / VALIDADE' : 'DEDO / VALIDADE';
}

function tableRow5Value(input: TermoConsentimentoInput, dataCiencia: string, dataValidade: string): string {
  if (isFacial(input)) {
    return `${dataCiencia}  |  Valido ate ${dataValidade} (365 dias)`;
  }
  const dedoLabel = formatDedoLabel(input.biometria!.dedo);
  return `${dedoLabel}  |  ${dataCiencia}  |  Valido ate ${dataValidade}`;
}

export async function gerarTermoConsentimento(
  input: TermoConsentimentoInput,
  documentHash: string,
): Promise<TDocumentDefinitions> {
  const dataCiencia = formatDataHora(input.lgpd.cienciaRegistradaEm);
  const dataValidade = formatDataHora(input.validadeAte);
  const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';
  const logoBase64 = await getImageBase64(logoUrl);
  const operador =
    input.operador?.nome || input.operador?.codigo || 'N/D';
  const contatoDpo = input.clinica.contatoDpo || 'Canal interno de privacidade';
  const dpoLabel = input.lgpd.dpoIdentificacao || contatoDpo;
  const retencaoDocAnos = input.lgpd.retencaoDocumentalAnos || 20;
  const retencaoLogAnos = input.lgpd.retencaoLogsAnos || 2;
  const metodo = metodoAdjetivo(input);

  const relatorioEvidenciasUrl = input.relatorioEvidenciasUrl || '';

  const title = isFacial(input)
    ? 'Termo de Ciencia e Registro de Aceite para Uso de Autenticacao Facial em Atendimento Ocupacional'
    : 'Termo de Ciencia e Registro de Aceite para Uso de Biometria em Atendimento Ocupacional';

  return {
    pageSize: 'A4',
    pageMargins: [30, 20, 30, 55],
    content: [
      // ─── HEADER ──────────────────────────────────────────────────
      {
        columns: [
          {
            width: 'auto',
            stack: logoBase64
              ? [
                  {
                    image: logoBase64,
                    width: 120,
                    fit: [120, 36] as [number, number],
                    margin: [0, 0, 0, 4],
                  },
                ]
              : [
                  { text: 'CMS OCUPACIONAL', style: 'brandTitle' },
                  {
                    text: 'Sistema de Gestao em Saude Ocupacional',
                    fontSize: 8,
                    color: MUTED,
                    margin: [0, 1, 0, 0],
                  },
                ],
          },
          {
            width: '*',
            stack: [
              {
                text: dataCiencia,
                alignment: 'right',
                fontSize: 8,
                color: MUTED,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 2],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 535,
            y2: 0,
            lineWidth: 1,
            lineColor: PRIMARY,
          },
        ],
        margin: [0, 0, 0, 6],
      },

      // ─── TITLE ───────────────────────────────────────────────────
      {
        text: title,
        style: 'docTitle',
        margin: [0, 0, 0, 8],
      },

      // ─── INFO TABLE ──────────────────────────────────────────────
      {
        table: {
          widths: ['28%', '72%'],
          body: [
            [
              { text: 'TRABALHADOR(A)', style: 'cellLabel' },
              {
                text: [
                  { text: input.funcionario.nome, style: 'cellValue' },
                  { text: `  |  ${buildIdentificacao(input)}`, fontSize: 7.5, color: MUTED },
                ],
                style: 'cellValue',
              },
            ],
            [
              { text: 'EMPRESA / CNPJ', style: 'cellLabel' },
              { text: `${input.empresa.nome}${input.empresa.cnpj ? ` (${input.empresa.cnpj})` : ''}`, style: 'cellValue' },
            ],
            [
              { text: 'CLINICA', style: 'cellLabel' },
              {
                text: [
                  { text: input.clinica.nome, style: 'cellValue' },
                  ...(input.clinica.cnpj
                    ? [{ text: `  |  CNPJ ${input.clinica.cnpj}`, fontSize: 7.5, color: MUTED }]
                    : []),
                ],
                style: 'cellValue',
              },
            ],
            [
              { text: tableRow5Label(input), style: 'cellLabel' },
              { text: tableRow5Value(input, dataCiencia, dataValidade), style: 'cellValue' },
            ],
            [
              { text: 'OPERADOR', style: 'cellLabel' },
              { text: operador, style: 'cellValue' },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => BORDER,
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
        margin: [0, 0, 0, 8],
      },

      // ─── 1. OBJETO E FINALIDADE ─────────────────────────────────
      { text: '1. Objeto e finalidade', style: 'sectionTitle' },
      {
        text:
          `Este termo registra a ciencia do trabalhador e o aceite operacional do uso de autenticacao ${metodo} no atendimento ocupacional realizado no CMSO360, com a finalidade de reforcar a validacao de identidade, a seguranca, a rastreabilidade e a integridade dos registros vinculados ao atendimento.`,
        style: 'bodyText',
      },
      {
        text:
          `O uso da autenticacao ${metodo} podera estar relacionado ao atendimento ocupacional em geral, ao ASO, aos exames complementares e a documentos do atendimento.`,
        style: 'bodyText',
      },

      // ─── 2. BASES LEGAIS ────────────────────────────────────────
      { text: '2. Bases legais e natureza do registro', style: 'sectionTitle' },
      {
        text:
          `Os dados biometricos${isFacial(input) ? ' faciais' : ''} tratados neste fluxo constituem dados pessoais sensiveis (art. 5, II, Lei 13.709/2018 - LGPD). O tratamento tem fundamento em: (i) obrigacao legal - NR-7 (PCMSO) e art. 168 da CLT; (ii) protecao da saude (art. 11, II, "c", LGPD); e (iii) exercicio regular de direitos (art. 11, II, "d", LGPD).`,
        style: 'bodyText',
      },
      {
        text:
          `Este registro constitui aceite operacional para utilizacao da autenticacao ${metodo}, nao se confundindo com consentimento como base legal. As hipoteses legais permanecem como fundamento principal do tratamento.`,
        style: 'bodyText',
      },

      // ─── 3. CONTROLADOR E ENCARREGADO ───────────────────────────
      { text: '3. Controlador e encarregado', style: 'sectionTitle' },
      {
        text:
          `Controlador: ${input.clinica.nome}${input.clinica.cnpj ? ` - CNPJ ${input.clinica.cnpj}` : ''} | Base legal: ${input.lgpd.baseLegalTexto}`,
        style: 'bodyText',
      },
      {
        text:
          `Encarregado (DPO): ${dpoLabel} | Canal: ${contatoDpo}`,
        style: 'bodyText',
      },
      {
        text:
          `Operador de autenticacao: BRy EasySign (BRy Tecnologia Ltda.), nos termos do art. 5, VII, LGPD, com processamento em servidores no Brasil ou exterior conforme clausulas contratuais padrao.`,
        style: 'bodyText',
      },

      // ─── 4. USO, SEGURANCA E LIMITES ───────────────────────────
      { text: '4. Uso, seguranca e limites', style: 'sectionTitle' },
      ...(isFacial(input)
        ? [
            {
              text:
                `A autenticacao facial sera utilizada como mecanismo de autenticacao, ciencia e registro de aceite no fluxo de atendimento ocupacional, compondo evidencia tecnica e documental da operacao. O sistema adota controles de acesso, trilha de auditoria, codigo de rastreio e registro documental do relatorio de evidencias.`,
              style: 'bodyText',
            },
          ]
        : [
            {
              text:
                `A biometria sera utilizada como mecanismo de autenticacao, ciencia e registro de aceite no fluxo de atendimento ocupacional, compondo evidencia tecnica e documental da operacao. O sistema adota controles de acesso, trilha de auditoria e codigo de rastreio.`,
              style: 'bodyText',
            },
            {
              text:
                `O CMSO360 nao mantem a imagem bruta da captura como registro permanente. A representacao biometrica e armazenada em formato criptografado (AES-256-GCM). A imagem derivada serve exclusivamente como evidencia documental.`,
              style: 'bodyText',
            },
          ]),
      {
        text:
          `A autenticacao ${metodo} nao sera utilizada para finalidade incompativel, monitoramento indevido, discriminacao, exploracao comercial ou compartilhamento nao autorizado, permanecendo restrita a identificacao, seguranca e rastreabilidade do atendimento.`,
        style: 'bodyText',
      },

      // ─── 5. VALIDADE E RETENCAO ─────────────────────────────────
      { text: '5. Validade e retencao dos registros', style: 'sectionTitle' },
      {
        text:
          `Este termo possui validade de 365 dias, encerrando-se em ${dataValidade}. Apos o vencimento, a reutilizacao podera depender de renovacao. A retencao observa:`,
        style: 'bodyText',
      },
      {
        ul: [
          {
            text:
              isFacial(input)
                ? `Registros documentais do atendimento: ${retencaoDocAnos} anos (NR-7, item 7.6.1).`
                : `Template biometrico criptografado e registros documentais: ${retencaoDocAnos} anos (NR-7, Lei 6.514/77).`,
            style: 'bodyText',
          },
          {
            text:
              `Logs de acesso e auditoria: ${retencaoLogAnos} anos (Marco Civil da Internet, art. 15).`,
            style: 'bodyText',
          },
        ],
        margin: [0, 1, 0, 2],
      },

      // ─── 6. ALTERNATIVA E DIREITOS ──────────────────────────────
      { text: '6. Alternativa operacional e direitos', style: 'sectionTitle' },
      {
        text:
          `Na hipotese de impossibilidade tecnica ou recusa juridicamente cabivel, sera adotado procedimento alternativo de identificacao, sem prejuizo do atendimento.`,
        style: 'bodyText',
      },
      {
        text:
          `O trabalhador podera solicitar ao Controlador, pelo canal de privacidade (${contatoDpo}): confirmacao de tratamento, acesso, correcao, anonimizacao/eliminacao, portabilidade, informacao sobre compartilhamento e oposicao ao tratamento, observadas as hipoteses de obrigacao legal que limitem o direito de oposicao (arts. 17-22, LGPD).`,
        style: 'bodyText',
      },

      // ─── 7. CIENCIA E ACEITE ────────────────────────────────────
      { text: '7. Ciencia e registro de aceite', style: 'acceptTitle' },
      {
        text:
          `Ao prosseguir com este fluxo, o trabalhador declara ter recebido informacao clara sobre o uso da autenticacao ${metodo}, sua finalidade, limites, medidas de protecao, alternativa operacional, prazo de validade e direitos como titular de dados pessoais.`,
        style: 'bodyText',
      },
      {
        text: 'Este registro compoe evidencia documental e operacional do atendimento realizado.',
        style: 'bodyText',
        margin: [0, 0, 0, 6],
      },

      // ─── QR CODE + EVIDENCIAS (CONDITIONAL) ──────────────────────
      ...(relatorioEvidenciasUrl
        ? [
            { text: 'Validacao das evidencias', style: 'sectionTitle' },
            {
              columns: [
                {
                  width: 140,
                  stack: [
                    {
                      qr: relatorioEvidenciasUrl,
                      fit: 130,
                      alignment: 'center',
                      margin: [0, 0, 0, 4],
                    },
                    {
                      text: 'Relatorio de evidencias',
                      alignment: 'center',
                      fontSize: 7,
                      color: PRIMARY,
                      bold: true,
                    },
                  ],
                },
                {
                  width: '*',
                  stack: [
                    {
                      text: `Escaneie o QR code para visualizar o relatorio de evidencias desta operacao. O codigo de rastreio identifica o documento no sistema.`,
                      style: 'bodyText',
                      margin: [0, 2, 0, 6],
                    },
                    { text: `Rastreio: ${input.requestId}`, fontSize: 7, color: MUTED },
                    { text: `Identificador: ${documentHash.slice(0, 16)}`, fontSize: 7, color: MUTED },
                    { text: `Versao: ${input.versaoTermo}`, fontSize: 7, color: MUTED },
                  ],
                },
              ],
              columnGap: 16,
              margin: [0, 0, 0, 8],
            },
          ]
        : []),
    ] as any,

    // ─── FOOTER ──────────────────────────────────────────────────
    footer: (): any => ({
      margin: [30, 2, 30, 8],
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 535,
              y2: 0,
              lineWidth: 0.5,
              lineColor: BORDER,
            },
          ],
          margin: [0, 1, 0, 0],
        },
        {
          text: 'Centro Médico de Saúde Ocupacional',
          style: 'ft',
          alignment: 'center',
          margin: [0, 4, 0, 0],
        },
      ],
    }),

    // ─── STYLES ──────────────────────────────────────────────────
    styles: {
      brandTitle: { fontSize: 14, bold: true, color: PRIMARY },
      docTitle: {
        fontSize: 10,
        bold: true,
        color: PRIMARY,
        alignment: 'center',
      },
      sectionTitle: {
        fontSize: 8,
        bold: true,
        color: SECTION,
        margin: [0, 4, 0, 1],
      },
      sectionTitleSmall: {
        fontSize: 7.5,
        bold: true,
        color: SECTION,
        margin: [0, 3, 0, 1],
      },
      acceptTitle: {
        fontSize: 8,
        bold: true,
        color: PRIMARY,
        margin: [0, 5, 0, 1],
      },
      bodyText: {
        fontSize: 7.5,
        lineHeight: 1.2,
        color: LIGHT_TEXT,
        margin: [0, 0, 0, 1],
      },
      cellLabel: { fontSize: 6.5, bold: true, color: PRIMARY },
      cellValue: { fontSize: 7.5, color: LIGHT_TEXT },
      ft: { fontSize: 6.5, color: MUTED, lineHeight: 1.4 },
    },

    // ─── INFO ────────────────────────────────────────────────────
    info: {
      title: `Termo ${metodoLabel(input)} - ${input.funcionario.nome} - ${input.empresa.nome}`,
      author: operador,
      subject: `requestId: ${input.requestId} | versao: ${input.versaoTermo} | hash: ${documentHash}`,
      keywords: isFacial(input)
        ? `facial,lgpd,termo,bry_sign`
        : `biometria,lgpd,termo,${(input.biometria?.templateVersion) || ''}`,
    },
    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.15,
    },
  };
}
