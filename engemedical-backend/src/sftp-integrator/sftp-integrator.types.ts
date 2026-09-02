export type SftpIntegratorClientKey = string;

export type SftpIntegratorConfig = {
  clientKey: SftpIntegratorClientKey;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  privateKeyPassphrase?: string;
  authMethod: 'password' | 'key';
  fingerprint?: string;
  remotePath: string;
  filePattern: string;
  downloadDir: string;
  cronEnabled: boolean;
};

export type SftpRemoteFile = {
  name: string;
  path: string;
  size: number;
  mtime: Date | null;
};

export type SftpIntegratorFileRecord = {
  clientKey: string;
  remotePath: string;
  remoteName: string;
  localPath: string;
  size: number;
  sha256: string;
  remoteMtime: Date | null;
  status: 'downloaded';
  createdAt: Date;
  updatedAt: Date;
};

export type SftpPullResult = {
  clientKey: string;
  downloaded: boolean;
  file: SftpIntegratorFileRecord;
};

export type SftpIntegratorParseRun = {
  clientKey: string;
  fileId: unknown;
  status: 'parsed' | 'dry_run' | 'soc_limited';
  summary: unknown;
  invalidRowsPreview: unknown[];
  soapPreview?: unknown[];
  createdAt: Date;
  updatedAt: Date;
};

export interface SftpClientAdapter {
  list(config: SftpIntegratorConfig): Promise<SftpRemoteFile[]>;
  download(
    config: SftpIntegratorConfig,
    remotePath: string,
    localPath: string,
  ): Promise<void>;
}
