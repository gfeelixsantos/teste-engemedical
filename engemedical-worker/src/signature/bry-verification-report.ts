import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { BryVerificationResponse } from './bry-verification.types';
import * as fs from 'fs';
import * as path from 'path';

export interface BuildBryVerificationReportPdfInput {
  schedulingId: string;
  pacienteNome: string;
  prontuario: string;
  verification: BryVerificationResponse;
}

export async function buildBryVerificationReportPdf(
  input: BuildBryVerificationReportPdfInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // Cores Corporativas (Azul BRy / CMSO)
  const primaryColor = rgb(0.0, 0.33, 0.62); // #00549E
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.4, 0.4, 0.4);

  // --- Cabecalho ---
  // Tarja Azul
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: primaryColor,
  });

  // Tenta incorporar a logo se existir
  try {
    const logoPath = path.join(__dirname, 'bry-logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBuffer);
      const logoDims = logoImage.scale(0.35); // escala ideal pra o header

      page.drawImage(logoImage, {
        x: width - logoDims.width - 40,
        y: height - 60,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
  } catch (err) {
    console.error('Falha ao adicionar logo no relatório:', err);
  }

  page.drawText('RELATORIO DE CONFORMIDADE DIGITAL', {
    x: 40,
    y: height - 55,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Provedor da Verificacao: BRY TECNOLOGIA (BRYKMS)', {
    x: 40,
    y: height - 75,
    size: 10,
    font: font,
    color: rgb(0.9, 0.9, 0.9),
  });

  // --- Secao: Dados do Documento e Paciente ---
  let cursorY = height - 140;

  page.drawText('DADOS DO DOCUMENTO E TITULAR', {
    x: 40,
    y: cursorY,
    size: 14,
    font: fontBold,
    color: primaryColor,
  });
  cursorY -= 8;
  page.drawLine({
    start: { x: 40, y: cursorY },
    end: { x: width - 40, y: cursorY },
    thickness: 1,
    color: primaryColor,
  });
  cursorY -= 25;

  const drawRow = (label: string, value: string, yPos: number) => {
    page.drawText(label, {
      x: 40,
      y: yPos,
      size: 10,
      font: fontBold,
      color: darkGray,
    });
    page.drawText(value, {
      x: 200,
      y: yPos,
      size: 10,
      font: font,
      color: darkGray,
    });
  };

  drawRow('ID do Agendamento:', input.schedulingId, cursorY);
  cursorY -= 20;
  drawRow('Nome do Titular:', input.pacienteNome, cursorY);
  cursorY -= 20;
  drawRow('Prontuário:', input.prontuario || 'N/A', cursorY);
  cursorY -= 20;
  drawRow(
    'Nome do Arquivo Original:',
    'Em anexo e validado neste fluxo.',
    cursorY,
  );
  cursorY -= 20;
  drawRow(
    'Momento da Geração:',
    new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    cursorY,
  );

  cursorY -= 40;

  // --- Secao: Validade Juridica (PKI e Assinatura) ---
  page.drawText('INFORMACOES DE VALIDADE JURIDICA', {
    x: 40,
    y: cursorY,
    size: 14,
    font: fontBold,
    color: primaryColor,
  });
  cursorY -= 8;
  page.drawLine({
    start: { x: 40, y: cursorY },
    end: { x: width - 40, y: cursorY },
    thickness: 1,
    color: primaryColor,
  });
  cursorY -= 25;

  // Logica de status (verde se ok, vermelho se falha - embora sso seja gerado p/ casos válidos primariamente)
  const isStatusOk = ['VALID', 'VALID_WITH_ALERT'].includes(
    input.verification.generalStatus,
  );
  const statusColor = isStatusOk ? rgb(0.1, 0.6, 0.1) : rgb(0.8, 0.1, 0.1);

  const translateStatus = (status: string) => {
    if (status === 'VALID') return 'VÁLIDO';
    if (status === 'VALID_WITH_ALERT') return 'VÁLIDO COM ALERTAS';
    if (status === 'INVALID') return 'INVÁLIDO';
    return status;
  };

  page.drawText('Status Geral de Conformidade:', {
    x: 40,
    y: cursorY,
    size: 10,
    font: fontBold,
    color: darkGray,
  });
  page.drawText(translateStatus(input.verification.generalStatus), {
    x: 220,
    y: cursorY,
    size: 11,
    font: fontBold,
    color: statusColor,
  });

  cursorY -= 25;

  // Em v1 signatures eh array, mas tambem temos a propriedade signatureStatus direto. A API nova costuma usar signatureStatus como array.
  const sigDataArray = Array.isArray(input.verification.signatureStatus)
    ? input.verification.signatureStatus
    : input.verification.signatures || [input.verification.signatureStatus];

  const sSig = sigDataArray && sigDataArray.length > 0 ? sigDataArray[0] : null;

  const verRef = sSig?.verificationReference || 'N/D';
  const signAlgo = sSig?.signatureAlgorithm || sSig?.algorithm || 'N/D';
  const hashAlgo = sSig?.hashAlgorithm || 'N/D';
  const format =
    sSig?.signatureFormat || input.verification.signatureFormat || 'N/D';
  const signTime = sSig?.signingTime || 'N/D';
  const nonce = input.verification.nonce || 'N/D';

  const pkiLines = [
    `Transação de Verificação (Nonce): ${nonce}`,
    `Referência da Verificação: ${verRef}`,
    `Formato da Assinatura: ${format}`,
    `Algoritmo de Assinatura: ${signAlgo}`,
    `Algoritmo de Hash: ${hashAlgo}`,
    `Carimbo de Tempo: ${signTime}`,
  ];

  pkiLines.forEach((line) => {
    page.drawText(line, {
      x: 40,
      y: cursorY,
      size: 9,
      font: font,
      color: lightGray,
    });
    cursorY -= 15;
  });

  cursorY -= 15;

  // Certificados (Chain)
  const certificatesSource = sSig?.chainStatus?.certificateStatusList;
  const chainList = Array.isArray(certificatesSource) ? certificatesSource : [];

  if (chainList.length > 0) {
    page.drawText('Trilha de Certificação:', {
      x: 40,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: darkGray,
    });
    cursorY -= 15;
    chainList.forEach((cert: any, i: number) => {
      const cStatus = translateStatus(cert.status || 'N/D');
      page.drawText(`- Elemento [${i}]: Status = ${cStatus}`, {
        x: 50,
        y: cursorY,
        size: 9,
        font: font,
        color: lightGray,
      });
      cursorY -= 12;
    });
  }

  // --- Rodape ---
  const footerText =
    'Este documento atesta que o arquivo possui assinatura digital compativel com o padrao PAdES (PDF Advanced Electronic Signatures) auditada e verificada usando infraestrutura BRY TECNOLOGIA.';
  page.drawText(footerText, {
    x: 40,
    y: 50,
    size: 7,
    font: font,
    color: lightGray,
    maxWidth: width - 80,
    lineHeight: 9,
  });

  return pdfDoc.save({ useObjectStreams: false });
}
