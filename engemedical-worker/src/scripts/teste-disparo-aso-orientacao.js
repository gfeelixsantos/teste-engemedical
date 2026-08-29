/**
 * teste-disparo-aso-orientacao.js
 * 
 * Localiza atendimentos com APTO_COM_ORIENTACAO ou com recomendação médica por extenso,
 * monta o payload para a fila Azure 'email' garantindo:
 *  - URL do ASO presente no corpo (link do botão e texto)
 *  - Orientação por extenso exibida no template (observacoesParecer)
 *  - Envio individual para a equipe e/ou cliente para validação imediata
 *
 * Uso:
 *   node src/scripts/teste-disparo-aso-orientacao.js             -> Dry-run (apenas encontra e mostra)
 *   node src/scripts/teste-disparo-aso-orientacao.js --execute   -> Enfileira os e-mails na fila Azure 'email'
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
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  Teste e Disparo de E-mail de ASO com Orientação e Link do PDF`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  Modo: ${EXECUTE ? '⚡ EXECUTAR (Dispara e-mails via fila Azure)' : '👁  DRY-RUN (Simulação)'}\n`);

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log('✅ MongoDB conectado\n');

  try {
    const db = client.db(MONGO_DATABASE);
    const collection = db.collection(MONGO_COLLECTION);

    // Busca atendimentos recentes que tenham ASO URL e parecer com orientação ou observações médicas por extenso
    const query = {
      'PARECERMEDICO': { $in: ['APTO_COM_ORIENTACAO', 'APTO_COM_RESTRICAO'] },
      $or: [
        { 'ASOINFO.url': { $ne: null } },
        { 'ASOINFO.observacoesParecer.0': { $exists: true } },
        { 'RECOMENDACAOMEDICA': { $ne: null, $ne: '' } }
      ]
    };

    const docs = await collection.find(query).sort({ _id: -1 }).limit(5).toArray();

    console.log(`🎯 Encontrados ${docs.length} atendimentos de exemplo com Orientação e ASO:\n`);

    if (docs.length === 0) {
      console.log('Nenhum documento encontrado.');
      return;
    }

    const payloadList = [];

    docs.forEach((doc, idx) => {
      // Monta as observações por extenso
      let observacoesPorExtenso = [];
      if (Array.isArray(doc.ASOINFO?.observacoesParecer) && doc.ASOINFO.observacoesParecer.length > 0) {
        observacoesPorExtenso = doc.ASOINFO.observacoesParecer;
      } else if (doc.RECOMENDACAOMEDICA) {
        observacoesPorExtenso = [doc.RECOMENDACAOMEDICA];
      }

      const asoUrl = doc.ASOINFO?.url || doc.ASOINFO?.signature?.signedUrl || 'https://cmsodocs.blob.core.windows.net/documents/exames/2026/08/230890/230890-15503-1-15082026/ASO_TESTE.pdf';

      console.log(`--- [Exemplo ${idx + 1}] ---`);
      console.log(`📌 ID: ${doc._id}`);
      console.log(`👤 Funcionário: ${doc.NOME} (${doc.CPFFUNCIONARIO})`);
      console.log(`🏢 Empresa: ${doc.NOMEEMPRESA}`);
      console.log(`📋 Parecer: ${doc.PARECERMEDICO}`);
      console.log(`📝 Orientação Extenso: ${JSON.stringify(observacoesPorExtenso)}`);
      console.log(`🔗 URL ASO: ${asoUrl}\n`);

      TEST_DESTINATARIOS.forEach((destTo) => {
        payloadList.push({
          schedulingId: doc._id.toString(),
          patient: doc.NOME,
          to: destTo,
          message: {
            attachment: [],
            cc: '',
            subject: `[TESTE ASO] Liberação de ASO com Orientação: ${doc.NOME} - ${doc.NOMEEMPRESA}`,
            template: '',
            templatename: 'ASO_RELEASE',
            to: destTo,
            data: {
              nomeFuncionario: doc.NOME,
              nomeEmpresa: doc.NOMEEMPRESA,
              tipoExame: doc.TIPOEXAMENOME || doc.TIPOEXAME || 'ADMISSIONAL',
              data: doc.DATAAGENDAMENTO || '18/08/2026',
              chegada: doc.HORARIO || '08:00',
              cpf: doc.CPFFUNCIONARIO,
              parecer: doc.PARECERMEDICO,
              observacoesParecer: observacoesPorExtenso,
              asoFileUrl: asoUrl,
              examesRealizados: (doc.EXAMES || []).map(e => ({
                nomeExame: e.nomeExame,
                status: e.status,
                sala: e.sala,
                dataExame: e.dataExame
              }))
            }
          }
        });
      });
    });

    if (!EXECUTE) {
      console.log(`⚠️  DRY-RUN Concluído! Para disparar estes ${payloadList.length} e-mails na fila Azure 'email', execute:`);
      console.log(`   node src/scripts/teste-disparo-aso-orientacao.js --execute\n`);
      return;
    }

    if (!AZURE_CONNECTION) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING não configurada');
    }

    const queueServiceClient = QueueServiceClient.fromConnectionString(AZURE_CONNECTION);
    const queueClient = queueServiceClient.getQueueClient(QUEUE_EMAIL_NAME);
    await queueClient.createIfNotExists();

    console.log(`🚀 Disparando ${payloadList.length} mensagens na fila Azure '${QUEUE_EMAIL_NAME}'...\n`);

    for (const item of payloadList) {
      const msgText = JSON.stringify(item.message);
      await queueClient.sendMessage(msgText);
      console.log(`  ✅ E-mail enfileirado para: ${item.to} | Paciente: ${item.patient}`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  ✅ DISPARO CONCLUÍDO COM SUCESSO!`);
    console.log(`${'='.repeat(70)}\n`);

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('\n❌ ERRO FATAL:', err.message);
  process.exit(1);
});
