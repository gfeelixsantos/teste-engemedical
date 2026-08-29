const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const { BlobServiceClient } = require('@azure/storage-blob');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

function formatCPF(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return 'N/D';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (const arg of args) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    parsed[key] = value || true;
  }

  return parsed;
}

function getBlobLocationFromUrl(url) {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  if (pathParts.length < 2) {
    throw new Error(`URL do blob invalida: ${url}`);
  }

  return {
    container: pathParts[0],
    blobName: decodeURIComponent(pathParts.slice(1).join('/')),
  };
}

function getValidationTargetUrl(validationUrl) {
  return String(validationUrl || '').trim() || 'https://validar.iti.gov.br/';
}

async function getQrCodeBuffer(targetUrl) {
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    getValidationTargetUrl(targetUrl),
  )}`;
  const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

async function resolveProfessional(usersCollection, scheduling, exameClinico) {
  const asoProfessional = scheduling?.ASOINFO?.professional || null;
  const professionalCode = String(
    exameClinico?.codigoProfissional ||
      asoProfessional?.codigo ||
      scheduling?.ASOINFO?.codigoProfissional ||
      '',
  ).trim();
  const professionalNameHint = String(
    asoProfessional?.nome ||
      exameClinico?.profissional ||
      scheduling?.MEDICO ||
      '',
  ).trim();

  const filters = [];
  if (professionalCode) filters.push({ codigo: professionalCode });
  if (professionalNameHint) filters.push({ nome: professionalNameHint });

  let dbUser = null;
  if (filters.length > 0) {
    try {
      dbUser = await usersCollection.findOne({ $or: filters });
    } catch (_) {
      dbUser = null;
    }
  }

  const professionalName =
    asoProfessional?.nome ||
    dbUser?.nome ||
    scheduling?.MEDICO ||
    professionalNameHint ||
    'N/D';
  const crm =
    asoProfessional?.conselho ||
    dbUser?.conselho ||
    dbUser?.crm ||
    dbUser?.registro ||
    scheduling?.MEDICOCRM ||
    scheduling?.MEDICOEXAMINADORCRM ||
    scheduling?.CRM ||
    '';
  const uf =
    asoProfessional?.ufconselho ||
    dbUser?.ufconselho ||
    dbUser?.crm_uf ||
    dbUser?.uf ||
    scheduling?.MEDICOUF ||
    scheduling?.MEDICOEXAMINADORUF ||
    scheduling?.UF ||
    '';
  const cpf =
    asoProfessional?.cpf ||
    dbUser?.cpf ||
    dbUser?.documento ||
    scheduling?.MEDICOCPF ||
    scheduling?.MEDICOEXAMINADORCPF ||
    scheduling?.CPF ||
    '';

  return {
    isComplete: Boolean(professionalName && crm && cpf),
    professionalName,
    crm,
    uf,
    cpf,
    professionalCode,
  };
}

async function pickScheduling(db, collectionName, explicitId) {
  const schedulings = db.collection(collectionName);
  const users = db.collection('users');

  if (explicitId) {
    const objectId = new ObjectId(String(explicitId));
    const doc = await schedulings.findOne({ _id: objectId });
    if (!doc) throw new Error(`Scheduling ${explicitId} nao encontrado.`);

    const exameClinico = (doc.EXAMES || []).find(
      (ex) =>
        ex?.nomeExame?.toUpperCase().includes('CLIN') ||
        ex?.grupo?.toUpperCase().includes('CLIN'),
    );
    const professional = await resolveProfessional(users, doc, exameClinico);

    return { scheduling: doc, exameClinico, professional };
  }

  const candidates = await schedulings
    .find({
      'ASOINFO.url': { $exists: true, $ne: null },
      CODIGOPRONTUARIO: { $exists: true, $ne: null },
    })
    .sort({ _id: -1 })
    .limit(50)
    .toArray();

  for (const doc of candidates) {
    const exameClinico = (doc.EXAMES || []).find(
      (ex) =>
        ex?.nomeExame?.toUpperCase().includes('CLIN') ||
        ex?.grupo?.toUpperCase().includes('CLIN'),
    );
    const professional = await resolveProfessional(users, doc, exameClinico);

    if (professional.isComplete) {
      return { scheduling: doc, exameClinico, professional };
    }
  }

  if (candidates.length === 0) {
    throw new Error('Nenhum ASO com URL foi encontrado no banco.');
  }

  const fallback = candidates[0];
  const exameClinico = (fallback.EXAMES || []).find(
    (ex) =>
      ex?.nomeExame?.toUpperCase().includes('CLIN') ||
      ex?.grupo?.toUpperCase().includes('CLIN'),
  );
  const professional = await resolveProfessional(users, fallback, exameClinico);
  return { scheduling: fallback, exameClinico, professional };
}

async function applyOfficialOverlay(pdfBuffer, validationUrl, metadata, schedulingId) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const page = pdfDoc.getPages()[0];
  const { width } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const qrBuffer = await getQrCodeBuffer(validationUrl);
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  const marginX = 40;
  const qrSize = 46;
  const qrY = 29;
  const textX = marginX + qrSize + 15;
  const textWidth = width - marginX * 2 - qrSize - 15;
  const baselineY = qrY + qrSize;
  const formattedCpf = formatCPF(metadata.cpf);
  const crmInfo = metadata.crm
    ? `${metadata.crm}${metadata.uf ? `-${metadata.uf}` : ''}`
    : 'N/D';

  page.drawImage(qrImage, {
    x: marginX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  page.drawText('ASSINADO DIGITALMENTE', {
    x: textX,
    y: baselineY - 2,
    size: 7.4,
    font: fontBold,
    color: rgb(0.06, 0.06, 0.06),
  });

  page.drawText(
    'Assinatura eletrônica com validade jurídica, nos termos da\nLei n° 14.063/2020 e da Portaria MTP n° 671/2021.',
    {
      x: textX,
      y: baselineY - 12,
      size: 5.5,
      font: fontRegular,
      maxWidth: textWidth,
      lineHeight: 7,
      color: rgb(0.4, 0.4, 0.4),
    },
  );

  page.drawText(`Médico Examinador: ${metadata.professionalName || 'N/D'}`, {
    x: textX,
    y: baselineY - 26,
    size: 6.6,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`CRM: ${crmInfo} | CPF: ${formattedCpf}`, {
    x: textX,
    y: baselineY - 36,
    size: 6,
    font: fontBold,
    color: rgb(0.28, 0.28, 0.28),
  });

  page.drawText(
    `ID: ${schedulingId} | Prontuário: ${metadata.prontuario || 'N/D'}`,
    {
      x: textX,
      y: baselineY - 47,
      size: 5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  const savedPdf = await pdfDoc.save();
  return Buffer.from(savedPdf);
}

async function main() {
  const args = parseArgs();
  const mongoUrl = process.env.MONGO_URL;
  const mongoDatabase = process.env.MONGO_DATABASE;
  const mongoCollection = process.env.MONGO_COLLECTION;
  const azureConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!mongoUrl || !mongoDatabase || !mongoCollection) {
    throw new Error('Variaveis MONGO_URL, MONGO_DATABASE ou MONGO_COLLECTION ausentes.');
  }
  if (!azureConnectionString) {
    throw new Error('Variavel AZURE_STORAGE_CONNECTION_STRING ausente.');
  }

  const client = new MongoClient(mongoUrl, {
    serverApi: ServerApiVersion.v1,
    ssl: true,
  });

  try {
    await client.connect();
    const db = client.db(mongoDatabase);
    const { scheduling, professional } = await pickScheduling(
      db,
      mongoCollection,
      args.schedulingId,
    );

    const asoUrl = scheduling?.ASOINFO?.url || scheduling?.ASOINFO?.asoUrl;
    const pdfPath = args.pdfPath ? path.resolve(String(args.pdfPath)) : null;

    let originalPdf;
    if (pdfPath) {
      originalPdf = fs.readFileSync(pdfPath);
    } else {
      if (!asoUrl) {
        throw new Error('O atendimento selecionado nao possui ASOINFO.url.');
      }

      const { container, blobName } = getBlobLocationFromUrl(asoUrl);
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(azureConnectionString);
      const blobClient = blobServiceClient
        .getContainerClient(container)
        .getBlobClient(blobName);

      originalPdf = await blobClient.downloadToBuffer();
    }

    const validationTargetUrl = getValidationTargetUrl(
      scheduling?.ASOINFO?.validacao || scheduling?.ASOINFO?.validacaoUrl || '',
    );
    const previewPdf = await applyOfficialOverlay(
      originalPdf,
      validationTargetUrl,
      {
        professionalName: professional.professionalName,
        crm: professional.crm,
        uf: professional.uf,
        cpf: professional.cpf,
        prontuario: scheduling.CODIGOPRONTUARIO || 'N/D',
      },
      String(scheduling._id),
    );

    const outputDir = path.join(process.cwd(), 'temp_pdfs');
    fs.mkdirSync(outputDir, { recursive: true });
    const safeName = String(scheduling.NOME || 'preview')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60);
    const outputPath = args.outputPath
      ? path.resolve(String(args.outputPath))
      : path.join(
          outputDir,
          `preview_aso_${safeName}_${scheduling.CODIGOPRONTUARIO || scheduling._id}.pdf`,
        );
    fs.writeFileSync(outputPath, previewPdf);

    console.log(
      JSON.stringify(
        {
          ok: true,
          nome: scheduling.NOME,
          prontuario: scheduling.CODIGOPRONTUARIO,
          schedulingId: String(scheduling._id),
          professionalName: professional.professionalName,
          crm: professional.crm || null,
          uf: professional.uf || null,
          hasCpf: Boolean(professional.cpf),
          sourceUrl: asoUrl || null,
          validationTargetUrl,
          pdfPath: pdfPath || null,
          outputPath,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[ASO_PREVIEW_ERROR]', error);
  process.exit(1);
});
