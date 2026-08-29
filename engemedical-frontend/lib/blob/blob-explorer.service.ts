/**
 * BlobExplorerService — server-side only (Next.js API routes / Server Components).
 * Never import this module from client-side code.
 *
 * Reads credentials exclusively from server environment variables:
 *   AZURE_STORAGE_CONNECTION_STRING
 *   AZURE_CONTAINER_DOCUMENTS  (default: "documents")
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlobItem {
  name: string;
  size: number;
  lastModified: string; // ISO 8601
  metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConnectionString(): string {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!cs) {
    throw new Error(
      "Missing environment variable: AZURE_STORAGE_CONNECTION_STRING",
    );
  }

  return cs;
}

function getDefaultContainer(): string {
  return process.env.AZURE_CONTAINER_DOCUMENTS ?? "documents";
}

/**
 * Parses an Azure Storage connection string and returns the account name and
 * account key.  Throws if either value is missing.
 *
 * Connection string format (simplified):
 *   DefaultEndpointsProtocol=https;AccountName=<name>;AccountKey=<key>;...
 */
function parseConnectionString(connectionString: string): {
  accountName: string;
  accountKey: string;
} {
  const parts = connectionString.split(";");
  const map: Record<string, string> = {};

  for (const part of parts) {
    const eqIdx = part.indexOf("=");

    if (eqIdx === -1) continue;

    const key = part.substring(0, eqIdx).trim();
    // The value may itself contain "=" (e.g. base-64 keys)
    const value = part.substring(eqIdx + 1).trim();

    map[key] = value;
  }

  const accountName = map["AccountName"];
  const accountKey = map["AccountKey"];

  if (!accountName || !accountKey) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is missing AccountName or AccountKey",
    );
  }

  return { accountName, accountKey };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class BlobExplorerService {
  /**
   * Lists all blobs under the given prefix in the specified container.
   *
   * @param prefix    - Blob name prefix to filter results (e.g. "aso/2026/05/1733915/")
   * @param container - Container name; defaults to AZURE_CONTAINER_DOCUMENTS env var
   * @returns         Array of BlobItem objects with name, size, lastModified and metadata
   */
  static async listBlobs(
    prefix: string,
    container?: string,
  ): Promise<BlobItem[]> {
    const connectionString = getConnectionString();
    const containerName = container ?? getDefaultContainer();

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const items: BlobItem[] = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      items.push({
        name: blob.name,
        size: blob.properties.contentLength ?? 0,
        lastModified: blob.properties.lastModified?.toISOString() ?? new Date(0).toISOString(),
        metadata: blob.metadata as Record<string, string> | undefined,
      });
    }

    return items;
  }

  /**
   * Generates a SAS URL for the given blob, valid for 60 minutes.
   *
   * @param blobName  - Full blob path within the container
   * @param container - Container name; defaults to AZURE_CONTAINER_DOCUMENTS env var
   * @returns         Fully-qualified SAS URL string
   */
  static generateSasUrl(blobName: string, container?: string): string {
    const connectionString = getConnectionString();
    const containerName = container ?? getDefaultContainer();

    const { accountName, accountKey } = parseConnectionString(connectionString);

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey,
    );

    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + 60 * 60 * 1000); // +60 minutes

    const sasQueryParameters = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("r"), // read-only
        startsOn,
        expiresOn,
        protocol: SASProtocol.Https,
      },
      sharedKeyCredential,
    );

    const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasQueryParameters.toString()}`;

    return sasUrl;
  }

  /**
   * Downloads the full content of a blob as a Buffer.
   *
   * @param blobName  - Full blob path within the container
   * @param container - Container name; defaults to AZURE_CONTAINER_DOCUMENTS env var
   * @returns         Buffer containing the blob's binary content
   */
  static async downloadBlob(
    blobName: string,
    container?: string,
  ): Promise<Buffer> {
    const connectionString = getConnectionString();
    const containerName = container ?? getDefaultContainer();

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const buffer = await blockBlobClient.downloadToBuffer();

    return buffer;
  }
}
