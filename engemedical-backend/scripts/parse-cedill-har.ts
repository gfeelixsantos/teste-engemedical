import * as fs from 'fs';
import * as path from 'path';

const harPath = path.join(process.env.USERPROFILE!, 'Downloads', 'cedill.har');
const har = JSON.parse(fs.readFileSync(harPath, 'utf-8'));

const entries = har.log.entries;
console.log(`Total entries: ${entries.length}`);

// Find all POST requests (search submissions)
const posts = entries.filter((e: any) => e.request.method === 'POST');
console.log(`\nPOST requests: ${posts.length}`);

posts.forEach((post: any, idx: number) => {
  const url = post.request.url;
  const shortUrl = url.split('?')[0].split('/').pop();
  console.log(`\n--- POST #${idx + 1}: ${shortUrl} ---`);
  console.log(`  URL: ${url.substring(0, 120)}...`);
  console.log(`  Status: ${post.response.status}`);
  console.log(`  Response size: ${post.response.content.size} bytes`);
  console.log(`  MIME: ${post.response.content.mimeType}`);

  // Parse postData
  if (post.request.postData) {
    const text = post.request.postData.text || '';
    const params = post.request.postData.params || [];

    if (text) {
      console.log(`  postData text (${text.length} chars):`);
      // Parse URL-encoded form data
      const pairs = text.split('&');
      pairs.forEach((pair: string) => {
        const [key, ...rest] = pair.split('=');
        const val = decodeURIComponent(rest.join('='));
        if (val.length > 100) {
          console.log(`    ${decodeURIComponent(key)} = ${val.substring(0, 100)}...`);
        } else {
          console.log(`    ${decodeURIComponent(key)} = ${val}`);
        }
      });
    }

    if (params.length > 0) {
      console.log(`  postData params (${params.length}):`);
      params.forEach((p: any) => {
        const val = p.value || '';
        if (val.length > 100) {
          console.log(`    ${p.name} = ${val.substring(0, 100)}...`);
        } else {
          console.log(`    ${p.name} = ${val}`);
        }
      });
    }
  }

  // Check response content for key patterns
  const respText = post.response.content.text || '';
  if (respText) {
    const acionaMatch = respText.match(/aciona_evento/g);
    console.log(`  Response aciona_evento count: ${acionaMatch ? acionaMatch.length : 0}`);

    const laudoMatch = respText.match(/(\d+)\s*Laudo\(s\)/);
    if (laudoMatch) {
      console.log(`  Response Laudo count text: ${laudoMatch[0]}`);
    }

    const erroMatch = respText.match(/Erro exectando/g);
    if (erroMatch) {
      console.log(`  Response has SQL error!`);
    }
  }
});

// Also check GET requests to corpo_conectado_posto_lamina
const gets = entries.filter((e: any) =>
  e.request.method === 'GET' &&
  e.request.url.includes('corpo_conectado_posto')
);
console.log(`\nGET requests to corpo_conectado_posto: ${gets.length}`);
gets.forEach((get: any, idx: number) => {
  const respText = get.response.content.text || '';
  const acionaMatch = respText.match(/aciona_evento/g);
  const size = get.response.content.size;
  console.log(`  GET #${idx + 1}: size=${size} aciona_evento=${acionaMatch ? acionaMatch.length : 0}`);
});

// Check all entries for any interesting patterns
console.log(`\n=== All entries summary ===`);
entries.forEach((e: any, idx: number) => {
  const method = e.request.method;
  const url = e.request.url;
  const shortUrl = url.split('?')[0].split('/').slice(-2).join('/');
  const status = e.response.status;
  const size = e.response.content.size;
  if (size > 1000) {
    console.log(`  [${idx}] ${method} ${shortUrl} -> ${status} (${size} bytes)`);
  }
});
