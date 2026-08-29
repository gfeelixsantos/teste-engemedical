import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URL || 'mongodb+srv://engemedical-connect_db_user:123a5067b9@engemedical-connect.nyei7qg.mongodb.net/';
const MONGO_DB = process.env.MONGO_DATABASE || 'cmso-agendamento';

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const col = client.db(MONGO_DB).collection('schedulings');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('Data atual:', today.toLocaleDateString('pt-BR'));
  console.log('');

  function parseDate(dateStr: string): Date | null {
    const parts = (dateStr || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!parts) return null;
    return new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
  }

  function getDateCategory(dateStr: string): string {
    const d = parseDate(dateStr);
    if (!d) return 'INVALIDO';
    if (d.getTime() === today.getTime()) return 'HOJE';
    return d < today ? 'PASSADO' : 'FUTURO';
  }

  // RAIOX PENDENTE
  console.log('=== RAIOX com status PENDENTE ===');
  const pendentes = await col.aggregate([
    { $unwind: '$EXAMES' },
    { $match: {
      'EXAMES.status': 'PENDENTE',
      'EXAMES.grupo': { $in: ['RAIOX', 'Raio-X', 'raio-x', 'raiox'] }
    }},
    { $group: { _id: '$DATAAGENDAMENTO', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();

  let totalPassado = 0, totalFuturo = 0, totalHoje = 0;
  for (const p of pendentes) {
    const cat = getDateCategory(p._id);
    if (cat === 'PASSADO') totalPassado += p.count;
    else if (cat === 'HOJE') totalHoje += p.count;
    else totalFuturo += p.count;
    console.log(`  ${p._id || '(vazio)'} -> ${cat} (${p.count})`);
  }
  console.log(`\n  PASSADO: ${totalPassado} | HOJE: ${totalHoje} | FUTURO: ${totalFuturo}`);
  console.log(`  TOTAL: ${totalPassado + totalHoje + totalFuturo}`);

  // RAIOX AGUARDANDO_RESULTADO
  console.log('\n=== RAIOX com status AGUARDANDO_RESULTADO ===');
  const aguardando = await col.aggregate([
    { $unwind: '$EXAMES' },
    { $match: {
      'EXAMES.status': 'AGUARDANDO_RESULTADO',
      'EXAMES.grupo': { $in: ['RAIOX', 'Raio-X', 'raio-x', 'raiox'] }
    }},
    { $group: { _id: '$DATAAGENDAMENTO', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();

  let totalPassado2 = 0, totalFuturo2 = 0, totalHoje2 = 0;
  for (const p of aguardando) {
    const cat = getDateCategory(p._id);
    if (cat === 'PASSADO') totalPassado2 += p.count;
    else if (cat === 'HOJE') totalHoje2 += p.count;
    else totalFuturo2 += p.count;
    console.log(`  ${p._id || '(vazio)'} -> ${cat} (${p.count})`);
  }
  console.log(`\n  PASSADO: ${totalPassado2} | HOJE: ${totalHoje2} | FUTURO: ${totalFuturo2}`);
  console.log(`  TOTAL: ${totalPassado2 + totalHoje2 + totalFuturo2}`);

  // RESUMO COMPARATIVO
  console.log('\n' + '='.repeat(60));
  console.log('RESUMO COMPARATIVO');
  console.log('='.repeat(60));
  console.log(`PENDENTE:              PASSADO=${totalPassado} | HOJE=${totalHoje} | FUTURO=${totalFuturo}`);
  console.log(`AGUARDANDO_RESULTADO:  PASSADO=${totalPassado2} | HOJE=${totalHoje2} | FUTURO=${totalFuturo2}`);
  console.log(`TOTAL:                 PASSADO=${totalPassado + totalPassado2} | HOJE=${totalHoje + totalHoje2} | FUTURO=${totalFuturo + totalFuturo2}`);

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
