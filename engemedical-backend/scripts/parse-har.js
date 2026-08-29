const fs = require('fs');
const path = require('path');

async function run() {
  const harPath = 'C:/Users/FELIX/Downloads/login.har';
  
  if (!fs.existsSync(harPath)) {
    console.error(`File not found at: ${harPath}`);
    return;
  }

  const fileContent = fs.readFileSync(harPath, 'utf8');
  const har = JSON.parse(fileContent);

  const entries = har.log.entries;
  console.log(`Loaded HAR file with ${entries.length} entries.`);

  // Sort entries by duration descending
  const sorted = entries.map(entry => {
    return {
      url: entry.request.url,
      method: entry.request.method,
      status: entry.response.status,
      time: entry.time, // in ms
      wait: entry.timings.wait, // time waiting for response
      receive: entry.timings.receive,
      send: entry.timings.send,
      connect: entry.timings.connect,
      dns: entry.timings.dns,
      startedDateTime: entry.startedDateTime
    };
  }).sort((a, b) => b.time - a.time);

  console.log('\nTop 20 slowest requests:');
  sorted.slice(0, 20).forEach((item, index) => {
    console.log(`${index + 1}. [${item.method}] ${item.url}`);
    console.log(`   Total Time: ${item.time.toFixed(2)}ms | Wait: ${item.wait.toFixed(2)}ms | Status: ${item.status} | Started: ${item.startedDateTime}`);
  });
}

run().catch(console.error);
