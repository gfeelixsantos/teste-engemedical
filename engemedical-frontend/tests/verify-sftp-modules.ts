const { useSftpIntegration } = await import('./hooks/useSftpIntegration');
const { getStatusColor, getStatusLabel, formatFileSize } = await import('./lib/sftp-utils');
const { SFTP_CLIENT_KEY, FILE_STATUS, RUN_STATUS } = await import('./app/sftp-integracao/types');
const { KpiCards } = await import('./app/sftp-integracao/components/KpiCards');
const { ExecutionTable } = await import('./app/sftp-integracao/components/ExecutionTable');
const { ReportsTable } = await import('./app/sftp-integracao/components/ReportsTable');
const { ScheduleInfo } = await import('./app/sftp-integracao/components/ScheduleInfo');
const { ActionButtons } = await import('./app/sftp-integracao/components/ActionButtons');
const { GET, POST } = await import('./app/sftp-integracao/api/route');

console.log('All SFTP modules loaded successfully!');
console.log({
  useSftpIntegration: typeof useSftpIntegration,
  getStatusColor: typeof getStatusColor,
  getStatusLabel: typeof getStatusLabel,
  formatFileSize: typeof formatFileSize,
  SFTP_CLIENT_KEY,
  FILE_STATUS,
  RUN_STATUS,
  KpiCards: typeof KpiCards,
  ExecutionTable: typeof ExecutionTable,
  ReportsTable: typeof ReportsTable,
  ScheduleInfo: typeof ScheduleInfo,
  ActionButtons: typeof ActionButtons,
  GET: typeof GET,
  POST: typeof POST,
});