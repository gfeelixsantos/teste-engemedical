const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    const snapCol = db.collection('exam_form_snapshots');
    const schedCol = db.collection('schedulings');

    // Valdeir's other exams were between 11:15 and 11:30 on 2026-08-24 UTC
    const start = new Date('2026-08-24T11:00:00.000Z');
    const end = new Date('2026-08-24T12:00:00.000Z');

    const snaps = await snapCol.find({
      codigoExame: '225588',
      createdAt: { $gte: start, $lte: end }
    }).toArray();

    console.log(`Encontrados ${snaps.length} snapshots de Psicossocial entre 11:00 e 12:00 UTC em 24/08:`);
    for (const snap of snaps) {
      const sched = await schedCol.findOne({ _id: new (require('mongodb').ObjectId)(snap.schedulingId) });
      console.log(`\nSnap ID: ${snap._id.toString()} | Sched ID: ${snap.schedulingId}`);
      console.log(`  Func: ${sched ? sched.NOME : 'Não encontrado'} | CPF: ${sched ? sched.CPFFUNCIONARIO : 'N/A'}`);
      console.log(`  Data: ${snap.createdAt.toISOString()} | Prof: ${snap.profissional?.nome}`);
    }

  } finally {
    await client.close();
  }
}

run().catch(console.error);
