/**
 * Saneamento de ANEXOS.Content com base64 legado.
 *
 * Escopo:
 * - filtra apenas agendamentos de hoje
 * - identifica anexos com base64 inline
 * - no modo --apply:
 *   - se StoragePath existir, remove o payload inline com Content = "uploaded"
 *   - se StoragePath nao existir, faz upload para Blob e grava o StoragePath
 *
 * Uso:
 *   npx ts-node scripts/sanear-anexos-content-legado.ts            # dry-run (padrao)
 *   npx ts-node scripts/sanear-anexos-content-legado.ts --dry-run   # dry-run explicito
 *   npx ts-node scripts/sanear-anexos-content-legado.ts --apply     # aplica alteracoes
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { BlobServiceClient } from '@azure/storage-blob';
import { PDFDocument } from 'pdf-lib';
import {
  generateBlobFileName,
  generateBlobPath,
} from '../src/utils/blob-naming.util';

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');
const isFutureScope = args.includes('--future');

const CONHECIDOS = new Set(['uploaded', 'anexo_agendamento']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

function getTodayBR(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}

function isLikelyBase64Content(content: unknown): boolean {
  if (typeof content !== 'string') return false;
  if (CONHECIDOS.has(content)) return false;

  const normalized = content
    .trim()
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');
  if (normalized.length < 100) return false;

  return /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
}

function decodeBase64(content: string): Buffer {
  const normalized = content
    .trim()
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');
  return Buffer.from(normalized, 'base64');
}

function isImageAttachment(anexo: any): boolean {
  const mime = String(anexo?.Type || '').toLowerCase();
  if (IMAGE_MIME_TYPES.has(mime)) return true;

  const name = String(anexo?.Name || '').toLowerCase();
  return /\.(jpe?g|png)$/i.test(name);
}

function normalizeDocumentType(name?: string): string {
  const raw = String(name || 'ANEXO').replace(/\.[^/.]+$/, '');
  return raw.trim() || 'ANEXO';
}

async function convertImageToPdf(imageBuffer: Buffer, mimeType: string) {
  const pdfDoc = await PDFDocument.create();
  const image =
    mimeType === 'image/jpeg'
      ? await pdfDoc.embedJpg(imageBuffer)
      : await pdfDoc.embedPng(imageBuffer);

  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function main() {
  const MONGO_URL =
    process.env.MONGO_URL ||
    'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
  const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';
  const AZURE_CONNECTION_STRING =
    process.env.AZURE_CONNECTION_STRING_BLOB ||
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
    process.env.AZURE_CONNECTION_STRING ||
    '';
  const AZURE_CONTAINER = process.env.AZURE_BLOB_CONTAINER_NAME || 'documents';
  const todayBR = getTodayBR();

  console.log('');
  console.log('============================================================');
  console.log('  SANEAMENTO DE ANEXOS LEGADOS');
  console.log(`  Data alvo: ${isFutureScope ? 'ATENDIMENTOS FUTUROS' : todayBR}`);
  console.log(`  Modo: ${isDryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log('============================================================');
  console.log(`  Banco: ${MONGO_DATABASE}.${MONGO_COLLECTION}`);
  console.log(`  Container: ${AZURE_CONTAINER}`);
  console.log('');

  const client = new MongoClient(MONGO_URL, {
    serverApi: ServerApiVersion.v1,
    ssl: true,
  });

  await client.connect();
  console.log('  Conectado ao MongoDB.');

  const blobServiceClient = AZURE_CONNECTION_STRING
    ? BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING)
    : null;
  const containerClient = blobServiceClient
    ? blobServiceClient.getContainerClient(AZURE_CONTAINER)
    : null;

  if (!isDryRun && !containerClient) {
    throw new Error(
      'AZURE_CONNECTION_STRING_BLOB/AZURE_STORAGE_CONNECTION_STRING/AZURE_CONNECTION_STRING nao configurada.',
    );
  }

  if (containerClient) {
    await containerClient.createIfNotExists();
  }

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    const query = isFutureScope
      ? {
          DATAAGENDAMENTO_DATE: { $gt: new Date() },
          ANEXOS: { $exists: true, $ne: null, $not: { $size: 0 } },
        }
      : {
          DATAAGENDAMENTO: todayBR,
          ANEXOS: { $exists: true, $ne: null, $not: { $size: 0 } },
        };

    const docs = await collection
      .find(query, {
        projection: {
          NOME: 1,
          CODIGOEMPRESA: 1,
          CODIGOPRONTUARIO: 1,
          DATAAGENDAMENTO: 1,
          DATAAGENDAMENTO_DATE: 1,
          ANEXOS: 1,
        },
      })
      .toArray();

    console.log(`  Documentos encontrados para hoje: ${docs.length}`);

    let docsAfetados = 0;
    let anexosInline = 0;
    let anexosUploadNeeded = 0;
    let anexosSomenteLimpeza = 0;

    for (const doc of docs) {
      const anexos = Array.isArray(doc.ANEXOS) ? doc.ANEXOS : [];
      const candidatos = anexos.filter((anexo: any) =>
        isLikelyBase64Content(anexo?.Content),
      );

      if (candidatos.length === 0) {
        continue;
      }

      docsAfetados++;
      console.log('');
      console.log(
        `  Documento: ${String(doc._id)} | ${doc.NOME || '(sem nome)'} | prontuario=${doc.CODIGOPRONTUARIO || 'N/A'}`,
      );

      const novosAnexos = [...anexos];
      let docModificado = false;

      for (let index = 0; index < novosAnexos.length; index++) {
        const anexo = novosAnexos[index];
        if (!isLikelyBase64Content(anexo?.Content)) {
          continue;
        }

        anexosInline++;
        const temStoragePath = Boolean(String(anexo?.StoragePath || '').trim());
        const base64Content = String(anexo.Content || '');
        const buffer = decodeBase64(base64Content);
        const nomeOriginal = String(anexo?.Name || 'anexo.pdf');
        const dataReferencia = new Date();
        const docType = normalizeDocumentType(nomeOriginal);

        console.log(
          `    - ${nomeOriginal} | StoragePath=${temStoragePath ? 'sim' : 'nao'} | size=${buffer.length} bytes`,
        );

        if (temStoragePath) {
          anexosSomenteLimpeza++;
          novosAnexos[index] = {
            ...anexo,
            Content: 'uploaded',
          };
          docModificado = true;
          continue;
        }

        anexosUploadNeeded++;

        if (isDryRun) {
          console.log('      dry-run: upload seria executado');
          continue;
        }

        if (!containerClient) {
          throw new Error('Container Azure indisponivel no modo apply.');
        }

        const isImage = isImageAttachment(anexo);
        const uploadBuffer = isImage
          ? await convertImageToPdf(buffer, String(anexo?.Type || 'image/png'))
          : buffer;
        const uploadContentType = isImage
          ? 'application/pdf'
          : String(anexo?.Type || 'application/pdf') || 'application/pdf';

        const originalNameForBlob = isImage
          ? nomeOriginal.replace(/\.(jpe?g|png)$/i, '.pdf')
          : nomeOriginal;

        const fileName = generateBlobFileName({
          type: 'ATTACHMENT',
          empresaCode: String(doc.CODIGOEMPRESA || 'SEM_EMPRESA'),
          funcionarioName: String(doc.NOME || 'SEM_NOME'),
          documentType: docType,
          date: dataReferencia,
        });

        const blobPath = generateBlobPath({
          fileType: 'anexos',
          empresaCode: String(doc.CODIGOEMPRESA || 'SEM_EMPRESA'),
          prontuario: String(doc.CODIGOPRONTUARIO || 'SEM_PRONTUARIO'),
          fileName,
          date: dataReferencia,
        });

        const blobClient = containerClient.getBlockBlobClient(blobPath);
        await blobClient.uploadData(uploadBuffer, {
          blobHTTPHeaders: {
            blobContentType: uploadContentType,
          },
        });

        novosAnexos[index] = {
          ...anexo,
          Name: originalNameForBlob,
          Content: 'uploaded',
          StoragePath: blobClient.url,
          Type: uploadContentType,
          UploadedAt: anexo?.UploadedAt || new Date(),
        };

        docModificado = true;
        console.log(`      uploaded: ${blobClient.url}`);
      }

      if (docModificado && !isDryRun) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { ANEXOS: novosAnexos } },
        );
        console.log('    -> documento atualizado');
      }
    }

    console.log('');
    console.log('================ RESUMO ================');
    console.log(`  Documentos afetados: ${docsAfetados}`);
    console.log(`  Anexos inline base64: ${anexosInline}`);
    console.log(`  Anexos com StoragePath apenas para limpar: ${anexosSomenteLimpeza}`);
    console.log(`  Anexos sem StoragePath que precisariam upload: ${anexosUploadNeeded}`);
    console.log('========================================');

    if (isDryRun) {
      console.log('');
      console.log('Dry-run concluido. Execute com --apply para aplicar.');
    }
  } finally {
    await client.close();
    console.log('');
    console.log('[SANEAMENTO] Conexao encerrada.');
  }
}

main().catch((err) => {
  console.error('[SANEAMENTO] ERRO CRITICO:', err);
  process.exit(1);
});
