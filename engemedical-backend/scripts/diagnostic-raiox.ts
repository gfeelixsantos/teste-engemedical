/**
 * ============================================================
 *  DIAGNÓSTICO: Quantos agendamentos RAIOX existem realmente?
 * ============================================================
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/';
const MONGO_DB = process.env.MONGO_DATABASE || 'cmso-agendamento';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'schedulings';

async function main() {
  console.log('='.repeat(80));
  console.log('DIAGNÓSTICO: AGENDAMENTOS RAIOX NO MONGODB');
  console.log('='.repeat(80));

  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const collection = mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);

  // 1. Contar total de agendamentos
  const totalDocs = await collection.countDocuments();
  console.log(`\n[1] Total de agendamentos: ${totalDocs}`);

  // 2. Contar agendamentos com EXAMES
  const docsWithExams = await collection.countDocuments({ EXAMES: { $exists: true, $ne: [] } });
  console.log(`[2] Agendamentos com EXAMES: ${docsWithExams}`);

  // 3. Contar agendamentos com RAIOX pendente (query atual)
  const filterCurrent = {
    'EXAMES.status': 'AGUARDANDO_RESULTADO',
    'EXAMES.grupo': { $regex: /raio.?x|rx/i },
  };
  const raioxPending = await collection.countDocuments(filterCurrent);
  console.log(`[3] Agendamentos com RAIOX pendente (query atual): ${raioxPending}`);

  // 4. Verificar todos os grupos distintos
  console.log('\n[4] Grupos distintos nos EXAMES:');
  const groups = await collection.aggregate([
    { $unwind: '$EXAMES' },
    { $group: { _id: '$EXAMES.grupo' } },
    { $sort: { _id: 1 } },
  ]).toArray();
  for (const g of groups) {
    console.log(`    - "${g._id}"`);
  }

  // 5. Verificar statuses distintos
  console.log('\n[5] Status distintos nos EXAMES:');
  const statuses = await collection.aggregate([
    { $unwind: '$EXAMES' },
    { $group: { _id: '$EXAMES.status' } },
    { $sort: { _id: 1 } },
  ]).toArray();
  for (const s of statuses) {
    console.log(`    - "${s._id}"`);
  }

  // 6. Contar com regex mais amplo para RAIOX
  const filterBroad = {
    'EXAMES.status': 'AGUARDANDO_RESULTADO',
    'EXAMES.grupo': { $regex: /raio|rx|raiox|raio-x/i },
  };
  const raioxBroad = await collection.countDocuments(filterBroad);
  console.log(`\n[6] Agendamentos com RAIOX pendente (regex amplo): ${raioxBroad}`);

  // 7. Contar com grupo exato "RAIOX" ou "Raio-X"
  const filterExact = {
    'EXAMES.status': 'AGUARDANDO_RESULTADO',
    'EXAMES.grupo': { $in: ['RAIOX', 'Raio-X', 'raio-x', 'raiox'] },
  };
  const raioxExact = await collection.countDocuments(filterExact);
  console.log(`[7] Agendamentos com RAIOX pendente (grupo exato): ${raioxExact}`);

  // 8. Verificar se há grupo "RAIOX" sem status AGUARDANDO_RESULTADO
  const filterRaioxAnyStatus = {
    'EXAMES.grupo': { $in: ['RAIOX', 'Raio-X', 'raio-x', 'raiox'] },
  };
  const raioxAnyStatus = await collection.countDocuments(filterRaioxAnyStatus);
  console.log(`[8] Agendamentos com grupo RAIOX (qualquer status): ${raioxAnyStatus}`);

  // 9. Verificar distribuição de status para RAIOX
  console.log('\n[9] Distribuição de status para grupo RAIOX:');
  const raioxStatusDist = await collection.aggregate([
    { $unwind: '$EXAMES' },
    { $match: { 'EXAMES.grupo': { $in: ['RAIOX', 'Raio-X', 'raio-x', 'raiox'] } } },
    { $group: { _id: '$EXAMES.status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();
  for (const s of raioxStatusDist) {
    console.log(`    - "${s._id}": ${s.count}`);
  }

  // 10. Amostra de agendamentos RAIOX pendentes
  console.log('\n[10] Amostra de agendamentos RAIOX pendentes (primeiros 10):');
  const sample = await collection
    .find(filterCurrent)
    .sort({ DATAAGENDAMENTO: -1 })
    .limit(10)
    .toArray();

  for (const doc of sample) {
    const raioxExams = (doc.EXAMES || []).filter(
      (ex: any) => ex.status === 'AGUARDANDO_RESULTADO' && /raio.?x|rx/i.test(ex.grupo || ''),
    );
    console.log(`    - ${doc.NOME} | ${doc.DATAAGENDAMENTO} | ${doc.NOMEEMPRESA || 'N/I'}`);
    for (const ex of raioxExams) {
      console.log(`      [${ex.codigoExame}] ${ex.nomeExame} (${ex.grupo})`);
    }
  }

  // 11. Verificar se há agendamentos SEM data de agendamento
  const withoutDate = await collection.countDocuments({
    'EXAMES.status': 'AGUARDANDO_RESULTADO',
    'EXAMES.grupo': { $regex: /raio.?x|rx/i },
    DATAAGENDAMENTO: { $exists: false },
  });
  console.log(`\n[11] Agendamentos RAIOX sem DATAAGENDAMENTO: ${withoutDate}`);

  // 12. Verificar agendamentos com DATAAGENDAMENTO vazia
  const withEmptyDate = await collection.countDocuments({
    'EXAMES.status': 'AGUARDANDO_RESULTADO',
    'EXAMES.grupo': { $regex: /raio.?x|rx/i },
    DATAAGENDAMENTO: '',
  });
  console.log(`[12] Agendamentos RAIOX com DATAAGENDAMENTO vazia: ${withEmptyDate}`);

  await mongoClient.close();
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNÓSTICO CONCLUÍDO');
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exitCode = 1;
});
