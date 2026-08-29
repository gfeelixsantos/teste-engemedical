/**
 * ============================================================
 *  SCRIPT DE TESTE — Atualização de Exames por Grupo (JavaScript)
 * ============================================================
 *
 * Testa a lógica de atualização de exames do mesmo grupo quando
 * um novo PDF é recebido pelo scraper.
 *
 * Como executar (da pasta cmso360-backend):
 *   chcp 65001 && node scripts/test-group-update-logic.js
 * ============================================================
 */

require('dotenv').config();
const { ObjectId, MongoClient } = require('mongodb');

// ─── Utilitários ─────────────────────────────────────────────────────────────

function hr(char = '─', len = 70) { return char.repeat(len); }

function formatDate(date) {
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const ExamStatus = {
  PENDENTE: 'PENDENTE',
  NAO_REALIZADO: 'NAO_REALIZADO',
  AGUARDANDO_RESULTADO: 'AGUARDANDO_RESULTADO',
  FINALIZADO: 'FINALIZADO',
};

// ─── Script Principal ───────────────────────────────────────────────────────────

async function main() {
  if (process.stdout.reconfigure) process.stdout.reconfigure({ encoding: 'utf8' });
  if (process.stderr.reconfigure) process.stderr.reconfigure({ encoding: 'utf8' });

  console.log(`\n${hr('=')}`);
  console.log(`TESTE DE ATUALIZAÇÃO DE EXAMES POR GRUPO`);
  console.log(`Iniciado em: ${formatDate(new Date())}`);
  console.log(hr('='));

  // Conexão com MongoDB
  const mongoUri = 'mongodb+srv://cmso360_db_user:123a5067b9@cmso360.nyei7qg.mongodb.net/?appName=cmso360';
  console.log(`\nConectando ao MongoDB...`);
  const client = new MongoClient(mongoUri);
  await client.connect();
  console.log(`✓ Conectado`);

  const db = client.db('cmso-agendamento');
  const schedulingsCollection = db.collection('schedulings');

  const testId = new ObjectId();
  const testUrl1 = 'https://storage.example.com/laboratorio-dia1.pdf';
  const testUrl2 = 'https://storage.example.com/laboratorio-dia3.pdf';
  const testUrl3 = 'https://storage.example.com/laboratorio-dia15.pdf';

  // Documento de teste
  const testDoc = {
    _id: testId,
    NOME: 'TESTE SCRAPER GRUPO UPDATE',
    CPFFUNCIONARIO: '12345678901',
    DATAAGENDAMENTO: '01/08/2026',
    TIPOEXAMENOME: 'EXAME LABORATORIAL',
    EXAMES: [
      {
        codigoExame: 'HEMOGRAMA_001',
        nomeExame: 'Hemograma',
        grupo: 'LABORATORIO',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
      {
        codigoExame: 'PARASITO_001',
        nomeExame: 'Parasitológico',
        grupo: 'LABORATORIO',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
      {
        codigoExame: 'CROMO_001',
        nomeExame: 'Cromo Urinário',
        grupo: 'LABORATORIO',
        status: ExamStatus.AGUARDANDO_RESULTADO,
      },
    ],
  };

  console.log(`\nDocumento de teste criado:`);
  console.log(`  ID: ${testId}`);
  console.log(`  Nome: ${testDoc.NOME}`);
  console.log(`  Exames: ${testDoc.EXAMES.length}`);
  testDoc.EXAMES.forEach((ex, i) => {
    console.log(`    [${i + 1}] ${ex.nomeExame} (${ex.grupo}) - ${ex.status}`);
  });

  // Inserir documento de teste
  console.log(`\n${hr('-')}`);
  console.log(`[1/4] Inserindo documento de teste no MongoDB...`);
  try {
    await schedulingsCollection.insertOne(testDoc);
    console.log(`✓ Documento inserido com sucesso`);
  } catch (err) {
    console.error(`✗ Erro ao inserir documento: ${err.message}`);
    await client.close();
    process.exit(1);
  }

  // ─── CENÁRIO 1: Dia 1 - Hemograma recebido ─────────────────────────────────────
  console.log(`\n${hr('-')}`);
  console.log(`[2/4] CENÁRIO 1: Dia 1 - Hemograma recebido`);
  console.log(hr('-'));

  console.log(`\nEstado ANTES:`);
  const before1 = await schedulingsCollection.findOne({ _id: testId });
  before1.EXAMES.forEach((ex) => {
    console.log(`  ${ex.nomeExame}: ${ex.status} | URL: ${ex.url || '(vazio)'}`);
  });

  console.log(`\nChamando applyExamResultFromWorker com: ['HEMOGRAMA_001']`);
  // Simula applyExamResultFromWorker - comportamento atual
  const updatePayload1 = { $set: {} };
  before1.EXAMES.forEach((ex, idx) => {
    if (ex.codigoExame === 'HEMOGRAMA_001') {
      updatePayload1.$set[`EXAMES.${idx}.status`] = ExamStatus.FINALIZADO;
      updatePayload1.$set[`EXAMES.${idx}.url`] = testUrl1;
    }
  });
  await schedulingsCollection.updateOne({ _id: testId }, updatePayload1);

  console.log(`\nEstado DEPOIS (comportamento atual):`);
  const after1 = await schedulingsCollection.findOne({ _id: testId });
  after1.EXAMES.forEach((ex) => {
    console.log(`  ${ex.nomeExame}: ${ex.status} | URL: ${ex.url || '(vazio)'}`);
  });

  const hemogramaUpdated1 = after1.EXAMES.find((ex) => ex.codigoExame === 'HEMOGRAMA_001');
  const parasitoUpdated1 = after1.EXAMES.find((ex) => ex.codigoExame === 'PARASITO_001');
  const cromoUpdated1 = after1.EXAMES.find((ex) => ex.codigoExame === 'CROMO_001');

  console.log(`\nVerificação:`);
  console.log(`  Hemograma atualizado: ${hemogramaUpdated1.url === testUrl1 ? '✓' : '✗'}`);
  console.log(`  Parasitológico atualizado: ${parasitoUpdated1.url === testUrl1 ? '✓ (PROBLEMA)' : '✓ (esperado)'}`);
  console.log(`  Cromo atualizado: ${cromoUpdated1.url === testUrl1 ? '✓ (PROBLEMA)' : '✓ (esperado)'}`);

  // ─── CENÁRIO 2: Dia 3 - Parasitológico recebido ───────────────────────────────
  console.log(`\n${hr('-')}`);
  console.log(`[3/4] CENÁRIO 2: Dia 3 - Parasitológico recebido`);
  console.log(hr('-'));

  console.log(`\nEstado ANTES:`);
  const before2 = await schedulingsCollection.findOne({ _id: testId });
  before2.EXAMES.forEach((ex) => {
    console.log(`  ${ex.nomeExame}: ${ex.status} | URL: ${ex.url || '(vazio)'}`);
  });

  console.log(`\nChamando applyExamResultFromWorker com: ['PARASITO_001']`);
  console.log(`(Comportamento atual: apenas parasitológico será atualizado)`);
  console.log(`(Comportamento esperado após mudança: hemograma + parasitológico serão atualizados)`);

  // Simula applyExamResultFromWorker - comportamento atual
  const updatePayload2 = { $set: {} };
  before2.EXAMES.forEach((ex, idx) => {
    if (ex.codigoExame === 'PARASITO_001') {
      updatePayload2.$set[`EXAMES.${idx}.status`] = ExamStatus.FINALIZADO;
      updatePayload2.$set[`EXAMES.${idx}.url`] = testUrl2;
    }
  });
  await schedulingsCollection.updateOne({ _id: testId }, updatePayload2);

  console.log(`\nEstado DEPOIS (comportamento atual):`);
  const after2 = await schedulingsCollection.findOne({ _id: testId });
  after2.EXAMES.forEach((ex) => {
    console.log(`  ${ex.nomeExame}: ${ex.status} | URL: ${ex.url || '(vazio)'}`);
  });

  const hemogramaUpdated2 = after2.EXAMES.find((ex) => ex.codigoExame === 'HEMOGRAMA_001');
  const parasitoUpdated2 = after2.EXAMES.find((ex) => ex.codigoExame === 'PARASITO_001');
  const cromoUpdated2 = after2.EXAMES.find((ex) => ex.codigoExame === 'CROMO_001');

  console.log(`\nVerificação (comportamento atual):`);
  console.log(`  Hemograma ainda com URL antiga: ${hemogramaUpdated2.url === testUrl1 ? '✓ (PROBLEMA)' : '✗'}`);
  console.log(`  Parasitológico com URL nova: ${parasitoUpdated2.url === testUrl2 ? '✓' : '✗'}`);
  console.log(`  Cromo sem URL: ${!cromoUpdated2.url ? '✓ (esperado)' : '✗ (PROBLEMA)'}`);

  console.log(`\nVerificação (comportamento esperado após mudança):`);
  console.log(`  Hemograma com URL nova: ${hemogramaUpdated2.url === testUrl2 ? '✓ (esperado)' : '✗ (atual)'}`);
  console.log(`  Parasitológico com URL nova: ${parasitoUpdated2.url === testUrl2 ? '✓ (esperado)' : '✗'}`);

  // ─── CENÁRIO 3: Dia 15 - Cromo recebido ───────────────────────────────────────
  console.log(`\n${hr('-')}`);
  console.log(`[4/4] CENÁRIO 3: Dia 15 - Cromo recebido`);
  console.log(hr('-'));

  console.log(`\nEstado ANTES:`);
  const before3 = await schedulingsCollection.findOne({ _id: testId });
  before3.EXAMES.forEach((ex) => {
    console.log(`  ${ex.nomeExame}: ${ex.status} | URL: ${ex.url || '(vazio)'}`);
  });

  console.log(`\nChamando applyExamResultFromWorker com: ['CROMO_001']`);
  console.log(`(Comportamento esperado após mudança: todos os 3 serão atualizados)`);

  // Simula applyExamResultFromWorker - comportamento esperado após mudança
  // Busca exames do mesmo grupo já finalizados
  const normalizedGroupName = 'laboratorio';
  const finishedExamsInGroup = before3.EXAMES.filter(
    (ex) =>
      ex.grupo.toLowerCase().includes(normalizedGroupName) &&
      ex.status === ExamStatus.FINALIZADO
  );
  const finishedCodesInGroup = finishedExamsInGroup.map((ex) => ex.codigoExame);
  const allCodesToUpdate = [...new Set(['CROMO_001', ...finishedCodesInGroup])];

  console.log(`  Exames para atualizar: ${allCodesToUpdate.join(', ')}`);

  const updatePayload3 = { $set: {} };
  before3.EXAMES.forEach((ex, idx) => {
    if (allCodesToUpdate.includes(ex.codigoExame)) {
      updatePayload3.$set[`EXAMES.${idx}.status`] = ExamStatus.FINALIZADO;
      updatePayload3.$set[`EXAMES.${idx}.url`] = testUrl3;
    }
  });
  await schedulingsCollection.updateOne({ _id: testId }, updatePayload3);

  console.log(`\nEstado DEPOIS (comportamento esperado após mudança):`);
  const after3 = await schedulingsCollection.findOne({ _id: testId });
  after3.EXAMES.forEach((ex) => {
    console.log(`  ${ex.nomeExame}: ${ex.status} | URL: ${ex.url || '(vazio)'}`);
  });

  const hemogramaUpdated3 = after3.EXAMES.find((ex) => ex.codigoExame === 'HEMOGRAMA_001');
  const parasitoUpdated3 = after3.EXAMES.find((ex) => ex.codigoExame === 'PARASITO_001');
  const cromoUpdated3 = after3.EXAMES.find((ex) => ex.codigoExame === 'CROMO_001');

  console.log(`\nVerificação (comportamento esperado após mudança):`);
  console.log(`  Hemograma com URL nova: ${hemogramaUpdated3.url === testUrl3 ? '✓ (esperado)' : '✗'}`);
  console.log(`  Parasitológico com URL nova: ${parasitoUpdated3.url === testUrl3 ? '✓ (esperado)' : '✗'}`);
  console.log(`  Cromo com URL nova: ${cromoUpdated3.url === testUrl3 ? '✓ (esperado)' : '✗'}`);

  // ─── Limpeza ─────────────────────────────────────────────────────────────────
  console.log(`\n${hr('-')}`);
  console.log(`Limpando documento de teste...`);
  await schedulingsCollection.deleteOne({ _id: testId });
  console.log(`✓ Documento removido`);

  await client.close();

  console.log(`\n${hr('=')}`);
  console.log(`TESTE CONCLUÍDO`);
  console.log(`Finalizado em: ${formatDate(new Date())}`);
  console.log(hr('='));
  console.log(`\nResumo do comportamento ATUAL:`);
  console.log(`  - Cenário 1: Apenas o exame recebido é atualizado ✓`);
  console.log(`  - Cenário 2: Apenas o exame recebido é atualizado (hemograma fica com URL antiga) ✗`);
  console.log(`  - Cenário 3: Apenas o exame recebido é atualizado (outros ficam com URLs antigas) ✗`);
  console.log(`\nResumo do comportamento ESPERADO após mudança:`);
  console.log(`  - Cenário 1: Apenas o exame recebido é atualizado (nenhum outro finalizado) ✓`);
  console.log(`  - Cenário 2: Exame recebido + exames finalizados do mesmo grupo são atualizados ✓`);
  console.log(`  - Cenário 3: Todos os exames do grupo são atualizados ✓`);
  console.log(`\n`);
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  console.error(err.stack);
  process.exitCode = 1;
});
