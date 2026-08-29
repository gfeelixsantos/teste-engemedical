const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    
    console.log('--- Buscando em schedulings ---');
    const docs = await db.collection('schedulings').find({
      NOME: /WELINGTON/i
    }).toArray();
    for (const doc of docs) {
      console.log(`ID: ${doc._id.toString()} | Nome: ${doc.NOME} | CPF: ${doc.CPFFUNCIONARIO} | Data: ${doc.DATAAGENDAMENTO} | Status: ${doc.ATENDIMENTOSTATUS}`);
    }

    console.log('\n--- Buscando em exam_form_snapshots ---');
    const snaps = await db.collection('exam_form_snapshots').find({
      $or: [
        { 'profissional.nome': /WELINGTON/i },
        { 'formulario.nome': /WELINGTON/i },
        { schedulingId: { $in: docs.map(d => d._id.toString()) } }
      ]
    }).toArray();
    console.log(`Encontrados ${snaps.length} snapshots.`);
    snaps.forEach(snap => {
      console.log(`Snap ID: ${snap._id.toString()} | Scheduling ID: ${snap.schedulingId} | Prof: ${snap.profissional?.nome} | Exams: ${JSON.stringify(snap.codigoExame)} | Date: ${snap.createdAt?.toISOString()}`);
    });

  } finally {
    await client.close();
  }
}

run().catch(console.error);
