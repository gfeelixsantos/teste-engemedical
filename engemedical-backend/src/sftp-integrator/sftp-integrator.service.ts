import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import * as path from 'path';
import * as fs from 'fs/promises';
import { MongoService } from 'src/mongo/mongo.service';
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
import { generateSocReportExcel } from './sftp-report-excel.generator';
import { R2SftpReportService } from './sftp-r2-report.service';

// ─── Nodemailer direto (bypass Azure Queue) ───
let nodemailerTransporter: any = null;
async function getNodemailerTransporter() {
  if (nodemailerTransporter) return nodemailerTransporter;
  try {
    const nodemailer = await import('nodemailer');
    const smtpHost = process.env.SMTP_HOST || 'smtp.titan.email';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = process.env.SMTP_SECURE !== 'false';
    nodemailerTransporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
    return nodemailerTransporter;
  } catch (err) {
    return null;
  }
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

@Injectable()
export class SftpIntegratorService implements OnModuleInit {
  private readonly logger = new Logger(SftpIntegratorService.name);
  private readonly collectionName = 'sftp_integrator_files';
  private readonly backendRootValue: string;
  private readonly reportStorageValue?: R2SftpReportService;

  constructor(
    private readonly mongoService: MongoService,
    @Inject('SFTP_CLIENT_ADAPTER')
    private readonly sftpClient: SftpClientAdapter,
    private readonly fs: SftpIntegratorFs,
    private readonly spreadsheetParser: SftpSpreadsheetParser,
    private readonly socProcessor: SftpSocProcessor,
    @Optional()
    @Inject('SFTP_INTEGRATOR_BACKEND_ROOT')
    backendRoot: string | Record<string, unknown> = process.cwd(),
    @Optional() reportStorage?: R2SftpReportService | string,
  ) {
    // Compatibilidade com fixtures antigas que passavam o root na posição extra.
    this.backendRootValue = typeof backendRoot === 'string'
      ? backendRoot
      : typeof reportStorage === 'string'
        ? reportStorage
        : process.cwd();
    this.reportStorageValue = typeof reportStorage === 'object' ? reportStorage : undefined;
  }

  async onModuleInit() {
    // Aguarda MongoDB estar pronto (guard contra race condition)
    if (!this.mongoService?.db) {
      this.logger.warn('[SFTP] MongoDB nao disponivel durante onModuleInit - criando indices depois');
      return;
    }
    try {
      await this.collection().createIndex(
        { clientKey: 1, remotePath: 1, size: 1 },
        { unique: true, name: 'sftp_file_identity' },
      );
      await this.collection().createIndex(
        { clientKey: 1, createdAt: -1 },
        { name: 'sftp_file_client_created_at' },
      );
    } catch (err) {
      this.logger.warn(`[SFTP] Erro ao criar indices MongoDB: ${err}`);
    }
    // Inicializar R2 (injected via module)
    this.logger.log('[SFTP] Servico inicializado com suporte a Cloudflare R2');
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

    // 1. Download do SFTP para disco local
    const localDir = path.resolve(this.backendRootValue, config.downloadDir);
    const localPath = path.resolve(localDir, latest.name);
    await this.fs.mkdir(localDir);
    await this.sftpClient.download(config, latest.path, localPath);
    const stat = await this.fs.stat(localPath);
    const now = new Date();
    let r2Key: string | undefined;
    if (this.reportStorageValue?.uploadSftpFile) {
      try {
        const stored = await this.reportStorageValue.uploadSftpFile(
          config.clientKey,
          localPath,
        );
        r2Key = stored.key;
        await this.fs.unlink(localPath);
        this.logger.log(`[R2] Arquivo original persistido e temporário removido: ${r2Key}`);
      } catch (err) {
        await this.fs.unlink(localPath).catch(() => undefined);
        throw new Error(`Falha ao persistir arquivo recebido no R2: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const record: SftpIntegratorFileRecord = {
      clientKey: config.clientKey,
      remotePath: latest.path,
      remoteName: latest.name,
      localPath: r2Key ? '' : localPath,
      ...(r2Key ? { r2Key } : {}),
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
    if (file.r2Key && this.reportStorageValue) {
      return { file, buffer: await this.reportStorageValue.download(file.r2Key) };
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

    await this.sendReportDirect(result, 'dry_run');
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

    await this.sendReportDirect(result, 'soc_limited');
    return result;
  }

  async resolveDownloadPath(clientKey: string, filePath: string): Promise<string> {
    const config = getSftpIntegratorConfig(clientKey);
    const root = path.resolve(this.backendRootValue, config.downloadDir);
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

  // ═══════════════════════════════════════════════════════════════
  //  ENVIO DE EMAIL DIRETO VIA NODEMAILER (BYPASS AZURE QUEUE)
  // ═══════════════════════════════════════════════════════════════

  private async sendReportDirect(
    run: {
      clientKey: string;
      summary: any;
      invalidRowsPreview: unknown[];
      soapPreview?: unknown[];
      file: { remoteName: string; sha256: string; size: number };
    },
    mode: 'dry_run' | 'soc_limited',
  ) {
    const recipients = parseEmailList(
      process.env.SFTP_INTEGRATOR_GRUPO_TORA_REPORT_EMAIL_TO,
    );
    if (!recipients.length) {
      this.logger.debug('[EMAIL] Nenhum destinatario configurado para relatorio SFTP');
      return;
    }

    const subject = mode === 'dry_run'
      ? `[DRY-RUN] Resumo da rotina de atualizacao de funcionarios - ${run.file.remoteName}`
      : `Resumo da rotina de atualizacao de funcionarios - ${run.file.remoteName}`;

    const html = mode === 'dry_run'
      ? buildSftpDryRunReportEmail(run)
      : buildSftpSocReportEmail(run);

    // Gerar Excel para modo SOC
    let excelBuffer: Buffer | undefined;
    let excelFileName: string | undefined;
    if (mode === 'soc_limited' && run.soapPreview?.length) {
      try {
        const baseName = run.file.remoteName.replace(/\.[^.]+$/, '');
        excelFileName = `Relatorio_SOC_${baseName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        excelBuffer = await generateSocReportExcel(
          run.soapPreview as any,
          run.summary,
          excelFileName,
        );
        this.logger.log(`[EMAIL] Excel gerado: ${excelFileName} (${excelBuffer.length} bytes)`);
        if (this.reportStorageValue && (run as any)._id) {
          const key = `relatorios-soc/${run.clientKey}/${excelFileName}`;
          await this.reportStorageValue.upload(key, excelBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          await this.runsCollection().updateOne(
            { _id: (run as any)._id },
            { $set: { reportKey: key, reportFileName: excelFileName } },
          );
        }
      } catch (err) {
        this.logger.warn(`[EMAIL] Falha ao gerar Excel: ${err}`);
      }
    }

    // ─── Enfileirar na Cloudflare Queue (worker envia) ───
    try {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
      const queueName = process.env.CLOUDFLARE_QUEUE_NAME || 'email-service';
      const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

      if (accountId && apiToken && queueName) {
        // Converter Excel para base64 para enviar na fila
        let excelBase64: string | undefined;
        let excelContentType: string | undefined;
        if (excelBuffer && excelFileName) {
          excelBase64 = excelBuffer.toString('base64');
          excelContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }

        const queuePayload = {
          to: recipients,
          subject,
          html,
          attachments: excelBase64 && excelFileName ? [{
            filename: excelFileName,
            content: excelBase64,
            contentType: excelContentType,
          }] : undefined,
        };

        const queueUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueName}/messages`;
        const response = await fetch(queueUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ body: queuePayload }),
        });

        if (response.ok) {
          this.logger.log(`[EMAIL] Relatorio enfileirado na Cloudflare Queue "${queueName}" para ${recipients.length} destinatarios`);
          return;
        } else {
          this.logger.warn(`[EMAIL] Falha ao enfileirar: ${response.status} ${response.statusText}`);
        }
      } else {
        this.logger.debug('[EMAIL] Cloudflare Queue nao configurada (ACCOUNT_ID/TOKEN/QUEUE_NAME)');
      }
    } catch (err) {
      this.logger.warn(`[EMAIL] Falha ao enfileirar na Queue: ${err}`);
    }

    // ─── Fallback: Nodemailer direto ───
    try {
      const transporter = await getNodemailerTransporter();
      if (transporter) {
        const mailOptions: any = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@engemedical.com.br',
          to: recipients.join(', '),
          subject,
          html,
        };
        if (excelBuffer && excelFileName) {
          mailOptions.attachments = [{
            filename: excelFileName,
            content: excelBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }];
        }
        await transporter.sendMail(mailOptions);
        this.logger.log(`[EMAIL] Relatorio enviado diretamente via SMTP para ${recipients.length} destinatarios${excelBuffer ? ' (com anexo Excel)' : ''}`);
        return;
      }
    } catch (err) {
      this.logger.warn(`[EMAIL] Falha SMTP direto: ${err}. Relatorio salvo no MongoDB.`);
    }

    // Fallback: salvar relatorio no MongoDB para envio manual posterior
    try {
      await this.runsCollection().updateOne(
        { _id: (run as any)._id },
        { $set: { emailPending: true, emailRecipients: recipients, emailSubject: subject } },
      );
      this.logger.log(`[EMAIL] Relatorio marcado como pendente no MongoDB`);
    } catch { /* ignore */ }
  }

  async getRunReportForDownload(clientKey: string, id: string) {
    if (!ObjectId.isValid(id) || !this.reportStorageValue) {
      throw new NotFoundException('Relatorio nao encontrado');
    }
    const run = await this.runsCollection().findOne({
      _id: new ObjectId(id),
      clientKey: normalizeSftpIntegratorClientKey(clientKey),
    });
    if (!run?.reportKey) throw new NotFoundException('Relatorio nao encontrado');
    return {
      buffer: await this.reportStorageValue.download(run.reportKey),
      fileName: run.reportFileName || 'relatorio-sftp.xlsx',
    };
  }

  // ═══════════════════════════════════════════════════════════════

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
    if (file.r2Key && this.reportStorageValue) {
      const config = getSftpIntegratorConfig(normalizedClientKey);
      const root = path.resolve(this.backendRootValue, config.downloadDir);
      const temporaryPath = path.join(root, `.r2-${fileId.toHexString()}-${file.remoteName}`);
      await this.fs.mkdir(root);
      await fs.writeFile(temporaryPath, await this.reportStorageValue.download(file.r2Key));
      setTimeout(() => fs.unlink(temporaryPath).catch(() => undefined), 60_000).unref();
      return { normalizedClientKey, fileId, file, resolvedPath: temporaryPath };
    }
    const resolvedPath = await this.resolveDownloadPath(
      normalizedClientKey,
      file.localPath,
    );
    return { normalizedClientKey, fileId, file, resolvedPath };
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
