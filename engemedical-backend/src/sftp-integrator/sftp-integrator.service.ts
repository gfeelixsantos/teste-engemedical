import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import * as path from 'path';
import { MongoService } from 'src/mongo/mongo.service';
import { EmailService } from 'src/nodemailer/nodemailer.service';
import {
  getSftpIntegratorConfig,
  normalizeSftpIntegratorClientKey,
} from './sftp-integrator.config';
import { buildGrupoToraSocPayload } from './sftp-soc-payload.mapper';
import { SftpIntegratorFs } from './sftp-integrator.fs';
import { SftpSpreadsheetParser } from './sftp-spreadsheet-parser';
import {
  SftpClientAdapter,
  SftpIntegratorFileRecord,
  SftpIntegratorParseRun,
  SftpPullResult,
} from './sftp-integrator.types';
import { SftpSocProcessor } from './sftp-soc-processor';
import {
  buildSftpDryRunReportEmail,
  buildSftpSocReportEmail,
} from './sftp-report-email.template';

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

@Injectable()
export class SftpIntegratorService implements OnModuleInit {
  private readonly collectionName = 'sftp_integrator_files';

  constructor(
    private readonly mongoService: MongoService,
    @Inject('SFTP_CLIENT_ADAPTER')
    private readonly sftpClient: SftpClientAdapter,
    private readonly fs: SftpIntegratorFs,
    private readonly spreadsheetParser: SftpSpreadsheetParser,
    private readonly emailService: EmailService,
    private readonly socProcessor: SftpSocProcessor,
    @Optional()
    @Inject('SFTP_INTEGRATOR_BACKEND_ROOT')
    private readonly backendRoot = process.cwd(),
  ) {}

  async onModuleInit() {
    await this.collection().createIndex(
      { clientKey: 1, remotePath: 1, size: 1 },
      { unique: true, name: 'sftp_file_identity' },
    );
    await this.collection().createIndex(
      { clientKey: 1, createdAt: -1 },
      { name: 'sftp_file_client_created_at' },
    );
  }

  async pullLatest(clientKey: string): Promise<SftpPullResult> {
    const config = getSftpIntegratorConfig(clientKey);
    const matcher = wildcardToRegExp(config.filePattern);
    const files = await this.sftpClient.list(config);
    const candidates = files
      .filter((file) => matcher.test(file.name))
      .sort(
        (a, b) =>
          (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0) ||
          b.name.localeCompare(a.name),
      );

    if (!candidates.length) {
      throw new NotFoundException(
        `Nenhum arquivo encontrado para ${config.clientKey}`,
      );
    }

    const latest = candidates[0];
    const existing = await this.collection().findOne({
      clientKey: config.clientKey,
      remotePath: latest.path,
      size: latest.size,
    });
    if (existing) {
      return {
        clientKey: config.clientKey,
        downloaded: false,
        file: existing as SftpIntegratorFileRecord,
      };
    }

    const localDir = path.resolve(this.backendRoot, config.downloadDir);
    const localPath = path.resolve(localDir, latest.name);
    await this.fs.mkdir(localDir);
    await this.sftpClient.download(config, latest.path, localPath);
    const stat = await this.fs.stat(localPath);
    const now = new Date();
    const record: SftpIntegratorFileRecord = {
      clientKey: config.clientKey,
      remotePath: latest.path,
      remoteName: latest.name,
      localPath,
      size: stat.size,
      sha256: await this.fs.sha256(localPath),
      remoteMtime: latest.mtime,
      status: 'downloaded',
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await this.collection().insertOne(record);
    return {
      clientKey: config.clientKey,
      downloaded: true,
      file: { ...record, _id: inserted.insertedId } as any,
    };
  }

  async pullLatestAndRunDryRun(clientKey: string) {
    const pull = await this.pullLatest(clientKey);
    const fileId = String((pull.file as any)._id || '');
    if (!fileId) {
      throw new BadRequestException(
        'Arquivo baixado sem identificador para dry-run',
      );
    }

    return {
      pull,
      dryRun: await this.runDryRun(clientKey, fileId),
    };
  }

  async listFiles(clientKey: string, limit = 50) {
    const normalizedClientKey = normalizeSftpIntegratorClientKey(clientKey);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.collection()
      .find({ clientKey: normalizedClientKey })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .toArray();
  }

  async listRuns(clientKey: string, limit = 50) {
    const normalizedClientKey = normalizeSftpIntegratorClientKey(clientKey);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.runsCollection()
      .find({ clientKey: normalizedClientKey })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .toArray();
  }

  async getFileForDownload(clientKey: string, id: string) {
    const normalizedClientKey = normalizeSftpIntegratorClientKey(clientKey);
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('ID de arquivo invalido');
    }
    const file = await this.collection().findOne({
      _id: new ObjectId(id),
      clientKey: normalizedClientKey,
    });
    if (!file) {
      throw new NotFoundException('Arquivo nao encontrado');
    }
    const resolvedPath = await this.resolveDownloadPath(
      normalizedClientKey,
      file.localPath,
    );
    return { file, path: resolvedPath };
  }

  async parseFile(clientKey: string, id: string) {
    const { normalizedClientKey, fileId, resolvedPath } =
      await this.loadFile(clientKey, id);
    const parsed = await this.spreadsheetParser.parseGrupoToraFile(resolvedPath);
    const now = new Date();
    const run: SftpIntegratorParseRun = {
      clientKey: normalizedClientKey,
      fileId,
      status: 'parsed',
      summary: parsed.summary,
      invalidRowsPreview: parsed.rows
        .filter((row) => !row.valid)
        .slice(0, 50)
        .map((row) => ({
          rowNumber: row.rowNumber,
          errors: row.errors,
        })),
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await this.runsCollection().insertOne(run);

    return {
      _id: inserted.insertedId,
      ...run,
    };
  }

  async runDryRun(clientKey: string, id: string) {
    const { normalizedClientKey, fileId, file, resolvedPath } =
      await this.loadFile(clientKey, id);
    const parsed = await this.spreadsheetParser.parseGrupoToraFile(resolvedPath);
    const validRows = parsed.rows.filter((row) => row.valid);
    const payloads = validRows.map((row) => buildGrupoToraSocPayload(row));
    const soapPreview = payloads.slice(0, 10).map((payload) => ({
      rowNumber: payload.rowNumber,
      lookupKey: payload.lookupKey,
      situationToSend: payload.situationToSend,
      codigoEmpresaOrigem: payload.employee.CODIGOEMPRESA,
      maskedCpf: maskCpf(payload.employee.CPF),
      nomeFuncionario: payload.employee.NOME,
      matriculaRh: payload.employee.MATRICULARH,
    }));
    const summary = {
      ...parsed.summary,
      payloadsPrepared: payloads.length,
      skippedRows: parsed.summary.invalidRows,
      mode: 'dry_run',
    };
    const now = new Date();
    const run: SftpIntegratorParseRun = {
      clientKey: normalizedClientKey,
      fileId,
      status: 'dry_run',
      summary,
      invalidRowsPreview: parsed.rows
        .filter((row) => !row.valid)
        .slice(0, 50)
        .map((row) => ({
          rowNumber: row.rowNumber,
          errors: row.errors,
        })),
      soapPreview,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await this.runsCollection().insertOne(run);
    const result = {
      _id: inserted.insertedId,
      ...run,
      file: {
        remoteName: file.remoteName,
        sha256: file.sha256,
        size: file.size,
      },
    };

    await this.sendDryRunReport(result);
    return result;
  }

  async processSocLimited(clientKey: string, id: string) {
    const normalizedClientKey = normalizeSftpIntegratorClientKey(clientKey);
    if (!isEnabled(
      process.env[`SFTP_INTEGRATOR_${envClientKey(normalizedClientKey)}_SOC_ENABLED`],
    )) {
      throw new BadRequestException('Processamento SOC desabilitado');
    }

    const { fileId, file, resolvedPath } = await this.loadFile(clientKey, id);
    const parsed = await this.spreadsheetParser.parseGrupoToraFile(resolvedPath);
    const payloads = parsed.rows
      .filter((row) => row.valid)
      .map((row) => buildGrupoToraSocPayload(row));
    const socResult = await this.socProcessor.process(payloads, {
      limit: getPositiveInt(
        process.env[`SFTP_INTEGRATOR_${envClientKey(normalizedClientKey)}_SOC_LIMIT`],
        3,
      ),
      delayMs: getNonNegativeInt(
        process.env[
          `SFTP_INTEGRATOR_${envClientKey(normalizedClientKey)}_SOC_DELAY_MS`
        ],
        2500,
      ),
      lookupCompanyCode:
        process.env[
          `SFTP_INTEGRATOR_${envClientKey(normalizedClientKey)}_SOC_LOOKUP_COMPANY_CODE`
        ],
    });
    const now = new Date();
    const run: SftpIntegratorParseRun = {
      clientKey: normalizedClientKey,
      fileId,
      status: 'soc_limited',
      summary: {
        ...parsed.summary,
        ...socResult.summary,
        mode: 'soc_limited',
      },
      invalidRowsPreview: parsed.rows
        .filter((row) => !row.valid)
        .slice(0, 50)
        .map((row) => ({
          rowNumber: row.rowNumber,
          errors: row.errors,
        })),
      soapPreview: socResult.rows,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await this.runsCollection().insertOne(run);
    const result = {
      _id: inserted.insertedId,
      ...run,
      file: {
        remoteName: file.remoteName,
        sha256: file.sha256,
        size: file.size,
      },
    };

    await this.sendSocReport(result);
    return result;
  }

  async resolveDownloadPath(clientKey: string, filePath: string): Promise<string> {
    const config = getSftpIntegratorConfig(clientKey);
    const root = path.resolve(this.backendRoot, config.downloadDir);
    const resolved = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(root, filePath);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException(
        'Arquivo fora do diretorio do integrador SFTP',
      );
    }
    return resolved;
  }

  private collection(): Collection {
    return this.mongoService.db.collection(this.collectionName);
  }

  private runsCollection(): Collection {
    return this.mongoService.db.collection('sftp_integrator_runs');
  }

  private async loadFile(clientKey: string, id: string) {
    const normalizedClientKey = normalizeSftpIntegratorClientKey(clientKey);
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('ID de arquivo invalido');
    }
    const fileId = new ObjectId(id);
    const file = await this.collection().findOne({
      _id: fileId,
      clientKey: normalizedClientKey,
    });
    if (!file) {
      throw new NotFoundException('Arquivo nao encontrado');
    }
    const resolvedPath = await this.resolveDownloadPath(
      normalizedClientKey,
      file.localPath,
    );
    return { normalizedClientKey, fileId, file, resolvedPath };
  }

  private async sendDryRunReport(run: {
    clientKey: string;
    summary: any;
    invalidRowsPreview: unknown[];
    soapPreview?: unknown[];
    file: { remoteName: string; sha256: string; size: number };
  }) {
    const recipients = parseEmailList(
      process.env.SFTP_INTEGRATOR_GRUPO_TORA_REPORT_EMAIL_TO,
    );
    if (!recipients.length) {
      return;
    }

    await this.emailService.sendEmail({
      to: recipients,
      subject: `Dry-run SFTP Grupo Tora - ${run.file.remoteName}`,
      templatename: 'CUSTOM_REPORT',
      attachment: [],
      template: buildSftpDryRunReportEmail(run),
    });
  }

  private async sendSocReport(run: {
    clientKey: string;
    summary: any;
    invalidRowsPreview: unknown[];
    soapPreview?: unknown[];
    file: { remoteName: string; sha256: string; size: number };
  }) {
    const recipients = parseEmailList(
      process.env.SFTP_INTEGRATOR_GRUPO_TORA_REPORT_EMAIL_TO,
    );
    if (!recipients.length) {
      return;
    }

    await this.emailService.sendEmail({
      to: recipients,
      subject: `Execução SOC SFTP Grupo Tora - ${run.file.remoteName}`,
      templatename: 'CUSTOM_REPORT',
      attachment: [],
      template: buildSftpSocReportEmail(run),
    });
  }
}

function envClientKey(clientKey: string): string {
  return clientKey.replace(/-/g, '_').toUpperCase();
}

function isEnabled(value?: string): boolean {
  return String(value || '').toLowerCase() === 'true';
}

function getPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getNonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseEmailList(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function maskCpf(value: string): string {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length <= 4) return cpf;
  return `${'*'.repeat(cpf.length - 4)}${cpf.slice(-4)}`;
}
