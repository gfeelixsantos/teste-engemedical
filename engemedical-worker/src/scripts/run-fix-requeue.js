const path = require('path');
const { MongoClient } = require('mongodb');
const { QueueServiceClient } = require('@azure/storage-queue');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect';
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';
const AZURE_CONNECTION = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_CONNECTION_STRING_BLOB;
const QUEUE_ASO_NAME = process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing';

function resolveProfessionalCode(doc) {
  const clinicalExam = Array.isArray(doc?.EXAMES)
    ? doc.EXAMES.find((exam) =>
        String(exam?.grupo || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
          .includes('clin'),
      )
    : undefined;
  const clinicalForm = clinicalExam?.formulario || {};
  const professional =
    doc?.ASOINFO?.professional && typeof doc.ASOINFO.professional === 'object'
      ? doc.ASOINFO.professional
      : undefined;

  return String(
    clinicalForm?.codigoMedico ||
      clinicalForm?.codigoProfissional ||
      clinicalExam?.codigoProfissional ||
      professional?.codigo ||
      doc?.ASOINFO?.codigoProfissional ||
      doc?.MEDICO ||
      '',
  ).trim();
}

async function main() {
  console.log('Conectando ao MongoDB...');
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log('Conectado ao MongoDB com sucesso!');

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    const query = {
      $or: [
        { ASOSTATUS: 'ERRO' },
        { 'ASOINFO.status': 'FALHA' },
        { 'ASOINFO.signature.error': { $regex: /SOC SOAP Fault/i } },
        { 'ASOINFO.generalRetry.lastError': { $regex: /SOC SOAP Fault/i } }
      ]
    };

    console.log('Buscando agendamentos com erro...');
    const docs = await collection.find(query).toArray();
    console.log(`📌 Total de agendamentos encontrados: ${docs.length}\n`);

    if (docs.length === 0) return;

    const queueServiceClient = QueueServiceClient.fromConnectionString(AZURE_CONNECTION);
    const queueClient = queueServiceClient.getQueueClient(QUEUE_ASO_NAME);
    await queueClient.createIfNotExists();

    for (const doc of docs) {
      const idStr = String(doc._id);
      console.log(`---------------------------------------------------------------------------`);
      console.log(`👤 Processando: ${doc.NOME} (${doc.NOMEEMPRESA}) | ID: ${idStr}`);
      console.log(`   Parecer: ${doc.PARECERMEDICO} | Status Anterior: ${doc.ATENDIMENTOSTATUS} / ASOSTATUS: ${doc.ASOSTATUS}`);

      const professionalCode = resolveProfessionalCode(doc);
      let observacoesExtenso = [];
      if (Array.isArray(doc.ASOINFO?.observacoesParecer) && doc.ASOINFO.observacoesParecer.length > 0) {
        observacoesExtenso = doc.ASOINFO.observacoesParecer;
      } else if (doc.RECOMENDACAOMEDICA) {
        observacoesExtenso = [doc.RECOMENDACAOMEDICA];
      }

      // Atualiza o documento no Mongo: ATENDIMENTOSTATUS = 'FINALIZADO' e limpa travas
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            ATENDIMENTOSTATUS: 'FINALIZADO',
            ASOSTATUS: 'GERANDO',
            'ASOINFO.status': 'PENDENTE',
            'ASOINFO.updatedAt': new Date(),
            'ASOINFO.processingQueuedAt': new Date(),
          },
          $unset: {
            'ASOINFO.generalRetry': '',
            'ASOINFO.signature.retry': '',
            'ASOINFO.signature.error': '',
          }
        }
      );
      console.log(`   ✅ Mongo Atualizado: ATENDIMENTOSTATUS='FINALIZADO', ASOSTATUS='GERANDO'`);

      const payload = {
        schedulingId: idStr,
        sequencial: String(doc?.SEQUENCIAFICHA || ''),
        nomeFuncionario: String(doc?.NOME || ''),
        nomeEmpresa: String(doc?.NOMEEMPRESA || ''),
        tipoExame: String(doc?.TIPOEXAME || ''),
        tipoExameNome: String(doc?.TIPOEXAMENOME || ''),
        dataFicha: String(doc?.DATAAGENDAMENTO || ''),
        codEmpresa: String(doc?.CODIGOEMPRESA || ''),
        codFuncionario: String(doc?.CODIGO || ''),
        cpfFuncionario: String(doc?.CPFFUNCIONARIO || ''),
        parecer: String(doc?.PARECERMEDICO || ''),
        observacoesParecer: observacoesExtenso,
        action: 'REPROCESSAR',
        createdAt: new Date(),
        medico: professionalCode,
        prontuario: String(doc?.CODIGOPRONTUARIO || ''),
        socgedCode: '',
        ...(doc?.ALTURA_PARECER ? { alturaParecer: doc.ALTURA_PARECER } : {}),
        ...(doc?.CONFINADO_PARECER ? { confinadoParecer: doc.CONFINADO_PARECER } : {}),
        ...(doc?.ASOINFO?.professional ? { profissional: doc.ASOINFO.professional } : {}),
      };

      await queueClient.sendMessage(JSON.stringify(payload));
      console.log(`   🚀 Reenfileirado com sucesso na fila Azure '${QUEUE_ASO_NAME}'!`);
    }

    console.log(`\n===========================================================================`);
    console.log(`  ✅ PROCESSAMENTO CONCLUÍDO COM SUCESSO!`);
    console.log(`===========================================================================\n`);
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('ERRO:', err);
  process.exit(1);
});
