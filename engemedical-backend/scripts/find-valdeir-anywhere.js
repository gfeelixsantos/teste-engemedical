const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    const snapCol = db.collection('exam_form_snapshots');

    const query = {
      $or: [
        { 'profissional.nome': /VALDEIR/i },
        { 'formulario.nome': /VALDEIR/i },
        { 'formulario.funcionario.nome': /VALDEIR/i },
        { 'formulario.funcionario.cpf': /16789815830/ },
        { 'formulario.funcionario.cpf': /167\.898\.158-30/ },
        { 'formulario.cpf': /16789815830/ },
        { 'formulario.cpf': /167\.898\.158-30/ }
      ]
    };

    const snaps = await snapCol.find(query).toArray();
    console.log(`Total snaps found anywhere: ${snaps.length}`);
    for (const snap of snaps) {
      console.log(`\nSnap ID: ${snap._id.toString()}`);
      console.log(`  SchedulingId: ${snap.schedulingId}`);
      console.log(`  Exams: ${JSON.stringify(snap.codigoExame)}`);
      console.log(`  Data: ${snap.createdAt?.toISOString()}`);
      console.log(`  Prof: ${snap.profissional?.nome}`);
      console.log(`  Form Keys:`, Object.keys(snap.formulario || {}));
    }

  } finally {
    await client.close();
  }
}

run().catch(console.error);
