// @ts-nocheck
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { formatInTimeZone, fromZonedTime } = require('date-fns-tz');

function calcularRangePipeline() {
  const hoje = new Date();
  const dateStrAtBR = formatInTimeZone(hoje, 'America/Sao_Paulo', 'yyyy-MM-dd');
  const inicioDoDiaBR = fromZonedTime(`${dateStrAtBR} 00:00:00`, 'America/Sao_Paulo');
  return { inicioDoDiaBR };
}

const REISSUE_GROUPS = new Set(['Exame Clínico', 'Acuidade Visual', 'Audiometria', 'Espirometria', 'Psicossocial', 'Dinamometria']);

async function main() {
  const uri = process.env.MONGO_URL;
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const db = client.db(dbName);
  const coll = db.collection('schedulings');

  const { inicioDoDiaBR } = calcularRangePipeline();

  const query = {
    DATAAGENDAMENTO_DATE: { $lt: inicioDoDiaBR },
    ATENDIMENTOSTATUS: {
      $in: ['EM_ATENDIMENTO', 'AGUARDANDO_RESULTADOS', 'AVALIACAO_MEDICA'],
    },
  };

  const docs = await coll.find(query).toArray();

  const totalExamesPorGrupoEStatus = {};
  const reissuableExamsInPending = [];

  for (const doc of docs) {
    const exames = doc.EXAMES || [];
    for (const ex of exames) {
      const grupo = ex.grupo || 'Sem Grupo';
      const status = ex.status || 'Sem Status';
      const key = `${grupo}__${status}`;

      totalExamesPorGrupoEStatus[key] = (totalExamesPorGrupoEStatus[key] || 0) + 1;

      if (ex.status === 'PENDENTE' && REISSUE_GROUPS.has(grupo)) {
        reissuableExamsInPending.push({
          id: doc._id.toString(),
          nome: doc.NOME,
          empresa: doc.NOMEEMPRESA,
          data: doc.DATAAGENDAMENTO,
          exame: ex.nomeExame,
          codigo: ex.codigoExame,
          grupo: ex.grupo,
        });
      }
    }
  }

  console.log('=============== ANÁLISE DE EXAMES NOS 241 AGENDAMENTOS ===============\n');

  console.log('📌 EXAMES NO STATUS "PENDENTE" (EXATAMENTE OS QUE SOFRERIAM AÇÃO NA MANUTENÇÃO):');
  const pendentesTable = Object.entries(totalExamesPorGrupoEStatus)
    .filter(([k]) => k.endsWith('__PENDENTE'))
    .map(([k, v]) => ({ Grupo: k.split('__')[0], TotalPendentes: v }));
  console.table(pendentesTable);

  console.log('\n📌 DISTRIBUIÇÃO TOTAL DE TODOS OS EXAMES POR GRUPO E STATUS:');
  const fullTable = Object.entries(totalExamesPorGrupoEStatus).map(([k, v]) => {
    const [grupo, status] = k.split('__');
    return { Grupo: grupo, Status: status, Total: v };
  });
  console.table(fullTable);

  console.log(`\n⚠️ TOTAL DE EXAMES PENDENTES DE GRUPOS DE REEMISSÃO (CLÍNICO/AUDID/ACUIDADE/ETC): ${reissuableExamsInPending.length}`);
  if (reissuableExamsInPending.length > 0) {
    console.table(reissuableExamsInPending);
  }

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
