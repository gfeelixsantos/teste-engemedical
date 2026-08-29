/**
 * Script para buscar documento de ANDREA DA SILVA SANTOS (20/08/2026)
 * para análise de exames hemograma e parasitológico
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  if (process.stdout.reconfigure) process.stdout.reconfigure({ encoding: 'utf8' });
  if (process.stderr.reconfigure) process.stderr.reconfigure({ encoding: 'utf8' });

  const mongoUri = 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/?appName=engemedical-connect';
  console.log(`Conectando ao MongoDB...`);
  const client = new MongoClient(mongoUri);
  await client.connect();
  console.log(`✓ Conectado`);

  // Listar bancos disponíveis
  console.log(`\nBancos de dados disponíveis:`);
  const adminDb = client.db().admin();
  const databases = await adminDb.listDatabases();
  databases.databases.forEach((d) => {
    console.log(`  - ${d.name} (${d.sizeOnDisk} bytes)`);
  });

  // Usar o banco cmso-agendamento
  const db = client.db('cmso-agendamento');
  console.log(`\nUsando banco: cmso-agendamento`);
  const schedulingsCollection = db.collection('schedulings');

  // Primeiro, listar algumas collections disponíveis
  console.log(`\nCollections disponíveis:`);
  const collections = await db.listCollections().toArray();
  collections.forEach((c) => {
    console.log(`  - ${c.name}`);
  });

  // Listar alguns documentos da coleção schedulings para entender a estrutura
  console.log(`\nBuscando documentos recentes em schedulings...`);
  const sampleDocs = await schedulingsCollection.find().limit(3).toArray();
  console.log(`Encontrados ${sampleDocs.length} documentos de amostra:`);
  sampleDocs.forEach((d, i) => {
    console.log(`  [${i + 1}] ${d.NOME} - ${d.DATAAGENDAMENTO}`);
  });

  // Buscar documento de ANDREA DA SILVA SANTOS com data 20/08/2026
  console.log(`\nBuscando: ANDREA DA SILVA SANTOS - 20/08/2026`);
  let doc = await schedulingsCollection.findOne({
    NOME: 'ANDREA DA SILVA SANTOS',
    DATAAGENDAMENTO: '20/08/2026',
  });

  // Se não encontrar, tentar busca mais flexível
  if (!doc) {
    console.log(`\nBusca exata não encontrada. Tentando busca apenas pelo nome...`);
    doc = await schedulingsCollection.findOne({
      NOME: 'ANDREA DA SILVA SANTOS',
    });
  }

  if (!doc) {
    console.log(`\nBusca por nome não encontrada. Tentando busca parcial...`);
    const docs = await schedulingsCollection.find({
      NOME: { $regex: 'ANDREA', $options: 'i' },
    }).limit(5).toArray();

    if (docs.length > 0) {
      console.log(`\nEncontrados ${docs.length} documentos com "ANDREA" no nome:`);
      docs.forEach((d, i) => {
        console.log(`  [${i + 1}] ${d.NOME} - ${d.DATAAGENDAMENTO} - ${d.TIPOEXAMENOME}`);
      });
      console.log(`\nUsando o primeiro resultado...`);
      doc = docs[0];
    } else {
      console.log(`\nNenhum documento com "ANDREA" encontrado. Buscando documento recente com exames laboratoriais...`);
      const recentDocs = await schedulingsCollection.find({
        'EXAMES.grupo': { $regex: 'LABORATORIO', $options: 'i' },
      }).limit(3).toArray();

      if (recentDocs.length > 0) {
        console.log(`\nEncontrados ${recentDocs.length} documentos recentes com exames laboratoriais:`);
        recentDocs.forEach((d, i) => {
          console.log(`  [${i + 1}] ${d.NOME} - ${d.DATAAGENDAMENTO} - ${d.TIPOEXAMENOME}`);
        });
        console.log(`\nUsando o primeiro resultado...`);
        doc = recentDocs[0];
      }
    }
  }

  if (!doc) {
    console.log(`\n✗ Documento não encontrado`);
    await client.close();
    process.exit(1);
  }

  console.log(`\n✓ Documento encontrado:`);
  console.log(`  ID: ${doc._id}`);
  console.log(`  Nome: ${doc.NOME}`);
  console.log(`  CPF: ${doc.CPFFUNCIONARIO}`);
  console.log(`  Data Agendamento: ${doc.DATAAGENDAMENTO}`);
  console.log(`  Tipo Exame: ${doc.TIPOEXAMENOME}`);
  console.log(`  Empresa: ${doc.NOMEEMPRESA}`);

  console.log(`\nExames (${doc.EXAMES?.length || 0}):`);
  if (doc.EXAMES && doc.EXAMES.length > 0) {
    doc.EXAMES.forEach((ex, i) => {
      console.log(`  [${i + 1}] ${ex.nomeExame}`);
      console.log(`      Código: ${ex.codigoExame}`);
      console.log(`      Grupo: ${ex.grupo}`);
      console.log(`      Status: ${ex.status}`);
      console.log(`      URL: ${ex.url || '(vazio)'}`);
      if (ex.signature) {
        console.log(`      Signature.lastCommandId: ${ex.signature.lastCommandId || '(vazio)'}`);
        console.log(`      Signature.lastUpdatedAt: ${ex.signature.lastUpdatedAt || '(vazio)'}`);
      }
      console.log(``);
    });

    // Agrupar por grupo
    console.log(`\nAgrupamento por grupo:`);
    const grupos = {};
    doc.EXAMES.forEach((ex) => {
      if (!grupos[ex.grupo]) grupos[ex.grupo] = [];
      grupos[ex.grupo].push(ex);
    });

    Object.keys(grupos).forEach((grupo) => {
      console.log(`\n  Grupo: ${grupo}`);
      grupos[grupo].forEach((ex) => {
        console.log(`    - ${ex.nomeExame}: ${ex.status} | URL: ${ex.url ? 'SIM' : 'NÃO'}`);
      });
    });

    // Verificar inconsistência de URLs no mesmo grupo
    console.log(`\n\nVerificação de inconsistência de URLs por grupo:`);
    Object.keys(grupos).forEach((grupo) => {
      const exames = grupos[grupo];
      const urls = exames.map((ex) => ex.url).filter((u) => u);
      
      if (urls.length > 0) {
        const uniqueUrls = [...new Set(urls)];
        if (uniqueUrls.length > 1) {
          console.log(`  ✗ ${grupo}: URLs DIFERENTES (${uniqueUrls.length} URLs distintas)`);
          uniqueUrls.forEach((url, idx) => {
            const examesComUrl = exames.filter((ex) => ex.url === url);
            console.log(`      URL ${idx + 1}: ${examesComUrl.map((e) => e.nomeExame).join(', ')}`);
          });
        } else {
          console.log(`  ✓ ${grupo}: Mesma URL para todos os exames finalizados`);
        }
      } else {
        console.log(`  - ${grupo}: Nenhum exame com URL`);
      }
    });
  } else {
    console.log(`  (Nenhum exame)`);
  }

  // Buscar outros documentos com exames laboratoriais para verificar inconsistências
  console.log(`\n\n========================================`);
  console.log(`Buscando outros documentos com exames laboratoriais...`);
  console.log(`========================================\n`);

  const laboratorioDocs = await schedulingsCollection.find({
    'EXAMES.grupo': { $regex: 'laborat', $options: 'i' },
  }).limit(20).toArray();

  console.log(`Encontrados ${laboratorioDocs.length} documentos com exames laboratoriais:\n`);

  let inconsistentCount = 0;

  for (const d of laboratorioDocs) {
    const labExams = d.EXAMES.filter((ex) => 
      ex.grupo && ex.grupo.toLowerCase().includes('laboratorio') && ex.status === 'FINALIZADO' && ex.url
    );

    if (labExams.length > 1) {
      const urls = labExams.map((ex) => ex.url);
      const uniqueUrls = [...new Set(urls)];

      if (uniqueUrls.length > 1) {
        inconsistentCount++;
        console.log(`✗ ${d.NOME} - ${d.DATAAGENDAMENTO}: URLs DIFERENTES no grupo Laboratório`);
        uniqueUrls.forEach((url, idx) => {
          const examesComUrl = labExams.filter((ex) => ex.url === url);
          console.log(`    URL ${idx + 1}: ${examesComUrl.map((e) => e.nomeExame).join(', ')}`);
        });
        console.log(``);
      }
    }
  }

  if (inconsistentCount === 0) {
    console.log(`✓ Nenhum documento com inconsistência de URLs no grupo Laboratório encontrado.`);
  } else {
    console.log(`\nTotal de documentos com inconsistência: ${inconsistentCount}`);
  }

  await client.close();
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
