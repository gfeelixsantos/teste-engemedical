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
import {
  getSftpIntegratorConfig,
  normalizeSftpIntegratorClientKey,
} from './sftp-integrator.config';
import { SftpIntegratorFs } from './sftp-integrator.fs';
import {
  SftpClientAdapter,
  SftpIntegratorFileRecord,
  SftpPullResult,
} from './sftp-integrator.types';

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

  async listFiles(clientKey: string, limit = 50) {
    const normalizedClientKey = normalizeSftpIntegratorClientKey(clientKey);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.collection()
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
}
