const axios = require('axios');
const qs = require('qs');

async function main() {
  const baseUrl = 'https://www.veusserver.com';
  
  // Login
  const payload = qs.stringify({ empresa: 'labcenter', posto: 'CMSO', senha: '70432356' }, { format: 'RFC1738' });
  const resp = await axios.post(`${baseUrl}/veus_geral/valida_usuario_novo.php`, payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    maxRedirects: 5, validateStatus: (s) => s < 500,
  });
  
  console.log('Status:', resp.status);
  console.log('Final URL:', resp.request.res.responseUrl);
  console.log('Headers:', JSON.stringify(resp.headers, null, 2));
  console.log('Body (500):', String(resp.data).substring(0, 500));
  
  // Try to find sessao_id in body
  const match = String(resp.data).match(/sessao_id=([a-zA-Z0-9]+)/);
  if (match) console.log('sessao_id from body:', match[1]);
}

main().catch(console.error);
