const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    const snapCol = db.collection('exam_form_snapshots');
    const schedCol = db.collection('schedulings');

    const start = new Date('2026-08-24T00:00:00.000Z');
    const end = new Date('2026-08-25T23:59:59.999Z');

    const snaps = await snapCol.find({
      codigoExame: '225588',
      createdAt: { $gte: start, $lte: end }
    }).toArray();

    console.log(`Encontrados ${snaps.length} snapshots de Psicossocial entre 24/08 e 25/08:`);
    
    for (const snap of snaps) {
      const sched = await schedCol.findOne({ _id: new (require('mongodb').ObjectId)(snap.schedulingId) });
      const keys = Object.keys(snap.formulario || {});
      const realKeys = keys.filter(k => !['status', 'anotacoes', 'examesRealizados', 'codigoMedico', 'medico'].includes(k));
      console.log(`\nSnap ID: ${snap._id.toString()} | Sched ID: ${snap.schedulingId}`);
      console.log(`  Func: ${sched ? sched.NOME : 'Não encontrado'} | CPF: ${sched ? sched.CPFFUNCIONARIO : 'N/A'}`);
      console.log(`  Data: ${snap.createdAt.toISOString()} | Prof: ${snap.profissional?.nome}`);
      console.log(`  Real Keys:`, realKeys);
    }

  } finally {
    await client.close();
  }
}

run().catch(console.error);
