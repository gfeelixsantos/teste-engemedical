import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  SftpClientAdapter,
  SftpIntegratorConfig,
  SftpRemoteFile,
} from './sftp-integrator.types';

export function fingerprintKey(value?: string): string {
  const raw = String(value || '').trim();
  const withoutPrefix = raw.toLowerCase().startsWith('sha256:')
    ? raw.slice(7)
    : raw;
  return withoutPrefix.toLowerCase().replace(/=+$/g, '');
}

export function fingerprintHex(value?: string): string {
  const raw = String(value || '').trim();
  const key = raw.toLowerCase().startsWith('sha256:')
    ? raw.slice(7).replace(/=+$/g, '')
    : raw.replace(/=+$/g, '');
  if (!key) {
    return '';
  }
  if (/^[a-f0-9]{64}$/i.test(key)) {
    return key.toLowerCase();
  }
  try {
    return Buffer.from(key, 'base64').toString('hex').toLowerCase();
  } catch {
    return '';
  }
}

export function fingerprintBase64FromHex(value?: string): string {
  const hex = fingerprintHex(value);
  if (!hex) {
    return '';
  }
  return Buffer.from(hex, 'hex')
    .toString('base64')
    .replace(/=+$/g, '')
    .toLowerCase();
}

@Injectable()
export class Ssh2SftpClientAdapter implements SftpClientAdapter {
  async list(config: SftpIntegratorConfig): Promise<SftpRemoteFile[]> {
    const client = await this.connect(config);
    try {
      const items = await client.list(config.remotePath);
      return items
        .filter((item) => item.type !== 'd')
        .map((item) => ({
          name: item.name,
          path: `${config.remotePath.replace(/\/+$/g, '')}/${item.name}`,
          size: Number(item.size || 0),
          mtime: item.modifyTime ? new Date(Number(item.modifyTime)) : null,
        }));
    } finally {
      await client.end();
    }
  }

  async download(
    config: SftpIntegratorConfig,
    remotePath: string,
    localPath: string,
  ): Promise<void> {
    const client = await this.connect(config);
    try {
      await client.fastGet(remotePath, localPath);
    } finally {
      await client.end();
    }
  }

  private async connect(config: SftpIntegratorConfig): Promise<any> {
    let SftpClient: any;
    try {
      SftpClient = require('ssh2-sftp-client');
    } catch {
      throw new InternalServerErrorException(
        'Dependencia ssh2-sftp-client nao instalada no backend',
      );
    }

    const client = new SftpClient();
    const expectedFingerprintKey = fingerprintKey(config.fingerprint);
    const expectedFingerprintHex = fingerprintHex(config.fingerprint);
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.authMethod === 'password' ? config.password : undefined,
      privateKey: config.authMethod === 'key' ? config.privateKey : undefined,
      passphrase:
        config.authMethod === 'key' ? config.privateKeyPassphrase : undefined,
      readyTimeout: 30000,
      hostHash: expectedFingerprintHex ? 'sha256' : undefined,
      hostVerifier: expectedFingerprintKey
        ? (hash: string) => {
            const actualHex = fingerprintHex(hash);
            if (actualHex && actualHex === expectedFingerprintHex) {
              return true;
            }
            return fingerprintBase64FromHex(hash) === expectedFingerprintKey;
          }
        : undefined,
    });
    return client;
  }
}
