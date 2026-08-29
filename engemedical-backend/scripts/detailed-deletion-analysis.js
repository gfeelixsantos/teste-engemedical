const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function run() {
  try {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.MONGO_DATABASE);
    
    const deletions = JSON.parse(fs.readFileSync('deletions_report.json', 'utf8'));
    console.log(`Processing ${deletions.length} deletions...`);
    
    const analysis = [];
    
    for (const del of deletions) {
      const snapshot = del.snapshot || {};
      const res = snapshot.resumo || {};
      
      const patientCode = snapshot.pacienteCodigo || del.pacienteCodigo;
      const patientName = snapshot.pacienteNome || del.pacienteNome;
      const examCode = res.exameCodigo;
      const examName = res.exameNome;
      const blobPath = res.blobPath || '';
      
      // Extract companyCode and prontuario from blobPath if possible
      // e.g., .../prontuarios/2026/08/1303551/1303551-78-1-15082026/...
      let companyCode = '';
      let prontuario = '';
      if (blobPath) {
        const parts = blobPath.split('/');
        // The prontuario part looks like "1303551-78-1-15082026"
        const prPart = parts.find(p => p.includes('-'));
        if (prPart) {
          prontuario = prPart;
          companyCode = prPart.split('-')[0];
        }
      }
      
      // Query scheduling doc
      let query = {};
      if (prontuario) {
        query.CODIGOPRONTUARIO = prontuario;
      } else {
        query.CODIGO = patientCode;
        query.NOME = new RegExp(patientName.split(' ')[0], 'i');
      }
      
      const scheduling = await db.collection('schedulings').findOne(query);
      
      analysis.push({
        deletionId: del._id,
        criadoEm: del.criadoEm,
        motivo: del.motivo,
        criadoPor: del.criadoPor?.nome || del.criadoPor?.codigo,
        pacienteCodigo: patientCode,
        pacienteNome: patientName,
        examCode,
        examName,
        blobPath,
        companyCode,
        prontuario,
        schedulingId: scheduling ? scheduling._id.toString() : null,
        schedulingStatus: scheduling ? scheduling.ATENDIMENTOSTATUS : null,
        schedulingExams: scheduling ? scheduling.EXAMES.map(e => ({ codigoExame: e.codigoExame, nomeExame: e.nomeExame, status: e.status, url: e.url })) : []
      });
    }
    
    fs.writeFileSync('deletions_detailed_analysis.json', JSON.stringify(analysis, null, 2));
    console.log(`Saved detailed analysis to deletions_detailed_analysis.json`);
    
    await client.close();
  } catch(e) {
    console.error(e);
  }
}
run();
