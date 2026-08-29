/**
 * purge-non-august-strict.js
 *
 * Inspeciona a fila Azure 'aso-processing' e apaga ESTRITAMENTE todas as mensagens
 * cuja dataFicha / dataagendamento NÃO pertença ao mês de AGOSTO DE 2026 (08/2026).
 */

const path = require('path');
const { QueueServiceClient } = require('@azure/storage-queue');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const AZURE_CONNECTION = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_CONNECTION_STRING_BLOB;
const QUEUE_ASO_NAME = process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing';

function isStrictAugust2026(dataFichaStr, createdAtStr) {
  const str = String(dataFichaStr || '').trim();
  
  // Formato BR "DD/MM/YYYY" -> "20/08/2026"
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const month = parts[1].padStart(2, '0');
      const year = parts[2].substring(0, 4);
      return month === '08' && year === '2026';
    }
  }

  // Formato ISO "YYYY-MM-DD" -> "2026-08-20"
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length >= 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      return month === '08' && year === '2026';
    }
  }

  // Fallback para createdAt se dataFicha vier vazia
  if (createdAtStr) {
    const d = new Date(createdAtStr);
    if (!isNaN(d.getTime())) {
      return d.getUTCMonth() === 7 && d.getUTCFullYear() === 2026;
    }
  }

  return false;
}

async function main() {
  console.log(`\n${'='.repeat(75)}`);
  console.log(`  Purge Estrito na Fila Azure '${QUEUE_ASO_NAME}' — Apenas Agosto de 2026 (08/2026)`);
  console.log(`${'='.repeat(75)}\n`);

  const queueServiceClient = QueueServiceClient.fromConnectionString(AZURE_CONNECTION);
  const queueClient = queueServiceClient.getQueueClient(QUEUE_ASO_NAME);

  let totalInspect = 0;
  let totalRemoved = 0;
  let totalKept = 0;

  while (true) {
    const response = await queueClient.receiveMessages({
      numberOfMessages: 32,
      visibilityTimeout: 30,
    });

    if (!response.receivedMessageItems || response.receivedMessageItems.length === 0) {
      break;
    }

    for (const item of response.receivedMessageItems) {
      totalInspect++;
      let payload = {};
      try {
        payload = JSON.parse(item.messageText);
      } catch (err) {
        // Remove se for lixo/não-JSON
        await queueClient.deleteMessage(item.messageId, item.popReceipt);
        totalRemoved++;
        continue;
      }

      const dataFicha = payload.dataFicha || payload.dataagendamento || '';
      const createdAt = payload.createdAt || '';
      const isAugust = isStrictAugust2026(dataFicha, createdAt);

      if (!isAugust) {
        console.log(`🗑️ Removendo [Fora de 08/2026]: Data="${dataFicha}" | ${payload.nomeFuncionario || 'n/a'} (ID: ${payload.schedulingId})`);
        await queueClient.deleteMessage(item.messageId, item.popReceipt);
        totalRemoved++;
      } else {
        console.log(`✅ MANTIDO [08/2026]: Data="${dataFicha}" | ${payload.nomeFuncionario} (ID: ${payload.schedulingId})`);
        totalKept++;
      }
    }
  }

  console.log(`\n${'='.repeat(75)}`);
  console.log(`  📊 RESUMO DA LIMPEZA:`);
  console.log(`     Total Inspecionado : ${totalInspect}`);
  console.log(`     Total Removido     : ${totalRemoved} (mensagens fora de 08/2026)`);
  console.log(`     Total Mantido      : ${totalKept} (mensagens de 08/2026)`);
  console.log(`${'='.repeat(75)}\n`);
}

main().catch(err => {
  console.error('❌ ERRO:', err.message);
});
