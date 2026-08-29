require('dotenv').config({ path: '../../.env' });
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { buildBryVerificationReportPdf } = require('../signature/bry-verification-report');
const { buildOfficialAsoStampText } = require('../signature/aso-stamp-text');

async function getQrCodeBuffer(targetUrl) {
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetUrl)}`;
  const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

async function applyOfficialOverlay(pdfBuffer, validationUrl, metadata, schedulingId) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const firstPage = pdfDoc.getPages()[0];
  const { width } = firstPage.getSize();

  const qrImage = await pdfDoc.embedPng(await getQrCodeBuffer(validationUrl));

  const marginX = 40;
  const qrSize = 46;
  const qrY = 29;
  const textX = marginX + qrSize + 15;
  const textWidth = width - marginX * 2 - qrSize - 15;
  const baselineY = qrY + qrSize;
  const stampText = buildOfficialAsoStampText(metadata, schedulingId);

  firstPage.drawImage(qrImage, { x: marginX, y: qrY, width: qrSize, height: qrSize });
  firstPage.drawText(stampText.title, { x: textX, y: baselineY - 2, size: 7.4, font: fontBold, color: rgb(0.06, 0.06, 0.06) });
  firstPage.drawText(stampText.disclaimer, { x: textX, y: baselineY - 12, size: 5.5, font: fontRegular, maxWidth: textWidth, lineHeight: 7, color: rgb(0.4, 0.4, 0.4) });
  firstPage.drawText(stampText.professionalInfo, { x: textX, y: baselineY - 26, size: 6.6, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  firstPage.drawText(stampText.credentialsInfo, { x: textX, y: baselineY - 36, size: 6, font: fontBold, color: rgb(0.28, 0.28, 0.28) });
  firstPage.drawText(stampText.referenceInfo, { x: textX, y: baselineY - 47, size: 5, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

  return Buffer.from(await pdfDoc.save());
}

async function exportLayouts() {
  const artifactsDir = 'c:\\Users\\FELIX\\.gemini\\antigravity\\brain\\6ce3ce37-ff58-404e-8f9e-594553a15855';
  
  // Dados do paciente HEVELYN
  const pdfUrl = 'https://cmsodocs.blob.core.windows.net/documents/aso/2026/04/351129/351129-95-5-29042026/ASO_351129_HEVELYN_DAIANY_VIANA_DE_ALMEIDA_DEMISSIONAL_20260429_24VG.pdf';
  const pdfBaseResp = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
  const pdfBaseBuffer = Buffer.from(pdfBaseResp.data);

  const schedulingId = '351129-95-5-29042026';
  const pacienteNome = 'HEVELYN DAIANY VIANA DE ALMEIDA';
  
  const verification = {
    generalStatus: 'VALID',
    signatureFormat: 'PADES',
    signatureStatus: {
      fileName: 'ASO_HEVELYN.pdf',
      signatureAlgorithm: 'SHA256_WITH_RSA_ENCRYPTION',
    }
  };

  const reportBytes = await buildBryVerificationReportPdf({
    schedulingId,
    pacienteNome,
    prontuario: '351129-95-5-29042026',
    verification
  });

  const urlFalsaDoBlob = 'https://cmsodocs.blob.core.windows.net/documents/validacao/2026/351129-95-5-29042026-BRy.pdf';
  
  const asoCarimbadoBuffer = await applyOfficialOverlay(
    pdfBaseBuffer, 
    urlFalsaDoBlob, 
    {
      professionalName: 'JULIO CESAR BATISTA DA SILVEIRA',
      crm: '123456',
      uf: 'SP',
      cpf: '111.222.333-44',
      prontuario: '351129-95-5-29042026'
    },
    schedulingId
  );

  fs.writeFileSync(path.join(artifactsDir, 'Relatorio_Verificacao_BRy.pdf'), reportBytes);
  fs.writeFileSync(path.join(artifactsDir, 'ASO_Carimbado_Mock.pdf'), asoCarimbadoBuffer);
  
  console.log('Arquivos gerados com sucesso no diretório do artefato!');
}

exportLayouts().catch(console.error);
