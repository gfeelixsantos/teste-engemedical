require('dotenv').config();
const { appLogs } = require('./src/utils/appLogs');

appLogs.initializeFileLogging();

console.log('='.repeat(50));
console.log('CMSO360 ASO Generator - Worker');
console.log('='.repeat(50));
console.log('Inicializando...');
console.log('');

const startWorker = async () => {
  try {
    const { AsoQueueService } = require('./src/azure/aso-queue.service');
    
    console.log('Verificando conexão com filas Azure...');
    const queueService = new AsoQueueService(process.env.AZURE_CONNECTION_STRING_BLOB);
    await queueService.initialize();
    console.log('✅ Filas Azure conectadas');
    console.log('');

    console.log('Carregando worker...');
    await import('./worker');
    console.log('✅ Worker iniciado');
    
  } catch (error) {
    console.error('❌ Erro ao iniciar:', error);
    process.exit(1);
  }
};

startWorker();
