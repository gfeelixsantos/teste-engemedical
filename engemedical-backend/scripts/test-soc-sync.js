const fetch = require('node-fetch');

async function run() {
  const schedulingId = '6a71df4b8960148d09b99462';
  const url = 'http://localhost:3000/api/soc/sincronizar-prontuario'; // Or similar local port

  console.log('Testando sincronização com SOC para Valdeir Anselmo...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        schedulingId: schedulingId,
        empresa: '1434953', // from CODIGOEMPRESA / Empresa ID
        funcionario: '16492' // from Valdeir Anselmo CODIGO
      })
    });

    const data = await response.json();
    console.log('Resposta do SOC:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro ao conectar ao servidor local para SOC:', err.message);
  }
}

run().catch(console.error);
