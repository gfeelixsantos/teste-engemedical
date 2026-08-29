// @ts-nocheck
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URL;
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const db = client.db(dbName);
  const coll = db.collection('schedulings');

  console.log('🔍 Buscando agendamentos com ATENDIMENTOSTATUS = ATENDIMENTO...');
  const docs = await coll.find({ ATENDIMENTOSTATUS: 'ATENDIMENTO' }).toArray();
  console.log(`📊 Encontrados ${docs.length} agendamentos com ATENDIMENTOSTATUS = ATENDIMENTO.\n`);

  let countNoPendingExams = 0;
  let countWithPendingExams = 0;

  const sampleStuck = [];

  for (const doc of docs) {
    const exames = doc.EXAMES || [];
    const pendentes = exames.filter(e => e.status === 'PENDENTE');
    const finalizados = exames.filter(e => e.status === 'FINALIZADO');
    const aguardando = exames.filter(e => e.status === 'AGUARDANDO_RESULTADO');

    if (pendentes.length === 0) {
      countNoPendingExams++;
      if (sampleStuck.length < 15) {
        sampleStuck.push({
          id: doc._id.toString(),
          nome: doc.NOME,
          empresa: doc.NOMEEMPRESA,
          data: doc.DATAAGENDAMENTO,
          examesTotal: exames.length,
          finalizados: finalizados.length,
          aguardando: aguardando.length,
          pendentes: pendentes.length
        });
      }
    } else {
      countWithPendingExams++;
    }
  }

  console.log('=============== ANÁLISE DOS ATENDIMENTOS EM STATUS "ATENDIMENTO" ===============');
  console.log(`Total Analisados: ${docs.length}`);
  console.log(`Total Sem Nenhum Exame PENDENTE (Travados): ${countNoPendingExams}`);
  console.log(`Total Com Exame PENDENTE: ${countWithPendingExams}`);
  console.log('================================================================================\n');

  console.log('📋 AMOSTRA DOS ATENDIMENTOS TRAVADOS (SEM EXAMES PENDENTES):');
  console.table(sampleStuck);

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
