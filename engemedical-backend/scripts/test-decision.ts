import { getYearEvidenceDecision } from '../src/scrapers/exam-matcher.service';
import { BlobServiceClient } from '@azure/storage-blob';
import * as pdfParse from 'pdf-parse';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const conn = process.env.AZURE_CONNECTION_STRING_BLOB ||
                 process.env.AZURE_STORAGE_CONNECTION_STRING ||
                 process.env.AZURE_CONNECTION_STRING;
    if (!conn) {
      console.error("AZURE connection string not found");
      return;
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
    const containerClient = blobServiceClient.getContainerClient('documents');
    
    const blobName = 'prontuarios/2026/08/1975781/1975781-507-2-18082026/PRT_1975781_LEONARDO_CHAVONI_ZACHETTI_RAIO_X_20260818_PXFO.pdf';
    const blobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blobClient.download(0);
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody!) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const data = await pdfParse(buffer);
    const text = data.text;
    
    console.log("PDF Text extracted:");
    console.log(text.replace(/\s+/g, ' '));
    
    const decision = getYearEvidenceDecision(text, '18/08/2026');
    console.log("\nDecision for 18/08/2026:", decision);
  } catch (e) {
    console.error(e);
  }
}
run();
