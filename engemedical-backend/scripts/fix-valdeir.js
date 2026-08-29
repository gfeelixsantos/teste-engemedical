const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const uri = 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
  const client = new MongoClient(uri);

  const BULK_KEYS = ['status', 'anotacoes', 'examesRealizados', 'codigoMedico', 'medico'];

  try {
    await client.connect();
    const db = client.db('cmso-agendamento');
    const col = db.collection('schedulings');
    const snapCol = db.collection('exam_form_snapshots');

    const doc = await col.findOne({
      NOME: /VALDEIR ANSELMO/i,
      DATAAGENDAMENTO: '24/08/2026'
    });

    if (!doc) {
      console.log('Funcionário não encontrado!');
      return;
    }

    const docId = doc._id.toString();
    console.log(`Funcionário: ${doc.NOME} | ID: ${docId} | Empresa: ${doc.NOMEEMPRESA}`);
    console.log(`Status do Atendimento: ${doc.ATENDIMENTOSTATUS}`);

    console.log('\n--- EXAMES ATUAIS NO DB ---');
    doc.EXAMES.forEach(ex => {
      const formKeys = ex.formulario ? Object.keys(ex.formulario) : [];
      const realKeys = formKeys.filter(k => !BULK_KEYS.includes(k));
      console.log(`  [${ex.codigoExame}] ${ex.status} | Prof: ${ex.profissional || 'N/A'} | FormKeys: ${realKeys.length > 0 ? 'REAL' : formKeys.length > 0 ? 'BULK' : 'VAZIO'}`);
    });

    const snaps = await snapCol.find({ schedulingId: docId }).sort({ createdAt: 1 }).toArray();
    console.log(`\n--- SNAPSHOTS (${snaps.length}) ---`);
    snaps.forEach((snap, idx) => {
      const keys = Object.keys(snap.formulario || {});
      const realKeys = keys.filter(k => !BULK_KEYS.includes(k));
      console.log(`[${idx + 1}] ${snap.createdAt.toISOString()} | ${snap.profissional?.nome} | ${snap.sala}`);
      console.log(`  Exams: ${JSON.stringify(snap.codigoExame)} | ${realKeys.length > 0 ? '📋 REAL' : '📦 BULK'}`);
      if (realKeys.length > 0) {
        console.log(`    Keys:`, realKeys);
      }
    });

    // Check if we have a real snapshot for Psicossocial (225588)
    const psicoSnap = snaps.reverse().find(snap => {
      const exams = Array.isArray(snap.codigoExame) ? snap.codigoExame : [snap.codigoExame];
      const keys = Object.keys(snap.formulario || {});
      const isReal = keys.some(k => !BULK_KEYS.includes(k));
      return exams.includes('225588') && isReal;
    });

    if (psicoSnap) {
      console.log(`\n--- VINCULANDO PSICOSSOCIAL ---`);
      console.log(`Usando snapshot de ${psicoSnap.createdAt.toISOString()} por ${psicoSnap.profissional?.nome}`);
      
      doc.EXAMES = doc.EXAMES.map(ex => {
        if (ex.codigoExame === '225588') {
          return {
            ...ex,
            status: 'FINALIZADO',
            profissional: psicoSnap.profissional?.nome || '',
            codigoProfissional: psicoSnap.profissional?.codigo || '',
            sala: psicoSnap.sala || '',
            dataExame: psicoSnap.createdAt,
            formulario: psicoSnap.formulario,
            url: psicoSnap.url || ex.url || '',
            signature: psicoSnap.signature || ex.signature || null
          };
        }
        return ex;
      });

      await col.replaceOne({ _id: doc._id }, doc);
      console.log('✅ Psicossocial vinculado com sucesso!');
    } else {
      console.log('\n❌ Nenhum snapshot real contendo Psicossocial (225588) foi encontrado para este atendimento.');
    }

  } finally {
    await client.close();
  }
}

run().catch(console.error);
