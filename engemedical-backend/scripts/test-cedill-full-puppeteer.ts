const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const qs = require('qs');
puppeteerExtra.use(StealthPlugin());

async function main() {
  const baseUrl = 'https://www.veusserver.com';
  
  // Login via axios
  const payload = qs.stringify({ empresa: 'labcenter', posto: 'CMSO', senha: '70432356' }, { format: 'RFC1738' });
  const loginResp = await axios.post(`${baseUrl}/veus_geral/valida_usuario_novo.php`, payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    maxRedirects: 5, validateStatus: (s) => s < 500,
  });
  const match = String(loginResp.data).match(/sessao_id=([a-zA-Z0-9]+)/);
  if (!match) { console.error('No sessao_id'); return; }
  const sessaoId = match[1];
  console.log(`sessao_id: ${sessaoId.substring(0, 12)}...`);

  const browser = await puppeteerExtra.launch({
    headless: 'new' as any,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const dadosCic = 'CMSO - CENTRO MÉDICO SAUDE OCUPACIONAL||CMSO||'.replace(/ /g, '%20');
  const searchUrl = `${baseUrl}/veus_laudo/corpo_conectado_posto_lamina.php?sessao_id=${sessaoId}&dados_cic_posto_t=${dadosCic}&totem=`;
  
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Check: what does the initial GET page show? Does it have results already?
  const initHtml = await page.content();
  const initAciona = (initHtml.match(/aciona_evento\(event,/g) || []).length;
  const initLaudos = initHtml.match(/(\d+)\s*Laudo/);
  console.log(`Initial GET: size=${initHtml.length}, acionaEventCalls=${initAciona}, laudos=${initLaudos ? initLaudos[0] : 'NOT FOUND'}`);

  // Check the full form HTML
  const formHtml = await page.evaluate(() => {
    const form = (document as any).corpo_conectado_posto;
    return form ? form.outerHTML.substring(0, 3000) : 'FORM NOT FOUND';
  });
  console.log(`Form HTML (3000): ${formHtml}`);
  
  // Also: try the portal with NO search (just default view)
  // The form starts with action='' method='' — maybe we need to submit it with procura=2 (not 1)
  console.log('\n--- Try procura=2 (default view) ---');
  await page.evaluate((sessaoId) => {
    (window as any).__cfRLUnblockHandlers = true;
    const form = (document as any).corpo_conectado_posto;
    form.procura.value = '2';
    form.method = 'POST';
    form.action = 'corpo_conectado_posto_lamina.php?sessao_id=' + sessaoId;
    form.submit();
  }, sessaoId);

  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  const html2 = await page.content();
  const aciona2 = (html2.match(/aciona_evento\(event,/g) || []).length;
  const laudos2 = html2.match(/(\d+)\s*Laudo/);
  console.log(`procura=2 result: size=${html2.length}, acionaEventCalls=${aciona2}, laudos=${laudos2 ? laudos2[0] : 'NOT FOUND'}`);
  
  if (aciona2 > 0) {
    const snippet = html2.match(/aciona_evento\(event,'([^']+)'/);
    console.log(`First result nic: ${snippet ? snippet[1] : 'NOT FOUND'}`);
  }

  await browser.close();
}

main().catch(console.error);
