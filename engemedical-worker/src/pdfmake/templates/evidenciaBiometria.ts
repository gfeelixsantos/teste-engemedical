import * as pdfMake from 'pdfmake/build/pdfmake';
import { TermoConsentimentoInput, formatDataHora } from '../termo-consentimento.types';
import { getImageBase64 } from 'src/utils/util';

import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

const PRIMARY = '#114E34';
const LIGHT_TEXT = '#333333';
const MUTED = '#666666';
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

export async function gerarEvidenciaBiometria(
  input: TermoConsentimentoInput,
  documentHash: string,
): Promise<Buffer> {
  const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';
  const logoBase64 = await getImageBase64(logoUrl);
  const operador =
    input.operador?.nome || input.operador?.codigo || 'N/D';
  const dataHora = formatDataHora(new Date().toISOString());
  const dedoLabel = input.biometria ? formatDedoLabel(input.biometria.dedo) : 'N/D';

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, 25, 30, 40],
    content: [
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
                  { text: 'CMS OCUPACIONAL', fontSize: 14, bold: true, color: PRIMARY },
                ],
          },
          {
            width: '*',
            stack: [
              {
                text: 'Relatorio de Evidencias',
                alignment: 'right' as const,
                fontSize: 10,
                bold: true,
                color: PRIMARY,
              },
              {
                text: dataHora,
                alignment: 'right' as const,
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
            lineWidth: 1.5,
            lineColor: PRIMARY,
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        text: 'Relatorio de Evidencias - Autenticacao Biometrica',
        fontSize: 13,
        bold: true,
        color: PRIMARY,
        alignment: 'center' as const,
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            [
              { text: 'REQUEST ID', fontSize: 7, bold: true, color: PRIMARY, fillColor: '#F0F7F3' },
              { text: input.requestId, fontSize: 8, color: LIGHT_TEXT, fillColor: '#F0F7F3' },
            ],
            [
              { text: 'HASH DO DOCUMENTO', fontSize: 7, bold: true, color: PRIMARY },
              { text: documentHash, fontSize: 7, color: MUTED },
            ],
            [
              { text: 'TRABALHADOR(A)', fontSize: 7, bold: true, color: PRIMARY, fillColor: '#F0F7F3' },
              { text: `${input.funcionario.nome}${input.funcionario.cpfMascarado ? ` | ${input.funcionario.cpfMascarado}` : ''}`, fontSize: 8, color: LIGHT_TEXT, fillColor: '#F0F7F3' },
            ],
            [
              { text: 'EMPRESA', fontSize: 7, bold: true, color: PRIMARY },
              { text: `${input.empresa.nome}${input.empresa.cnpj ? ` (${input.empresa.cnpj})` : ''}`, fontSize: 8, color: LIGHT_TEXT },
            ],
            [
              { text: 'DEDO CAPTURADO', fontSize: 7, bold: true, color: PRIMARY, fillColor: '#F0F7F3' },
              { text: dedoLabel, fontSize: 8, color: LIGHT_TEXT, fillColor: '#F0F7F3' },
            ],
            [
              { text: 'TEMPLATE', fontSize: 7, bold: true, color: PRIMARY },
              { text: `${input.biometria?.templateVersion || 'N/D'} | ${input.biometria?.templateStorage || 'N/D'}`, fontSize: 8, color: LIGHT_TEXT },
            ],
            [
              { text: 'DATA/HORA', fontSize: 7, bold: true, color: PRIMARY, fillColor: '#F0F7F3' },
              { text: formatDataHora(input.lgpd.cienciaRegistradaEm), fontSize: 8, color: LIGHT_TEXT, fillColor: '#F0F7F3' },
            ],
            [
              { text: 'OPERADOR', fontSize: 7, bold: true, color: PRIMARY },
              { text: operador, fontSize: 8, color: LIGHT_TEXT },
            ],
            [
              { text: 'UNIDADE', fontSize: 7, bold: true, color: PRIMARY, fillColor: '#F0F7F3' },
              { text: input.atendimento.unidade, fontSize: 8, color: LIGHT_TEXT, fillColor: '#F0F7F3' },
            ],
            [
              { text: 'BASE LEGAL', fontSize: 7, bold: true, color: PRIMARY },
              { text: input.lgpd.baseLegalTexto, fontSize: 7, color: MUTED },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => BORDER,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      ...(input.biometria?.digitalDocumentalPreviewBase64
        ? [
            { text: 'Imagem documental da captura', fontSize: 9, bold: true, color: PRIMARY, margin: [0, 0, 0, 8] as [number, number, number, number] },
            {
              image: input.biometria.digitalDocumentalPreviewBase64,
              width: 95,
              fit: [95, 95] as [number, number],
              alignment: 'center' as const,
              margin: [0, 0, 0, 16] as [number, number, number, number],
            },
          ]
        : []),
      {
        text: 'Este relatorio de evidencias e gerado automaticamente pelo sistema CMSO360 e constitui registro documental da operacao de autenticacao biometrica realizada.',
        fontSize: 7.5,
        color: MUTED,
        italics: true,
        alignment: 'center' as const,
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      {
        text: `Controlador: ${input.clinica.nome}${input.clinica.cnpj ? ` | CNPJ ${input.clinica.cnpj}` : ''}`,
        fontSize: 6.5,
        color: MUTED,
        alignment: 'center' as const,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
    ],
    styles: {},
    info: {
      title: `Relatorio de Evidencias - ${input.requestId}`,
      author: 'CMSO360',
      subject: `requestId: ${input.requestId} | hash: ${documentHash}`,
    },
    defaultStyle: {
      fontSize: 10,
    },
  };

  const pdfDoc = pdfMake.createPdf(docDefinition as any);
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.getBuffer((buf) => {
      if (buf) resolve(Buffer.from(buf));
      else reject(new Error('Falha ao gerar buffer do relatorio de evidencias'));
    });
  });
}
