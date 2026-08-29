/**
 * purge-non-august-aso-queue.js
 *
 * Lê a fila Azure 'aso-processing', inspeciona a dataFicha ou createdAt das mensagens.
 * Se a mensagem NÃO for do mês de agosto (08/2026), remove a mensagem da fila.
 * Se for de agosto (08/2026), desfaz o lock e mantém a mensagem na fila.
 */

const path = require('path');
const { QueueServiceClient } = require('@azure/storage-queue');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const AZURE_CONNECTION = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_CONNECTION_STRING_BLOB;
const QUEUE_ASO_NAME = process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing';

function isAugustMessage(dataFichaStr, createdAtStr) {
  // Verifica dataFicha primeiro (ex: "20/08/2026" ou "2026-08-20")
  if (dataFichaStr) {
    if (dataFichaStr.includes('/08/') || dataFichaStr.includes('-08-')) return true;
  }
  // Verifica createdAt como fallback
  if (createdAtStr) {
    const d = new Date(createdAtStr);
    if (!isNaN(d.getTime()) && d.getMonth() === 7) return true; // getMonth() 7 = Agosto
  }
  return false;
}

async function main() {
  console.log(`\n${'='.repeat(75)}`);
  console.log(`  Limpeza da Fila Azure '${QUEUE_ASO_NAME}' — Manter Apenas Mês de Agosto (08)`);
  console.log(`${'='.repeat(75)}\n`);

  const queueServiceClient = QueueServiceClient.fromConnectionString(AZURE_CONNECTION);
  const queueClient = queueServiceClient.getQueueClient(QUEUE_ASO_NAME);

  let totalInspect = 0;
  let totalRemoved = 0;
  let totalKept = 0;

  // Processa em lotes até que a fila seja totalmente inspecionada
  while (true) {
    const response = await queueClient.receiveMessages({
      numberOfMessages: 32,
      visibilityTimeout: 30, // 30 segundos de trava enquanto inspeciona
    });

    if (!response.receivedMessageItems || response.receivedMessageItems.length === 0) {
      console.log('🏁 Nenhuma mensagem restante para inspecionar.');
      break;
    }

    for (const item of response.receivedMessageItems) {
      totalInspect++;
      let payload = {};
      try {
        payload = JSON.parse(item.messageText);
      } catch (err) {
        // Se a mensagem for inválida/antiga Base64 sem ser JSON, pode ser removida
        console.log(`🗑️ Removendo mensagem inválida/não-JSON (ID: ${item.messageId})`);
        await queueClient.deleteMessage(item.messageId, item.popReceipt);
        totalRemoved++;
        continue;
      }

      const dataFicha = payload.dataFicha || payload.dataagendamento || '';
      const createdAt = payload.createdAt || '';
      const isAugust = isAugustMessage(dataFicha, createdAt);

      if (!isAugust) {
        console.log(`🗑️ Removendo mensagem de OUTRO mês (${dataFicha || createdAt || 'sem data'}): ${payload.nomeFuncionario || 'n/a'} (ID: ${payload.schedulingId})`);
        await queueClient.deleteMessage(item.messageId, item.popReceipt);
        totalRemoved++;
      } else {
        console.log(`✅ Mantendo mensagem de AGOSTO (${dataFicha}): ${payload.nomeFuncionario} (ID: ${payload.schedulingId})`);
        totalKept++;
      }
    }
  }

  console.log(`\n${'='.repeat(75)}`);
  console.log(`  📊 RESUMO DA LIMPEZA:`);
  console.log(`     Total Inspecionado : ${totalInspect}`);
  console.log(`     Total Removido     : ${totalRemoved} (fora do mês de agosto)`);
  console.log(`     Total Mantido      : ${totalKept} (mês de agosto)`);
  console.log(`${'='.repeat(75)}\n`);
}

main().catch(err => {
  console.error('❌ ERRO:', err.message);
});
