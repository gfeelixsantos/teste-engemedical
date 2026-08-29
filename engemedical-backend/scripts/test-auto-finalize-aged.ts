import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error('MONGO_URL não configurada.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const db = client.db(dbName);
  const coll = db.collection('schedulings');

  // Calcula a data limite de 90 dias atrás
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  ninetyDaysAgo.setHours(23, 59, 59, 999);

  const query = {
    DATAAGENDAMENTO_DATE: { $lte: ninetyDaysAgo },
    ATENDIMENTOSTATUS: {
      $in: [
        'ATENDIMENTO',
        'AGUARDANDO_RESULTADOS',
        'PENDENTE',
        'AGUARDANDO',
      ],
    },
  };

  console.log(`🔌 Conectando ao MongoDB...`);
  console.log(`📅 Limite de 90 dias atrás: ${ninetyDaysAgo.toISOString()}`);
  
  const docs = await coll.find(query).toArray();
  console.log(`📊 Encontrados ${docs.length} registros com mais de 90 dias pendentes.`);

  const samples: any[] = [];
  const statusCounts: Record<string, number> = {};

  for (const doc of docs) {
    const status = doc.ATENDIMENTOSTATUS || 'Nulo/Indefinido';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (samples.length < 20) {
      const exams = doc.EXAMES || [];
      const totalExams = exams.length;
      const finishedExams = exams.filter((e: any) => e.status === 'FINALIZADO').length;
      samples.push({
        id: doc._id.toString(),
        nome: doc.NOME,
        empresa: doc.NOMEEMPRESA,
        dataAgendamento: doc.DATAAGENDAMENTO,
        statusAtual: status,
        exames: `${finishedExams}/${totalExams} Finalizados`,
      });
    }
  }

  console.log('\n=============== RESUMO DOS STATUS AFETADOS ===============');
  console.table(statusCounts);
  console.log('==========================================================\n');

  if (samples.length > 0) {
    console.log('📋 AMOSTRA DOS REGISTROS QUE SERÃO FINALIZADOS E ENVIADOS PARA O SOCGED:');
    console.table(samples);
  } else {
    console.log('Nenhum registro antigo encontrado para processamento.');
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
