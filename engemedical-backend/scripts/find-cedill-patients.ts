import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config();

async function main() {
  const client = new MongoClient(process.env.MONGO_URL!);
  await client.connect();
  const db = client.db(process.env.MONGO_DATABASE || 'cmso-agendamento');

  // Find recent schedulings with LABORATORIO group
  console.log('=== 10 agendamentos mais recentes com LABORATORIO ===');
  const recent = await db.collection('schedulings')
    .find({ 'EXAMES.grupo': 'LABORATORIO' })
    .sort({ DATAAGENDAMENTO: -1 })
    .limit(10)
    .toArray();
  recent.forEach((r: any) => {
    const labExames = r.EXAMES.filter((e: any) => e.grupo === 'LABORATORIO');
    console.log(`  ${r.NOME} | data: ${r.DATAAGENDAMENTO} | lab: ${labExames.map((e: any) => e.codigoExame).join(',')} | atend: ${r.atendimentoStatus || 'N/A'}`);
  });

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
