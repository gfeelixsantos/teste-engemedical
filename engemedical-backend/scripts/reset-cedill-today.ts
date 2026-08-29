/**
 * Script de correção: Reverter exames "Laboratório" do Cedill finalizados hoje
 * de volta para AGUARDANDO_RESULTADO.
 *
 * Uso: npx ts-node -r tsconfig-paths/register scripts/reset-cedill-today.ts
 *   ou: node -r ts-node/register -r tsconfig-paths/register scripts/reset-cedill-today.ts
 *
 * Flags opcionais:
 *   --dry-run   Mostra o que seria alterado sem gravar no MongoDB
 *   --apply     Aplica as alterações (sem esta flag nada é alterado)
 *   --date=DD/MM/AAAA  Override da data (padrão: hoje)
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const DRY_RUN = !process.argv.includes('--apply');
const dateOverride = process.argv.find(a => a.startsWith('--date='));
const targetDate = dateOverride
  ? dateOverride.split('=')[1]
  : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const LABORATORIO_GROUPS = ['Laboratório', 'LABORATORIO', 'Laboratorio'];

async function main() {
  console.log('='.repeat(70));
  console.log(`SCRIPT DE CORREÇÃO — Reverter exames Laboratório Cedill (${targetDate})`);
  console.log(`Modo: ${DRY_RUN ? '🔍 DRY-RUN (nenhuma alteração será gravada)' : '⚠️  APPLY (alterações serão gravadas)'}`);
  console.log('='.repeat(70));

  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error('❌ MONGO_URL não definida no .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGO_DATABASE || 'cmso-agendamento';
  const db = client.db(dbName);
  const coll = db.collection('schedulings');

  // 1. Buscar agendamentos de hoje com exames Laboratório finalizados
  const query = {
    DATAAGENDAMENTO: targetDate,
    EXAMES: {
      $elemMatch: {
        status: 'FINALIZADO',
        $or: LABORATORIO_GROUPS.map(g => ({ grupo: g })),
      },
    },
  };

  console.log('\n[1] Buscando agendamentos...');
  console.log('    Query:', JSON.stringify(query, null, 2));

  const docs = await coll.find(query).toArray();
  console.log(`    Encontrados: ${docs.length} agendamento(s)`);

  if (docs.length === 0) {
    console.log('\n✅ Nenhum agendamento para reverter. Saindo.');
    await client.close();
    return;
  }

  // 2. Analisar cada agendamento
  let totalExamsReset = 0;
  const details: any[] = [];

  for (const doc of docs) {
    const exams = doc.EXAMES || [];
    const labExams = exams.filter((ex: any) =>
      ex.status === 'FINALIZADO' &&
      LABORATORIO_GROUPS.includes(ex.grupo)
    );

    if (labExams.length === 0) continue;

    console.log(`\n[${doc.NOME}] (${doc.CPFFUNCIONARIO || 's/CPF'})`);
    console.log(`    SchedulingId: ${doc._id}`);
    console.log(`    Data agendamento: ${doc.DATAAGENDAMENTO}`);

    for (const ex of labExams) {
      console.log(`    📋 ${ex.codigoExame} — ${ex.nomeExame || '(s/nome)'}`);
      console.log(`       Grupo: ${ex.grupo} | Status atual: ${ex.status}`);
      console.log(`       URL: ${ex.url || '(sem URL)'}`);
      totalExamsReset++;
    }

    details.push({
      schedulingId: doc._id.toString(),
      nome: doc.NOME,
      cpf: doc.CPFFUNCIONARIO,
      examCount: labExams.length,
      exams: labExams.map((ex: any) => ({
        codigoExame: ex.codigoExame,
        nomeExame: ex.nomeExame,
        grupo: ex.grupo,
        url: ex.url,
      })),
    });
  }

  console.log(`\n[2] Total de exames Laboratório a reverter: ${totalExamsReset}`);

  if (totalExamsReset === 0) {
    console.log('\n✅ Nenhum exame para reverter. Saindo.');
    await client.close();
    return;
  }

  // 3. Aplicar alterações
  if (DRY_RUN) {
    console.log('\n🔍 DRY-RUN: Nenhuma alteração gravada. Use --apply para aplicar.');
  } else {
    console.log('\n[3] Aplicando alterações...');

    let updatedCount = 0;
    for (const doc of docs) {
      const result = await coll.updateOne(
        { _id: new ObjectId(doc._id) },
        {
          $set: {
            EXAMES: doc.EXAMES.map((ex: any) => {
              if (ex.status === 'FINALIZADO' && LABORATORIO_GROUPS.includes(ex.grupo)) {
                return { ...ex, status: 'AGUARDANDO_RESULTADO' };
              }
              return ex;
            }),
          },
        },
      );
      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`    ✅ ${doc.NOME} — ${doc._id}`);
      }
    }

    console.log(`\n✅ Concluído! ${updatedCount} agendamento(s) atualizado(s), ${totalExamsReset} exame(s) revertido(s) para AGUARDANDO_RESULTADO.`);
  }

  // 4. Salvar relatório
  const report = {
    timestamp: new Date().toISOString(),
    date: targetDate,
    dryRun: DRY_RUN,
    totalSchedulings: docs.length,
    totalExamsReset,
    details,
  };

  const fs = require('fs');
  const reportPath = `C:\\Users\\FELIX\\Desktop\\WORKSPACE\\CMSO360\\cmso360-backend\\debug\\reset-cedill-${targetDate.replace(/\//g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Relatório salvo em: ${reportPath}`);

  await client.close();
}

main().catch(e => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});
