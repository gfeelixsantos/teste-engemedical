export declare class AzureBlobService {
  constructor(connectionString: string);
  initialize(): Promise<void>;
  uploadFile(fileName: string, filePath: string): Promise<string>;
  uploadBuffer(fileName: string, buffer: Buffer): Promise<string>;
  downloadFile(fileName: string, downloadPath: string): Promise<string>;
  getFileUrl(fileName: string): string;
}
