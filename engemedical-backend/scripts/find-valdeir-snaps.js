const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    const snapCol = db.collection('exam_form_snapshots');
    const schedCol = db.collection('schedulings');

    // 1. Search in schedulings
    console.log('--- BUSCANDO VALDEIR EM SCHEDULINGS ---');
    const scheds = await schedCol.find({ NOME: /VALDEIR/i }).toArray();
    for (const s of scheds) {
      console.log(`ID: ${s._id.toString()} | Nome: ${s.NOME} | CPF: ${s.CPFFUNCIONARIO} | Data: ${s.DATAAGENDAMENTO} | Status: ${s.ATENDIMENTOSTATUS}`);
    }

    // 2. Search for all snapshots that might match Valdeir Anselmo's name in their formulario or schedulingId
    console.log('\n--- BUSCANDO SNAPSHOTS ---');
    const schedIds = scheds.map(s => s._id.toString());
    const snaps = await snapCol.find({
      $or: [
        { schedulingId: { $in: schedIds } },
        { 'formulario.nome': /VALDEIR/i },
        { 'formulario.funcionario': /VALDEIR/i }
      ]
    }).toArray();

    console.log(`Encontrados ${snaps.length} snapshots:`);
    snaps.forEach(snap => {
      const keys = Object.keys(snap.formulario || {});
      const realKeys = keys.filter(k => !['status', 'anotacoes', 'examesRealizados', 'codigoMedico', 'medico'].includes(k));
      console.log(`\nSnap ID: ${snap._id.toString()} | Scheduling ID: ${snap.schedulingId}`);
      console.log(`  Data: ${snap.createdAt?.toISOString()}`);
      console.log(`  Prof: ${snap.profissional?.nome} | Exams: ${JSON.stringify(snap.codigoExame)}`);
      console.log(`  FormType: ${realKeys.length > 0 ? '📋 REAL (' + realKeys.slice(0, 4).join(', ') + '...)' : '📦 BULK'}`);
    });

  } finally {
    await client.close();
  }
}

run().catch(console.error);
