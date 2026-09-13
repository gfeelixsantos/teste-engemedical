import { BadRequestException } from '@nestjs/common';
import { SftpIntegratorConfig } from './sftp-integrator.types';

const DEFAULT_CLIENT_KEY = 'grupo-tora';

function normalizeClientKey(clientKey: string): string {
  return clientKey
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function envPrefix(clientKey: string): string {
  return `SFTP_INTEGRATOR_${normalizeClientKey(clientKey)
    .replace(/-/g, '_')
    .toUpperCase()}`;
}

function firstEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return undefined;
}

export function getSftpIntegratorConfig(
  clientKey = DEFAULT_CLIENT_KEY,
): SftpIntegratorConfig {
  const normalizedClientKey = normalizeClientKey(clientKey);
  if (!normalizedClientKey) {
    throw new BadRequestException('Cliente SFTP invalido');
  }

  const prefix = envPrefix(normalizedClientKey);
  const legacyTora = normalizedClientKey === DEFAULT_CLIENT_KEY;
  const legacy = (key: string) => (legacyTora ? [`TORA_SFTP_${key}`] : []);
  const enabledLegacy = legacyTora ? ['ENABLE_TORA_SFTP_CRON'] : [];

  const host = firstEnv([`${prefix}_HOST`, ...legacy('HOST')]);
  const username = firstEnv([`${prefix}_USERNAME`, ...legacy('USERNAME')]);
  const authMethod = firstEnv([
    `${prefix}_AUTH_METHOD`,
    ...legacy('AUTH_METHOD'),
  ]) || 'password';

  if (!host || !username) {
    throw new BadRequestException(
      `Configuracao SFTP ausente para ${normalizedClientKey}`,
    );
  }
  if (authMethod !== 'password' && authMethod !== 'key') {
    throw new BadRequestException(
      `Metodo de autenticacao SFTP invalido para ${normalizedClientKey}`,
    );
  }

  return {
    clientKey: normalizedClientKey,
    host,
    port: Number(firstEnv([`${prefix}_PORT`, ...legacy('PORT')]) || 22),
    username,
    password: firstEnv([`${prefix}_PASSWORD`, ...legacy('PASSWORD')]),
    privateKey: firstEnv([`${prefix}_PRIVATE_KEY`, ...legacy('PRIVATE_KEY')]),
    privateKeyPassphrase: firstEnv([
      `${prefix}_PRIVATE_KEY_PASSPHRASE`,
      ...legacy('PRIVATE_KEY_PASSPHRASE'),
    ]),
    authMethod,
    fingerprint: firstEnv([
      `${prefix}_FINGERPRINT`,
      ...legacy('FINGERPRINT'),
    ]),
    remotePath:
      firstEnv([`${prefix}_REMOTE_PATH`, ...legacy('BASE_PATH')]) || '/',
    filePattern:
      firstEnv([`${prefix}_FILE_PATTERN`, ...legacy('REMOTE_GLOB')]) ||
      'LOG_INTEGRACAO_*.xlsx',
    downloadDir:
      firstEnv([`${prefix}_DOWNLOAD_DIR`, ...legacy('DOWNLOAD_DIR')]) ||
      `data/sftp-integrator/${normalizedClientKey}/incoming`,
    cronEnabled:
      String(
        firstEnv([`${prefix}_CRON_ENABLED`, ...enabledLegacy]) || 'true',
      ).toLowerCase() === 'true',
  };
}

export const normalizeSftpIntegratorClientKey = normalizeClientKey;
