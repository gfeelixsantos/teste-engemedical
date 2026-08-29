const net = require('net');

console.log('Testando conexão TCP para 159.41.50.1:27017...');

const c = net.createConnection({ host: '159.41.50.1', port: 27017 }, () => {
  console.log('TCP conectou!');
  c.end();
});

c.on('error', (e) => {
  console.log('Erro:', e.code, e.message);
});

c.on('close', () => {
  console.log('Conexão fechada');
});

setTimeout(() => process.exit(0), 3000);
