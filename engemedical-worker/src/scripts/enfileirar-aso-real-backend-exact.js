/**
 * enfileirar-aso-real-backend-exact.js
 * 
 * Este script simula a chamada EXATA que a função `enqueueParecerMedicoToTeam` do `engemedical-connect-backend` executa.
 * Ele busca o atendimento real no MongoDB, pega ESTRITAMENTE o campo `ASOINFO.url` (ou `ASOINFO.signature.signedUrl`),
 * gera o Token SAS do Azure Blob exatamente como a função `generateReadOnlyEmailLink` faz no backend,
 * e posta o payload no formato EXATO do backend na fila 'email'.
 */

const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { QueueServiceClient } = require('@azure/storage-queue');
const { StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect';
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';
const AZURE_CONNECTION = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_CONNECTION_STRING_BLOB;
const QUEUE_EMAIL_NAME = process.env.AZURE_QUEUE_EMAIL || 'email';

function generateReadOnlyEmailLink(rawUrl) {
  if (!rawUrl || !rawUrl.includes('blob.core.windows.net')) {
    throw new Error(`URL do ASO inválida ou vazia: ${rawUrl}`);
  }

  const urlObj = new URL(rawUrl);
  const parts = urlObj.pathname.split('/').filter(Boolean);
  const containerName = parts[0];
  const blobName = parts.slice(1).join('/');

  const matchesAccount = AZURE_CONNECTION.match(/AccountName=([^;]+)/);
  const matchesKey = AZURE_CONNECTION.match(/AccountKey=([^;]+)/);

  if (!matchesAccount || !matchesKey) {
    throw new Error('Credenciais do Azure Storage não encontradas no .env');
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(matchesAccount[1], matchesKey[1]);
  const expiresOn = new Date();
  expiresOn.setDate(expiresOn.getDate() + 5);

  const sasOptions = {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('r'),
    expiresOn,
  };

  const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
  return `${urlObj.origin}/${containerName}/${blobName}?${sasToken}`;
}

async function main() {
  console.log(`\n${'='.repeat(75)}`);
  console.log(`  Disparo do PARECER MÉDICO (Execução EXATA da Lógica do Backend)`);
  console.log(`${'='.repeat(75)}\n`);

  const client = new MongoClient(MONGO_URL);
  await client.connect();

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    // Busca um agendamento real que tenha o PDF do ASO gerado (ASOINFO.url ou signature.signedUrl)
    const doc = await collection.findOne({
      $or: [
        { 'ASOINFO.url': { $regex: '^https://.*blob\.core\.windows\.net.*/ASO_' } },
        { 'ASOINFO.signature.signedUrl': { $regex: '^https://.*blob\.core\.windows\.net.*/ASO_' } },
        { 'ASOINFO.url': { $ne: null } }
      ]
    }, { sort: { _id: -1 } });

    if (!doc) {
      console.log('❌ Nenhum agendamento com URL do ASO encontrado no Mongo.');
      return;
    }

    // Pega ESTRITAMENTE a URL do ASO (nunca de exames!)
    const rawAsoUrl = doc.ASOINFO?.url || doc.ASOINFO?.signature?.signedUrl;
    
    console.log(`📌 Agendamento Selecionado: ID ${doc._id}`);
    console.log(`👤 Funcionário: ${doc.NOME}`);
    console.log(`🏢 Empresa: ${doc.NOMEEMPRESA}`);
    console.log(`📄 ASOINFO.url Bruto (PDF do ASO): ${rawAsoUrl}`);

    // Gera o link SAS de leitura da URL do ASO
    const asoFileUrlSas = generateReadOnlyEmailLink(rawAsoUrl);
    console.log(`🔗 Link SAS Gerado para o ASO: ${asoFileUrlSas}\n`);

    // Monta o payload no formato IDÊNTICO ao método `enqueueParecerMedicoToTeam` do backend
    const teamOpinion = {
      opinionType: doc.PARECERMEDICO,
      details: doc.RECOMENDACAOMEDICA || (Array.isArray(doc.ASOINFO?.observacoesParecer) ? doc.ASOINFO.observacoesParecer[0] : null),
      isProgrammed: null,
      orientacaoId: null,
      laudoPCD: null,
      laudoRestricao: null,
      altura: doc.ALTURA_PARECER || null,
      confinado: doc.CONFINADO_PARECER || null,
      examesParaRepetir: [],
    };

    const teamIssuer = doc.ASOINFO?.professional || {
      nome: doc.MEDICO || 'MARIA JULIA TONELOTTO - CMSO',
      cpf: '38601962866',
      codigo: '1787',
      conselho: '288844',
      ufconselho: 'SP',
    };

    const asoInfoData = {
      nomeFuncionario: doc.NOME,
      nomeEmpresa: doc.NOMEEMPRESA,
      tipoExame: doc.TIPOEXAMENOME || doc.TIPOEXAME,
      data: doc.DATAAGENDAMENTO,
      cpf: doc.CPFFUNCIONARIO,
      parecer: doc.PARECERMEDICO || undefined,
      observacoesParecer: doc.ASOINFO?.observacoesParecer || [],
      asoFileUrl: asoFileUrlSas, // Link ESTRITAMENTE do ASO com SAS Token
    };

    const payload = {
      attachment: [],
      cc: 'enfermagem@cmsocupacional.com.br,draandrea@cmsocupacional.com.br',
      subject: `PARECER: ${doc.NOME} - ${doc.TIPOEXAMENOME || 'ADMISSIONAL'}`,
      template: '',
      templatename: 'PARECER_MEDICO',
      to: 'tecnologia@cmsocupacional.com.br,liberacao@cmsocupacional.com.br',
      data: {
        funcionario: doc,
        medicalOpinion: teamOpinion,
        issuedBy: teamIssuer,
        asoInfo: asoInfoData,
      },
    };

    // Publica no Azure Queue
    const queueServiceClient = QueueServiceClient.fromConnectionString(AZURE_CONNECTION);
    const queueClient = queueServiceClient.getQueueClient(QUEUE_EMAIL_NAME);
    await queueClient.createIfNotExists();

    // Envia individualmente para garantir entrega SMTP limpa
    for (const destTo of ['tecnologia@cmsocupacional.com.br', 'liberacao@cmsocupacional.com.br']) {
      const msg = { ...payload, to: destTo };
      await queueClient.sendMessage(JSON.stringify(msg));
      console.log(`  ✅ PARECER_MEDICO enfileirado para: ${destTo} (com PDF do ASO)`);
    }

    console.log(`\n${'='.repeat(75)}`);
    console.log(`  ✅ DISPARO EXATO DA LÓGICA DO BACKEND CONCLUÍDO`);
    console.log(`${'='.repeat(75)}\n`);

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('❌ ERRO:', err.message);
});
