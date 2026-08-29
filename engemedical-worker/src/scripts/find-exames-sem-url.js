const { MongoClient } = require('mongodb');

const MONGO_URL = "mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360";
const MONGO_DATABASE = "cmso-agendamento";

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(MONGO_DATABASE);

  // Query otimizada: busca atendimentos do período com exames que tenham formulário
  const query = {
    'DATAAGENDAMENTO': { $regex: '^(15|16|17)/08/2026' },
    'EXAMES.formulario': { $exists: true, $ne: null, $ne: '' }
  };

  const schedulings = await db.collection('schedulings')
    .find(query)
    .sort({ _id: -1 })
    .toArray();

  console.log(`\n==================================================`);
  console.log(`  Diagnóstico de Exames Sem URL (15/08 a 17/08)`);
  console.log(`==================================================`);
  console.log(`Total de atendimentos analisados no período: ${schedulings.length}\n`);

  let totalExamesSemUrl = 0;
  let atendimentosComExamesSemUrl = 0;

  const relatorio = [];

  for (const s of schedulings) {
    const exames = Array.isArray(s.EXAMES) ? s.EXAMES : [];
    const examesSemUrl = exames.filter(ex => {
      const temFormulario = ex.formulario && typeof ex.formulario === 'object' && Object.keys(ex.formulario).length > 0;
      const semUrl = !ex.url || ex.url.trim() === '';
      return temFormulario && semUrl;
    });

    if (examesSemUrl.length > 0) {
      atendimentosComExamesSemUrl++;
      totalExamesSemUrl += examesSemUrl.length;

      relatorio.push({
        schedulingId: s._id.toString(),
        nomeFuncionario: s.NOME,
        nomeEmpresa: s.NOMEEMPRESA,
        dataAgendamento: s.DATAAGENDAMENTO,
        prontuario: s.CODIGOPRONTUARIO,
        exames: examesSemUrl.map(ex => ({
          nomeExame: ex.nomeExame || ex.grupo || 'Exame',
          grupo: ex.grupo || 'Geral',
          codigoExame: ex.codigoExame || ex.codigo || '',
          temFormulario: true,
          url: ex.url || null
        }))
      });
    }
  }

  console.log(`🎯 Atendimentos com exames preenchidos SEM URL: ${atendimentosComExamesSemUrl}`);
  console.log(`📄 Total de exames pendentes de geração PDF: ${totalExamesSemUrl}\n`);

  relatorio.forEach((item, index) => {
    console.log(`${index + 1}. [ID: ${item.schedulingId}] - ${item.nomeFuncionario} | ${item.nomeEmpresa}`);
    console.log(`   Data: ${item.dataAgendamento} | Prontuário: ${item.prontuario || 'N/D'}`);
    item.exames.forEach(ex => {
      console.log(`   ➜ Exame: ${ex.nomeExame} (Grupo: ${ex.grupo}) | Sem URL`);
    });
    console.log(`--------------------------------------------------`);
  });

  await client.close();
}

main().catch(console.error);
