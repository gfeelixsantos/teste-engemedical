import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

export class AzureBlobService {
  private blobServiceClient!: BlobServiceClient;
  private credential!: StorageSharedKeyCredential;
  private legacyBlobServiceClient: BlobServiceClient | null = null;
  private legacyCredential: StorageSharedKeyCredential | null = null;
  public readonly legacyAvailable: boolean;

  constructor() {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr) {
      this.legacyAvailable = false;
      return;
    }
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connStr);

    // Credenciais para SAS baseado em key
    const matches = connStr.match(/AccountName=(.*?);AccountKey=(.*?);/);

    if (matches)
      this.credential = new StorageSharedKeyCredential(matches[1], matches[2]);

    // Storage legado (cmsodocuments) para fallback de blobs antigos
    const legacyConn = process.env.AZURE_LEGACY_STORAGE_CONNECTION_STRING;
    if (legacyConn) {
      try {
        this.legacyBlobServiceClient =
          BlobServiceClient.fromConnectionString(legacyConn);
        const legacyMatches = legacyConn.match(
          /AccountName=(.*?);AccountKey=(.*?);/,
        );
        if (legacyMatches) {
          this.legacyCredential = new StorageSharedKeyCredential(
            legacyMatches[1],
            legacyMatches[2],
          );
        }
      } catch {
        // Legacy não disponível, segue sem fallback
      }
    }
    this.legacyAvailable = !!this.legacyBlobServiceClient;
  }

  generateSasUrl(container: string, blobPath: string, minutes = 60) {
    const isLegacy =
      typeof blobPath === 'string' && blobPath.includes('cmsodocuments');

    if (blobPath.startsWith('http')) {
      blobPath = new URL(blobPath).pathname.replace(`/${container}/`, '');
    }

    const encodedBlobPath = decodeURIComponent(blobPath);

    const credential = isLegacy && this.legacyCredential
      ? this.legacyCredential
      : this.credential;
    const serviceClient = isLegacy && this.legacyBlobServiceClient
      ? this.legacyBlobServiceClient
      : this.blobServiceClient;

    const containerClient = serviceClient.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(encodedBlobPath);

    const startsOn = new Date(Date.now() - 30_000);
    const expiresOn = new Date(Date.now() + minutes * 60_000);

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: encodedBlobPath,
        permissions: BlobSASPermissions.parse('r'),
        protocol: SASProtocol.Https,
        startsOn,
        expiresOn,
      },
      credential,
    );

    return `${blobClient.url}?${sasParams.toString()}`;
  }

  async upload(
    container: string,
    blobName: string,
    buffer: Buffer,
    metadata?: Record<string, string>,
    contentType = 'application/pdf',
  ): Promise<string> {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    await containerClient.createIfNotExists();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
      metadata: this.sanitizeMetadata(metadata),
    });
    return blockBlobClient.url;
  }

  /**
   * Faz upload para um container com acesso público de leitura (blob-level).
   * Cria o container como público se ainda não existir.
   * Retorna a URL pública direta, sem SAS token.
   */
  async uploadPublic(
    container: string,
    blobName: string,
    buffer: Buffer,
    contentType = 'application/pdf',
  ): Promise<string> {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    await containerClient.createIfNotExists({ access: 'blob' });
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blockBlobClient.url;
  }

  /**
   * Retorna a URL pública direta de um blob em container público.
   * Não gera SAS token.
   */
  getPublicUrl(container: string, blobName: string): string {
    return this.blobServiceClient
      .getContainerClient(container)
      .getBlockBlobClient(blobName).url;
  }

  private sanitizeMetadata(
    metadata?: Record<string, string>,
  ): Record<string, string> | undefined {
    if (!metadata) return undefined;

    return Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [
        key,
        String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\x20-\x7E]/g, '_')
          .trim(),
      ]),
    );
  }

  getBlobUrl(container: string, blobName: string): string {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    return containerClient.getBlockBlobClient(blobName).url;
  }

  async download(container: string, blobName: string): Promise<Buffer> {
    try {
      const containerClient =
        this.blobServiceClient.getContainerClient(container);
      const blobClient = containerClient.getBlobClient(blobName);
      return await blobClient.downloadToBuffer();
    } catch (err) {
      if (this.legacyBlobServiceClient && (err as any)?.statusCode === 404) {
        const legacyContainerClient =
          this.legacyBlobServiceClient.getContainerClient(container);
        const legacyBlobClient =
          legacyContainerClient.getBlobClient(blobName);
        return await legacyBlobClient.downloadToBuffer();
      }
      throw err;
    }
  }

  async deleteIfExists(container: string, blobName: string): Promise<void> {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(blobName);
    await blobClient.deleteIfExists();
  }

  async listBlobs(container: string, prefix: string): Promise<string[]> {
    const containerClient =
      this.blobServiceClient.getContainerClient(container);
    const blobs: string[] = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      blobs.push(blob.name);
    }
    return blobs;
  }
}
