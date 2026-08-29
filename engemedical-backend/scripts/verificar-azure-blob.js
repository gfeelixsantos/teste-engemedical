/**
 * Script para verificar metadados de blobs no Azure Storage
 * para confirmar datas de upload dos PDFs de exames
 */

require('dotenv').config();

const { BlobServiceClient } = require('@azure/storage-blob');

async function main() {
  if (process.stdout.reconfigure) process.stdout.reconfigure({ encoding: 'utf8' });
  if (process.stderr.reconfigure) process.stderr.reconfigure({ encoding: 'utf8' });

  const connectionString = process.env.AZURE_CONNECTION_STRING_BLOB || 
                          process.env.AZURE_STORAGE_CONNECTION_STRING || 
                          process.env.AZURE_CONNECTION_STRING;
  if (!connectionString) {
    console.error('Connection string do Azure não encontrada. Variáveis necessárias:');
    console.error('  - AZURE_CONNECTION_STRING_BLOB');
    console.error('  - AZURE_STORAGE_CONNECTION_STRING');
    console.error('  - AZURE_CONNECTION_STRING');
    process.exit(1);
  }

  console.log(`Conectando ao Azure Blob Storage...`);
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerName = 'documents';
  const containerClient = blobServiceClient.getContainerClient(containerName);

  console.log(`✓ Conectado ao container: ${containerName}`);

  // Blobs do documento de ANDREA DA SILVA SANTOS
  const blobPaths = [
    'exames/2026/08/1384751/1384751-1018-1-20082026/EXM_1384751_ANDREA_DA_SILVA_SANTOS_LABORATORIO_20260822_ADNH.pdf',
  ];

  console.log(`\nVerificando metadados dos blobs:\n`);

  for (const blobPath of blobPaths) {
    console.log(`Blob: ${blobPath}`);
    const blobClient = containerClient.getBlobClient(blobPath);

    try {
      const properties = await blobClient.getProperties();
      
      console.log(`  ✓ Encontrado`);
      console.log(`  Created On: ${properties.createdOn}`);
      console.log(`  Last Modified: ${properties.lastModified}`);
      console.log(`  Content Length: ${properties.contentLength} bytes`);
      console.log(`  Content Type: ${properties.contentType}`);
      
      if (properties.metadata) {
        console.log(`  Metadata:`);
        Object.keys(properties.metadata).forEach((key) => {
          console.log(`    ${key}: ${properties.metadata[key]}`);
        });
      } else {
        console.log(`  Metadata: (nenhum)`);
      }
    } catch (err) {
      console.error(`  ✗ Erro: ${err.message}`);
    }
    console.log(``);
  }

  // Buscar todos os blobs do agendamento 1384751
  console.log(`\n========================================`);
  console.log(`Buscando todos os blobs do agendamento 1384751...`);
  console.log(`========================================\n`);

  const blobs = [];
  for await (const blob of containerClient.listBlobsFlat({
    prefix: 'exames/2026/08/1384751/',
  })) {
    blobs.push(blob);
  }

  console.log(`Encontrados ${blobs.length} blobs:\n`);

  blobs.forEach((blob) => {
    console.log(`  - ${blob.name}`);
    console.log(`    Created: ${blob.properties.createdOn}`);
    console.log(`    Size: ${blob.properties.contentLength} bytes`);
    console.log(``);
  });
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
