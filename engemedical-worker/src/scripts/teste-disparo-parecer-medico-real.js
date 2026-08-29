/**
 * teste-disparo-parecer-medico-real.js
 * 
 * Envia o e-mail no template REAL de PARECER MÉDICO (PARECER_MEDICO) da equipe
 * garantindo:
 *  - Uso do template PARECER_MEDICO oficial
 *  - URL do ASO presente no corpo do e-mail com botão de acesso
 *  - Orientação médica por extenso (ex: acompanhamento oftalmológico, etc)
 *  - Informações completas do médico emissor, empresa e funcionário
 *
 * Uso:
 *   node src/scripts/teste-disparo-parecer-medico-real.js --execute
 */

const path = require('path');
const { MongoClient } = require('mongodb');
const { QueueServiceClient } = require('@azure/storage-queue');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const EXECUTE = process.argv.includes('--execute');

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';
const AZURE_CONNECTION = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_CONNECTION_STRING_BLOB;
const QUEUE_EMAIL_NAME = process.env.AZURE_QUEUE_EMAIL || 'email';

const TEST_DESTINATARIOS = [
  'tecnologia@cmsocupacional.com.br',
  'liberacao@cmsocupacional.com.br'
];

async function main() {
  console.log(`\n${'='.repeat(75)}`);
  console.log(`  Disparo do E-mail de PARECER MÉDICO REAL (Template PARECER_MEDICO com ASO e Orientação)`);
  console.log(`${'='.repeat(75)}`);
  console.log(`  Modo: ${EXECUTE ? '⚡ EXECUTAR (Dispara e-mails via fila Azure)' : '👁  DRY-RUN'}\n`);

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log('✅ MongoDB conectado\n');

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    // Busca atendimentos com APTO_COM_ORIENTACAO
    const query = {
      'PARECERMEDICO': { $in: ['APTO_COM_ORIENTACAO', 'APTO_COM_RESTRICAO'] },
      $or: [
        { 'ASOINFO.url': { $ne: null } },
        { 'ASOINFO.observacoesParecer.0': { $exists: true } },
        { 'RECOMENDACAOMEDICA': { $ne: null, $ne: '' } }
      ]
    };

    const docs = await collection.find(query).sort({ _id: -1 }).limit(3).toArray();

    console.log(`🎯 Encontrados ${docs.length} atendimentos de exemplo:\n`);

    const payloadList = [];

    docs.forEach((doc, idx) => {
      let observacoesPorExtenso = [];
      if (Array.isArray(doc.ASOINFO?.observacoesParecer) && doc.ASOINFO.observacoesParecer.length > 0) {
        observacoesPorExtenso = doc.ASOINFO.observacoesParecer;
      } else if (doc.RECOMENDACAOMEDICA) {
        observacoesPorExtenso = [doc.RECOMENDACAOMEDICA];
      }

      const asoUrl = doc.ASOINFO?.url || doc.ASOINFO?.signature?.signedUrl || 'https://cmsodocs.blob.core.windows.net/documents/exames/2026/08/230890/230890-15503-1-15082026/EXM_230890_LAYSA_MARA_SANTOS_DE_SOUSA_AUDIOMETRIA_DIGITAL_20260815_XNYD.pdf';

      console.log(`--- [Exemplo ${idx + 1}] ---`);
      console.log(`📌 ID: ${doc._id}`);
      console.log(`👤 Funcionário: ${doc.NOME} (${doc.CPFFUNCIONARIO})`);
      console.log(`🏢 Empresa: ${doc.NOMEEMPRESA}`);
      console.log(`📋 Parecer: ${doc.PARECERMEDICO}`);
      console.log(`📝 Orientação: ${JSON.stringify(observacoesPorExtenso)}`);
      console.log(`🔗 URL ASO: ${asoUrl}\n`);

      const teamOpinion = {
        opinionType: doc.PARECERMEDICO,
        details: doc.RECOMENDACAOMEDICA || observacoesPorExtenso[0] || '',
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
        observacoesParecer: observacoesPorExtenso,
        asoFileUrl: asoUrl,
      };

      TEST_DESTINATARIOS.forEach((destTo) => {
        payloadList.push({
          schedulingId: doc._id.toString(),
          patient: doc.NOME,
          to: destTo,
          message: {
            attachment: [],
            cc: '',
            subject: `[PARECER MÉDICO] ${doc.NOME} - ${doc.TIPOEXAMENOME || 'ADMISSIONAL'} - ${doc.NOMEEMPRESA}`,
            template: '',
            templatename: 'PARECER_MEDICO',
            to: destTo,
            data: {
              funcionario: doc,
              medicalOpinion: teamOpinion,
              issuedBy: teamIssuer,
              asoInfo: asoInfoData,
            }
          }
        });
      });
    });

    if (!EXECUTE) {
      console.log(`⚠️  DRY-RUN Concluído! Para disparar estes ${payloadList.length} e-mails via template PARECER_MEDICO, execute:`);
      console.log(`   node src/scripts/teste-disparo-parecer-medico-real.js --execute\n`);
      return;
    }

    if (!AZURE_CONNECTION) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING não configurada');
    }

    const queueServiceClient = QueueServiceClient.fromConnectionString(AZURE_CONNECTION);
    const queueClient = queueServiceClient.getQueueClient(QUEUE_EMAIL_NAME);
    await queueClient.createIfNotExists();

    console.log(`🚀 Disparando ${payloadList.length} mensagens no template PARECER_MEDICO na fila '${QUEUE_EMAIL_NAME}'...\n`);

    for (const item of payloadList) {
      const msgText = JSON.stringify(item.message);
      await queueClient.sendMessage(msgText);
      console.log(`  ✅ E-mail PARECER_MEDICO enfileirado para: ${item.to} | Paciente: ${item.patient}`);
    }

    console.log(`\n${'='.repeat(75)}`);
    console.log(`  ✅ DISPARO DO TEMPLATE PARECER MÉDICO REAL CONCLUÍDO!`);
    console.log(`${'='.repeat(75)}\n`);

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('\n❌ ERRO FATAL:', err.message);
  process.exit(1);
});
