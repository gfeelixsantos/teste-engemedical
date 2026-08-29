const { BlobServiceClient } = require('@azure/storage-blob');
const pdfParse = require('pdf-parse');
require('dotenv').config();

async function run() {
  try {
    const conn = process.env.AZURE_CONNECTION_STRING_BLOB ||
                 process.env.AZURE_STORAGE_CONNECTION_STRING ||
                 process.env.AZURE_CONNECTION_STRING;
                 
    if (!conn) {
      console.error("AZURE connection string not found in env variables.");
      return;
    }
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
    const containerName = process.env.AZURE_STORAGE_CONTAINER || 'documents';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const pdfsToTest = [
      {
        name: 'ROBERT WILKLE SANTANA MIRANDA',
        blobName: 'prontuarios/2026/08/1303551/1303551-78-1-15082026/PRT_1303551_ROBERT_WILKLE_SANTANA_MIRANDA_RAIO_X_20260817_LIZX.pdf'
      },
      {
        name: 'LEONARDO CHAVONI ZACHETTI',
        blobName: 'prontuarios/2026/08/1975781/1975781-507-2-18082026/PRT_1975781_LEONARDO_CHAVONI_ZACHETTI_RAIO_X_20260818_PXFO.pdf'
      },
      {
        name: 'ANTONIO PEREIRA GAMELEIRA JUNIOR',
        blobName: 'prontuarios/2026/08/1975781/1975781-459-2-18082026/PRT_1975781_ANTONIO_PEREIRA_GAMELEIRA_JUNIOR_RAIO_X_20260818_4P8J.pdf'
      }
    ];
    
    for (const item of pdfsToTest) {
      console.log(`\n========================================`);
      console.log(`Downloading PDF for: ${item.name}`);
      console.log(`Blob: ${item.blobName}`);
      
      const blobClient = containerClient.getBlockBlobClient(item.blobName);
      try {
        const downloadResponse = await blobClient.download(0);
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        console.log(`Successfully downloaded ${buffer.length} bytes.`);
        
        const data = await pdfParse(buffer);
        console.log(`--- PDF TEXT EXTRACTED (first 600 chars) ---`);
        console.log(data.text.replace(/\s+/g, ' ').substring(0, 600));
      } catch (err) {
        console.error(`Error downloading/parsing ${item.name}:`, err.message);
      }
    }

  } catch (e) {
    console.error(e);
  }
}
run();
