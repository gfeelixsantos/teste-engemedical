import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { FuncionarioEntity } from '../src/mongo/model/FuncionarioEntity';
import { SchedulingDocument } from '../src/mongo/types/scheduling';

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

  const docs = await coll.find({ ATENDIMENTOSTATUS: 'ATENDIMENTO' }).toArray();

  let countAllPending = 0;
  let countPartialPending = 0;
  const samples: any[] = [];

  for (const doc of docs) {
    const currentStatus = doc.ATENDIMENTOSTATUS;
    const funcionario = new FuncionarioEntity(doc as unknown as SchedulingDocument);
    
    // Simula a evolução
    funcionario.updateAtendimentoStatus(currentStatus);
    const newStatus = funcionario.getRaw().ATENDIMENTOSTATUS;
    
    // Se permaneceu em ATENDIMENTO, significa que tem pendências
    if (newStatus === 'ATENDIMENTO') {
      const exames = doc.EXAMES || [];
      const pendentes = exames.filter(e => e.status === 'PENDENTE');
      const finalizados = exames.filter(e => e.status === 'FINALIZADO');
      const aguardando = exames.filter(e => e.status === 'AGUARDANDO_RESULTADO');

      const isAllPending = pendentes.length === exames.length;
      if (isAllPending) {
        countAllPending++;
      } else {
        countPartialPending++;
      }

      if (samples.length < 15) {
        samples.push({
          id: doc._id.toString(),
          nome: doc.NOME,
          empresa: doc.NOMEEMPRESA,
          data: doc.DATAAGENDAMENTO,
          examesTotal: exames.length,
          pendentes: pendentes.length,
          finalizados: finalizados.length,
          aguardando: aguardando.length,
          tipoPendencia: isAllPending ? 'TODOS PENDENTES' : 'PARCIALMENTE PENDENTE'
        });
      }
    }
  }

  console.log('=============== ANÁLISE DOS 55 AGENDAMENTOS QUE FICAM EM "ATENDIMENTO" ===============');
  console.log(`Total Analisados (que permanecem em ATENDIMENTO): ${countAllPending + countPartialPending}`);
  console.log(`└─ Atendimentos onde TODOS os exames são PENDENTE: ${countAllPending}`);
  console.log(`└─ Atendimentos com pendência PARCIAL (alguns feitos/outros pendentes): ${countPartialPending}`);
  console.log('======================================================================================\n');

  console.log('📋 AMOSTRA DOS DETALHES DE PENDÊNCIAS:');
  console.table(samples);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
