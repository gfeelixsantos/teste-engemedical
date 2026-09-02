import 'dotenv/config';
import * as dns from 'node:dns';
import { MongoClient } from 'mongodb';
import { AzureService } from '../src/azure/azure.service';
import { EmailService } from '../src/nodemailer/nodemailer.service';
import { Ssh2SftpClientAdapter } from '../src/sftp-integrator/sftp-client.adapter';
import { SftpIntegratorFs } from '../src/sftp-integrator/sftp-integrator.fs';
import { SftpIntegratorService } from '../src/sftp-integrator/sftp-integrator.service';
import { SftpSocEmployeeLookupService } from '../src/sftp-integrator/sftp-soc-employee-lookup.service';
import { SftpSocProcessor } from '../src/sftp-integrator/sftp-soc-processor';
import { SftpSpreadsheetParser } from '../src/sftp-integrator/sftp-spreadsheet-parser';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} nao configurado`);
  }
  return value;
}

function summarizeRun(result: any) {
  return {
    file: {
      id: String(result.pull?.file?._id || result.file?._id || ''),
      downloaded: result.pull?.downloaded,
      remoteName: result.pull?.file?.remoteName || result.file?.remoteName,
      size: result.pull?.file?.size || result.file?.size,
      sha256: result.pull?.file?.sha256 || result.file?.sha256,
    },
    dryRun: result.dryRun
      ? {
          status: result.dryRun.status,
          totalRows: result.dryRun.summary?.totalRows,
          validRows: result.dryRun.summary?.validRows,
          invalidRows: result.dryRun.summary?.invalidRows,
          payloadsPrepared: result.dryRun.summary?.payloadsPrepared,
          skippedRows: result.dryRun.summary?.skippedRows,
        }
      : undefined,
  };
}

function summarizeSoc(result: any) {
  return {
    status: result.status,
    file: {
      remoteName: result.file?.remoteName,
      sha256: result.file?.sha256,
    },
    summary: result.summary,
    rows: (result.soapPreview || []).map((row: any) => ({
      rowNumber: row.rowNumber,
      nomeFuncionario: row.nomeFuncionario,
      maskedCpf: row.maskedCpf,
      codigoEmpresaSoc: row.codigoEmpresaSoc,
      codigoFuncionario: row.codigoFuncionario,
      situationToSend: row.situationToSend,
      success: row.success,
      httpStatus: row.httpStatus,
      error: row.error,
    })),
  };
}

async function main() {
  process.env.SFTP_INTEGRATOR_GRUPO_TORA_CRON_ENABLED = 'false';
  process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_ENABLED =
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_ENABLED || 'true';
  process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_LIMIT =
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_LIMIT || '3';
  process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_DELAY_MS =
    process.env.SFTP_INTEGRATOR_GRUPO_TORA_SOC_DELAY_MS || '2500';

  const mongo = new MongoClient(requireEnv('MONGO_URL'));
  await mongo.connect();

  try {
    const service = new SftpIntegratorService(
      { db: mongo.db(requireEnv('MONGO_DATABASE')) } as any,
      new Ssh2SftpClientAdapter(),
      new SftpIntegratorFs(),
      new SftpSpreadsheetParser(),
      new EmailService(new AzureService()),
      new SftpSocProcessor(
        undefined,
        undefined,
        new SftpSocEmployeeLookupService(),
      ),
      process.cwd(),
    );

    await service.onModuleInit();

    const dryRun = await service.pullLatestAndRunDryRun('grupo-tora');
    console.log(
      JSON.stringify({ step: 'dry-run-latest', ...summarizeRun(dryRun) }),
    );

    const fileId = String((dryRun.pull.file as any)._id);
    const soc = await service.processSocLimited('grupo-tora', fileId);
    console.log(JSON.stringify({ step: 'process-soc-limited', ...summarizeSoc(soc) }));
  } finally {
    await mongo.close();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      step: 'error',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
