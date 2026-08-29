const fs = require('fs');

const data = JSON.parse(fs.readFileSync('deletions_report.json', 'utf8'));

const summary = data.map(d => {
  const r = d.snapshot?.resumo || {};
  return {
    criadoEm: d.criadoEm,
    motivo: d.motivo,
    recursoId: d.recursoId,
    pacienteCodigo: d.snapshot?.pacienteCodigo || d.pacienteCodigo,
    pacienteNome: d.snapshot?.pacienteNome || d.pacienteNome,
    unidade: d.snapshot?.unidade || d.unidade,
    exameNome: r.exameNome,
    exameCodigo: r.exameCodigo,
    nomeArquivo: r.nomeArquivo,
    blobPath: r.blobPath,
    criadoPor: d.criadoPor?.nome || d.criadoPor?.codigo
  };
});

fs.writeFileSync('deletions_summary.json', JSON.stringify(summary, null, 2));
console.log(`Summarized ${summary.length} items`);
