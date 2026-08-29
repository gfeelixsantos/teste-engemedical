const fs = require('fs');
const data = JSON.parse(fs.readFileSync('deletions_report.json', 'utf8'));

const rxDeletes = data.filter(d => d.snapshot?.resumo?.exameCodigo === '32050070');
if (rxDeletes.length > 0) {
  console.log("Full Snapshot of first RX OIT deletion:");
  console.log(JSON.stringify(rxDeletes[0], null, 2));
} else {
  console.log("No RX OIT deletions found");
}
