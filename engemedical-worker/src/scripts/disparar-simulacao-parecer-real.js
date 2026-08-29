/**
 * disparar-simulacao-parecer-real.js
 *
 * Simula a finalização de um atendimento REAL com Orientação e ASO gerado,
 * postando o payload no formato IDÊNTICO de produção na fila Azure 'email'
 * para acionar a versão compilada v64 no Fly.io.
 */

const path = require('path');
const { MongoClient } = require('mongodb');
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

const DESTINATARIOS_TO = [
  'tecnologia@cmsocupacional.com.br',
  'liberacao@cmsocupacional.com.br'
];

const DESTINATARIOS_CC = [
  'enfermagem@cmsocupacional.com.br',
  'draandrea@cmsocupacional.com.br'
];

function generateSasUrl(rawUrl) {
  if (!rawUrl || !rawUrl.includes('blob.core.windows.net')) return null;
  try {
    const urlObj = new URL(rawUrl);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return rawUrl;

    const containerName = parts[0];
    const blobName = parts.slice(1).join('/');

    const matchesAccount = AZURE_CONNECTION.match(/AccountName=([^;]+)/);
    const matchesKey = AZURE_CONNECTION.match(/AccountKey=([^;]+)/);

    if (!matchesAccount || !matchesKey) return rawUrl;

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
  } catch (err) {
    return rawUrl;
  }
}

async function main() {
  console.log(`\n${'='.repeat(75)}`);
  console.log(`  Disparo de Atendimento Real (Simulação de Produção v64 no Fly.io)`);
  console.log(`${'='.repeat(75)}\n`);

  const client = new MongoClient(MONGO_URL);
  await client.connect();

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    // Pega o atendimento da LAYSA MARA que tem exames reais e orientação
    const doc = await collection.findOne({ NOME: /LAYSA MARA SANTOS DE SOUSA/i });

    if (!doc) {
      console.log('❌ Atendimento não encontrado.');
      return;
    }

    // Pega URL real do ASO/exames
    const rawAsoUrl = doc.ASOINFO?.url || doc.ASOINFO?.signature?.signedUrl || doc.EXAMES?.find(e => e.grupo === 'Audiometria')?.url || null;
    const sasAsoUrl = generateSasUrl(rawAsoUrl);

    console.log(`📌 ID: ${doc._id}`);
    console.log(`👤 Paciente: ${doc.NOME}`);
    console.log(`🏢 Empresa: ${doc.NOMEEMPRESA}`);
    console.log(`📋 Parecer: ${doc.PARECERMEDICO}`);
    console.log(`🔗 SAS ASO URL: ${sasAsoUrl ? '✅ Gerado com sucesso' : 'NULO'}\n`);

    const queueServiceClient = QueueServiceClient.fromConnectionString(AZURE_CONNECTION);
    const queueClient = queueServiceClient.getQueueClient(QUEUE_EMAIL_NAME);
    await queueClient.createIfNotExists();

    let observacoesExtenso = [];
    if (Array.isArray(doc.ASOINFO?.observacoesParecer) && doc.ASOINFO.observacoesParecer.length > 0) {
      observacoesExtenso = doc.ASOINFO.observacoesParecer;
    } else if (doc.RECOMENDACAOMEDICA) {
      observacoesExtenso = [doc.RECOMENDACAOMEDICA];
    }

    const teamOpinion = {
      opinionType: doc.PARECERMEDICO,
      details: doc.RECOMENDACAOMEDICA || observacoesExtenso[0] || '',
      isProgrammed: false,
      orientacaoId: null,
      laudoPCD: null,
      laudoRestricao: null,
      altura: doc.ALTURA_PARECER || null,
      confinado: doc.CONFINADO_PARECER || null,
      examesParaRepetir: [],
    };

    const teamIssuer = doc.ASOINFO?.professional || {
      nome: doc.MEDICO || 'RODRIGO PASSOS',
      cpf: '14445975826',
      codigo: '1591',
      conselho: '85318',
      ufconselho: 'SP',
    };

    const asoInfoData = {
      nomeFuncionario: doc.NOME,
      nomeEmpresa: doc.NOMEEMPRESA,
      tipoExame: doc.TIPOEXAMENOME || doc.TIPOEXAME || 'ADMISSIONAL',
      data: doc.DATAAGENDAMENTO,
      cpf: doc.CPFFUNCIONARIO,
      parecer: doc.PARECERMEDICO,
      observacoesParecer: observacoesExtenso,
      asoFileUrl: sasAsoUrl,
    };

    for (const destTo of DESTINATARIOS_TO) {
      const payload = {
        attachment: [],
        cc: DESTINATARIOS_CC.join(','),
        subject: `PARECER: ${doc.NOME} - ${doc.TIPOEXAMENOME || 'ADMISSIONAL'}`,
        template: '',
        templatename: 'PARECER_MEDICO',
        to: destTo,
        data: {
          funcionario: doc,
          medicalOpinion: teamOpinion,
          issuedBy: teamIssuer,
          asoInfo: asoInfoData,
        },
      };

      await queueClient.sendMessage(JSON.stringify(payload));
      console.log(`  ✅ Disparado para fila Azure: ${destTo}`);
    }

    console.log(`\n${'='.repeat(75)}`);
    console.log(`  ✅ DISPARO EXECUTADO COM SUCESSO!`);
    console.log(`${'='.repeat(75)}\n`);

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('❌ ERRO:', err.message);
});
