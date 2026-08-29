const { MongoClient } = require('mongodb');

const MONGO_URL = "mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360";
const MONGO_DATABASE = "cmso-agendamento";

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(MONGO_DATABASE);

  const startDate = new Date('2026-08-14T00:00:00.000Z');
  const endDate = new Date('2026-08-17T23:59:59.999Z');

  const query = {
    $or: [
      { 'updatedAt': { $gte: startDate, $lte: endDate } },
      { 'createdAt': { $gte: startDate, $lte: endDate } },
      { 'DATAAGENDAMENTO': { $regex: '^(14|15|16|17)/08/2026' } },
    ],
    'PARECERMEDICO': { $in: ['APTO_COM_ORIENTACAO', 'APTO_COM_RESTRICAO', 'INAPTO', 'INAPTO_TEMPORARIAMENTE', 'INAPTO_TEMPORARIO'] }
  };

  const docs = await db.collection('schedulings').find(query).toArray();

  console.log(`Encontrados ${docs.length} pareceres com orientação/restrição/inaptidão no período:\n`);

  let countFlagTrue = 0;
  let countFlagFalseOrNull = 0;

  docs.forEach(doc => {
    const flag = doc.ASOINFO?.parecerEquipeEmailSent;
    if (flag === true) countFlagTrue++;
    else countFlagFalseOrNull++;

    console.log(`ID: ${doc._id} | ${doc.NOME} | Parecer: ${doc.PARECERMEDICO} | parecerEquipeEmailSent: ${flag}`);
  });

  console.log(`\n==================================================`);
  console.log(`parecerEquipeEmailSent === true:       ${countFlagTrue}`);
  console.log(`parecerEquipeEmailSent === false/null: ${countFlagFalseOrNull}`);
  console.log(`==================================================\n`);

  await client.close();
}

main().catch(console.error);
