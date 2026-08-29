const { MongoClient, MongoServerSelectionError } = require('mongodb');

async function test() {
  const base = 'mongodb://cmso360_db_user:123a5067b9';
  
  const tests = [
    { name: 'ReplicaSet (original)', url: `${base}@159.41.50.1:27017,159.41.50.44:27017,159.41.50.59:27017/cmso-agendamento?appName=local-dev&directConnection=false&serverSelectionTimeoutMS=5000` },
    { name: 'Single IP direto', url: `${base}@159.41.50.1:27017/cmso-agendamento?directConnection=true&serverSelectionTimeoutMS=5000` },
    { name: 'Second IP direto', url: `${base}@159.41.50.44:27017/cmso-agendamento?directConnection=true&serverSelectionTimeoutMS=5000` },
    { name: 'Third IP direto', url: `${base}@159.41.50.59:27017/cmso-agendamento?directConnection=true&serverSelectionTimeoutMS=5000` },
    { name: 'authSource=admin', url: `${base}@159.41.50.1:27017/cmso-agendamento?directConnection=true&authSource=admin&serverSelectionTimeoutMS=5000` },
  ];

  for (const t of tests) {
    try {
      const c = new MongoClient(t.url);
      await c.connect();
      const admin = c.db().admin();
      const info = await admin.serverStatus();
      console.log(`✅ ${t.name} => version: ${info.version}, host: ${info.host}`);
      await c.close();
      return;
    } catch (e) {
      const msg = e.message ? e.message.substring(0, 80) : String(e).substring(0, 80);
      console.log(`❌ ${t.name} => ${msg}`);
    }
  }
  console.log('\nNenhum teste conectou. Verificar credenciais/IP whitelist no servidor.');
}

test();
