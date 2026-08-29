import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';

import { QueueClient, QueueServiceClient } from '@azure/storage-queue';

import { PDFDocument } from 'pdf-lib';
import { SchedulingDocument } from 'src/mongo/types/scheduling';
import {
  EmailType,
  resultadosExamesQueue,
  UploadSocged,
  UploadGoogleDrive,
  AsoProcessingMessage,
  AsoEnriquecimentoMessage,
  ResultadoExameSocMessage,
  CustomerEmailCampaignOrchestrateMessage,

} from './types/azure.types';
import { AsoInfo } from 'src/mongo/types/scheduling';
import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import {
  generateBlobFileName,
  generateBlobPath,
  BlobFileType,
} from 'src/utils/blob-naming.util';

/**
 * Serviço Azure otimizado
 * - Clients criados apenas 1 vez (SINGLETON)
 * - Upload otimizado
 * - Conversão PDF preservada, mas isolada e limpa
 * - Sem createIfNotExists desnecessário
 * - Regras de negócio mantidas
 */
@Injectable()
export class AzureService {
  private readonly logger = new Logger(AzureService.name);

  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private queueServiceClient: QueueServiceClient | null = null;
  private enabled = false;

  private readonly containerName = 'documents';
  private readonly queueResultadosExames =
    process.env.AZURE_QUEUE_RESULTADOS_EXAMES || 'resultados-exames';
  private readonly queueEmail = process.env.AZURE_QUEUE_EMAIL || 'email';
  private readonly queueSocged = process.env.AZURE_QUEUE_SOCGED || 'socged';
  private readonly queueAsoProcessing =
    process.env.AZURE_QUEUE_ASO_PROCESSING || 'aso-processing';
  private readonly queueAsoEnriquecimento =
    process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO || 'aso-enriquecimento';
  private readonly queueExameEnriquecimento =
    process.env.AZURE_QUEUE_EXAME_ENRIQUECIMENTO || 'exames-enriquecimento';
  private readonly queueGoogleDriveUpload =
    process.env.AZURE_QUEUE_GOOGLE_DRIVE_UPLOAD || 'google-drive-upload';
  private readonly queueResultadoExameSoc =
    process.env.AZURE_QUEUE_RESULTADO_EXAME_SOC || 'resultado-exame-soc';
  private readonly queueCustomerEmailCampaign =
    process.env.AZURE_QUEUE_CUSTOMER_EMAIL_CAMPAIGN || 'customer-email-campaign';
  // Dead Letter Queues (filas de falhas)
  private readonly queueEmailFalhas =
    process.env.AZURE_QUEUE_EMAIL_FALHAS || 'email-falhas';
  private readonly queueAsoEnriquecimentoFalhas =
    process.env.AZURE_QUEUE_ASO_ENRIQUECIMENTO_FALHAS || 'aso-enriquecimento-falhas';
  private readonly queueExameEnriquecimentoFalhas =
    process.env.AZURE_QUEUE_EXAME_ENRIQUECIMENTO_FALHAS || 'exames-enriquecimento-falhas';
  private readonly queueAsoProcessingFalhas =
    process.env.AZURE_QUEUE_ASO_PROCESSING_FALHAS || 'aso-processing-falhas';
  private readonly googleDriveQueueEnabled =
    String(process.env.ENABLE_GOOGLE_DRIVE_QUEUE || 'false').toLowerCase() ===
    'true';

  private queueResultadosClient: QueueClient | null = null;
  private queueEmailClient: QueueClient | null = null;
  private queueSocgedClient: QueueClient | null = null;
  private queueAsoProcessingClient: QueueClient | null = null;
  private queueAsoEnriquecimentoClient: QueueClient | null = null;
  public queueExameEnriquecimentoClient: QueueClient | null = null;
  public queueGoogleDriveUploadClient: QueueClient | null = null;
  public queueResultadoExameSocClient: QueueClient | null = null;
  private queueCustomerEmailCampaignClient: QueueClient | null = null;
  // Dead Letter Queue clients
  private queueEmailFalhasClient: QueueClient | null = null;
  private queueAsoEnriquecimentoFalhasClient: QueueClient | null = null;
  private queueExameEnriquecimentoFalhasClient: QueueClient | null = null;
  private queueAsoProcessingFalhasClient: QueueClient | null = null;
  private sharedKeyCredential: StorageSharedKeyCredential | null = null;

  // Storage legado (cmsodocuments) para fallback de blobs antigos
  private legacyBlobServiceClient: BlobServiceClient | null = null;
  private legacyContainerClient: ContainerClient | null = null;
  private legacySharedKeyCredential: StorageSharedKeyCredential | null = null;

  constructor() {
    const conn =
      process.env.AZURE_CONNECTION_STRING_BLOB ||
      process.env.AZURE_STORAGE_CONNECTION_STRING ||
      process.env.AZURE_CONNECTION_STRING;

    if (!conn) {
      this.logger.warn(
        '[AZURE] Conexao nao configurada. API iniciada em modo degradado (sem Blob/Queue).',
      );
      return;
    }

    // Extrai credenciais da connection string (compatível com chave interna)
    const matches = conn.match(/AccountName=(.*?);.*AccountKey=(.*?);/);
    if (!matches) {
      this.logger.error(
        '[AZURE] Falha ao extrair credenciais da connection string. Modo degradado ativado.',
      );
      return;
    }

    const accountName = matches[1];
    const accountKey = matches[2];

    this.sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey,
    );

    // Criado apenas 1 vez (máximo desempenho)
    this.blobServiceClient = BlobServiceClient.fromConnectionString(conn);
    this.queueServiceClient = QueueServiceClient.fromConnectionString(conn);

    // Instância única e reutilizada
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );

    // Cria container apenas 1 vez
    this.containerClient.createIfNotExists().then(() => {
      this.logger.log(`[AZURE] Container '${this.containerName}' disponível`);
    });

    // Prepara filas
    this.queueResultadosClient = this.queueServiceClient.getQueueClient(
      this.queueResultadosExames,
    );
    this.queueEmailClient = this.queueServiceClient.getQueueClient(
      this.queueEmail,
    );
    this.queueSocgedClient = this.queueServiceClient.getQueueClient(
      this.queueSocged,
    );
    this.queueAsoProcessingClient = this.queueServiceClient.getQueueClient(
      this.queueAsoProcessing,
    );
    this.queueAsoEnriquecimentoClient = this.queueServiceClient.getQueueClient(
      this.queueAsoEnriquecimento,
    );
    this.queueExameEnriquecimentoClient =
      this.queueServiceClient.getQueueClient(this.queueExameEnriquecimento);
    this.queueGoogleDriveUploadClient = this.queueServiceClient.getQueueClient(
      this.queueGoogleDriveUpload,
    );
    this.queueResultadoExameSocClient = this.queueServiceClient.getQueueClient(
      this.queueResultadoExameSoc,
    );
    this.queueCustomerEmailCampaignClient = this.queueServiceClient.getQueueClient(
      this.queueCustomerEmailCampaign,
    );
    // Dead Letter Queues
    this.queueEmailFalhasClient = this.queueServiceClient.getQueueClient(
      this.queueEmailFalhas,
    );
    this.queueAsoEnriquecimentoFalhasClient =
      this.queueServiceClient.getQueueClient(this.queueAsoEnriquecimentoFalhas);
    this.queueExameEnriquecimentoFalhasClient =
      this.queueServiceClient.getQueueClient(this.queueExameEnriquecimentoFalhas);
    this.queueAsoProcessingFalhasClient =
      this.queueServiceClient.getQueueClient(this.queueAsoProcessingFalhas);

    // Garante existência somente 1 vez
    Promise.all([
      this.queueResultadosClient.createIfNotExists(),
      this.queueEmailClient.createIfNotExists(),
      this.queueSocgedClient.createIfNotExists(),
      this.queueAsoProcessingClient.createIfNotExists(),
      this.queueAsoEnriquecimentoClient.createIfNotExists(),
      this.queueExameEnriquecimentoClient.createIfNotExists(),
      this.queueGoogleDriveUploadClient.createIfNotExists(),
      this.queueResultadoExameSocClient.createIfNotExists(),
      this.queueCustomerEmailCampaignClient.createIfNotExists(),
      this.queueEmailFalhasClient.createIfNotExists(),
      this.queueAsoEnriquecimentoFalhasClient.createIfNotExists(),
      this.queueExameEnriquecimentoFalhasClient.createIfNotExists(),
      this.queueAsoProcessingFalhasClient.createIfNotExists(),
    ]).then(() => {
      this.logger.log(`[AZURE] Filas verificadas (incluindo DLQs)`);
    });

    // Storage legado para fallback de blobs antigos (cmsodocuments)
    const legacyConn = process.env.AZURE_LEGACY_STORAGE_CONNECTION_STRING;
    if (legacyConn) {
      try {
        this.legacyBlobServiceClient =
          BlobServiceClient.fromConnectionString(legacyConn);
        this.legacyContainerClient =
          this.legacyBlobServiceClient.getContainerClient(
            this.containerName,
          );
        const legacyMatches = legacyConn.match(
          /AccountName=(.*?);.*AccountKey=(.*?);/,
        );
        if (legacyMatches) {
          this.legacySharedKeyCredential =
            new StorageSharedKeyCredential(
              legacyMatches[1],
              legacyMatches[2],
            );
        }
        this.logger.log(
          `[AZURE] Storage legado configurado para fallback de blobs`,
        );
      } catch (e) {
        this.logger.warn(
          `[AZURE] Storage legado não pôde ser inicializado: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    this.enabled = true;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getContainerClientPublic(): ContainerClient {
    return this.getContainerClientOrThrow();
  }

  public getPublicContainerClient(): ContainerClient {
    if (!this.blobServiceClient) {
      throw new Error(
        'Azure Blob indisponivel: servico iniciado sem connection string valida.',
      );
    }
    const publicContainerName = process.env.AZURE_CONTAINER_PUBLIC || 'public';
    return this.blobServiceClient.getContainerClient(publicContainerName);
  }

  public getLegacyContainerClient(): ContainerClient | null {
    return this.legacyContainerClient;
  }

  public getDocumentsContainerClient(): ContainerClient {
    return this.getContainerClientOrThrow();
  }

  public async listBlobsByPrefix(
    prefix: string,
    containerClient: ContainerClient,
  ): Promise<Array<{ name: string; url: string; lastModified?: Date }>> {
    const results: Array<{ name: string; url: string; lastModified?: Date }> = [];
    try {
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        if (blob.name.toLowerCase().endsWith('.pdf')) {
          const url = `${containerClient.url}/${encodeURI(blob.name)}`;
          results.push({ name: blob.name, url, lastModified: blob.properties.lastModified });
        }
      }
    } catch (error) {
      this.logger.debug(`[listBlobsByPrefix] Error listing prefix "${prefix}": ${error instanceof Error ? error.message : String(error)}`);
    }
    return results;
  }

  private getContainerClientOrThrow(): ContainerClient {
    if (!this.containerClient) {
      throw new Error(
        'Azure Blob indisponivel: servico iniciado sem connection string valida.',
      );
    }
    return this.containerClient;
  }

  private getSharedKeyCredentialOrThrow(): StorageSharedKeyCredential {
    if (!this.sharedKeyCredential) {
      throw new Error(
        'Azure SharedKey indisponivel: verifique AZURE_CONNECTION_STRING_BLOB/AZURE_STORAGE_CONNECTION_STRING.',
      );
    }
    return this.sharedKeyCredential;
  }

  private getQueueClientOrThrow(
    client: QueueClient | null,
    queueName: string,
  ): QueueClient {
    if (!client) {
      throw new Error(
        `Fila Azure '${queueName}' indisponivel: servico iniciado sem connection string valida.`,
      );
    }
    return client;
  }

  // ============================================================
  // ===============       UPLOAD DE ARQUIVOS     ===============
  // ============================================================

  async upload(
    containerName: string,
    blobName: string,
    buffer: Buffer,
    contentType = 'application/pdf',
  ): Promise<string> {
    if (!this.blobServiceClient) {
      throw new Error(
        'Azure Blob indisponivel: servico iniciado sem connection string valida.',
      );
    }
    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blobClient.url;
  }

  /**
   * Upload de stream diretamente para Azure Blob sem acumular em memória.
   * Usa BlockBlobClient.uploadStream() com chunks de 4MB.
   */
  async uploadStream(
    containerName: string,
    blobName: string,
    readableStream: NodeJS.ReadableStream,
    contentType = 'application/zip',
  ): Promise<string> {
    if (!this.blobServiceClient) {
      throw new Error(
        'Azure Blob indisponivel: servico iniciado sem connection string valida.',
      );
    }
    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadStream(readableStream, 4 * 1024 * 1024, 5, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blobClient.url;
  }

  /**
   * Faz upload para um container com acesso público de leitura (blob-level).
   * Cria o container como público se ainda não existir.
   * Retorna a URL pública direta, sem SAS token.
   */
  async uploadPublic(
    containerName: string,
    blobName: string,
    buffer: Buffer,
    contentType = 'application/pdf',
  ): Promise<string> {
    if (!this.blobServiceClient) {
      throw new Error(
        'Azure Blob indisponivel: servico iniciado sem connection string valida.',
      );
    }
    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: 'blob' });
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blobClient.url;
  }

  /**
   * Retorna a URL pública direta de um blob em container público.
   * Não gera SAS token.
   */
  getPublicUrl(containerName: string, blobName: string): string {
    if (!this.blobServiceClient) {
      // Fallback: monta URL manualmente
      const account = process.env.AZURE_STORAGE_ACCOUNT || 'cmsodocs';
      return `https://${account}.blob.core.windows.net/${containerName}/${blobName}`;
    }
    return this.blobServiceClient
      .getContainerClient(containerName)
      .getBlockBlobClient(blobName).url;
  }

  async updateFile(
    employee: SchedulingDocument,
    files: Express.Multer.File[],
    origin: 'recepcao' | 'relatorio' | 'agendamento' = 'relatorio',
  ) {
    const containerClient = this.getContainerClientOrThrow();
    const uploadDate = new Date();
    const attachmentDate = new Date(
      employee.DATAAGENDAMENTO.split('/').reverse().join('-'),
    );

    for (const file of files) {
      const normalizedFile = await this.normalizeUploadFileToPdf({
        buffer: file.buffer,
        contentType: file.mimetype,
        originalName: file.originalname,
      });
      const { buffer, contentType, originalName } = normalizedFile;

      // Remove extensão para usar como tipo de documento
      const docType = originalName.replace(/\.[^/.]+$/, '');

      // Gera nome padronizado
      const newFileName = generateBlobFileName({
        type: 'ATTACHMENT',
        empresaCode: employee.CODIGOEMPRESA,
        funcionarioName: employee.NOME,
        documentType: docType,
        date: attachmentDate,
      });

      // Gera path completo
      const blobName = generateBlobPath({
        fileType: 'anexos',
        empresaCode: employee.CODIGOEMPRESA,
        prontuario: employee.CODIGOPRONTUARIO,
        fileName: newFileName,
        date: uploadDate,
      });

      const blobClient = containerClient.getBlockBlobClient(blobName);

      await blobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType },
      });

      employee.ANEXOS.push({
        Name: originalName,
        Content: 'uploaded',
        Origin: origin,
        Size: file.size,
        Type: contentType,
        UploadedAt: new Date(),
        StoragePath: blobClient.url,
      });
    }

    return employee;
  }

  async normalizeUploadFileToPdf(params: {
    buffer: Buffer;
    contentType: string;
    originalName: string;
  }): Promise<{
    buffer: Buffer;
    contentType: string;
    originalName: string;
  }> {
    const { buffer, contentType, originalName } = params;

    if (contentType === 'image/jpeg' || contentType === 'image/png') {
      return {
        buffer: await this.convertImageToPdf(buffer, contentType),
        contentType: 'application/pdf',
        originalName: originalName.replace(/\.(jpg|jpeg|png)$/i, '.pdf'),
      };
    }

    return {
      buffer,
      contentType,
      originalName,
    };
  }

  // ============================================================
  // ============   UPLOAD GENERICO DE ARQUIVOS PDF   ===========
  // ============================================================

  async uploadGenericFile(
    employee: SchedulingDocument,
    pdfBuffer: Buffer,
    fileName: string, // Ex: 'PRONTUARIO_COMPLETO.pdf'
    source = 'BACKEND_MERGE',
  ) {
    const containerClient = this.getContainerClientOrThrow();
    const uploadDate = new Date();

    // Remove extensão para usar como tipo de documento
    const docType = fileName.replace(/\.[^/.]+$/, '');

    // Descobre o type real baseado no nome (ex: se tiver ASO e SIGNED)
    let blobType: any = 'RECORD';

    const upperName = docType.toUpperCase();
    if (upperName.includes('ASO_SIGNED')) {
      blobType = 'ASO_SIGNED';
    } else if (upperName.includes('ASO')) {
      blobType = 'ASO';
    } else if (upperName.includes('EXM_SIGNED') || upperName.includes('EXAME_SIGNED')) {
      blobType = 'EXAM_SIGNED';
    } else if (upperName.includes('EXM') || upperName.includes('EXAME')) {
      blobType = 'EXAM';
    } else if (upperName.includes('ANX') || upperName.includes('ATTACHMENT')) {
      blobType = 'ATTACHMENT';
    }

    // Gera nome padronizado
    const newFileName = generateBlobFileName({
      type: blobType,
      empresaCode: employee.CODIGOEMPRESA,
      funcionarioName: employee.NOME,
      documentType: docType,
      date: uploadDate,
    });

    // Gera path completo
    const blobName = generateBlobPath({
      fileType: 'prontuarios',
      empresaCode: employee.CODIGOEMPRESA,
      prontuario: employee.CODIGOPRONTUARIO,
      fileName: newFileName,
      date: uploadDate,
    });

    const blobClient = containerClient.getBlockBlobClient(blobName);

    await blobClient.uploadData(pdfBuffer, {
      blobHTTPHeaders: { blobContentType: 'application/pdf' },
    });

    // this.logger.log(`[UPLOAD] Arquivo enviado: ${blobClient.url}`);

    return blobClient.url;
  }

  // ============================================================
  // ============   UPLOAD RESULTADO DE EXAME PDF    ============
  // ============================================================

  async updateExamFile(
    employee: SchedulingDocument,
    grupo: string,
    pdfBuffer: Buffer,
    source = 'BACKEND_MANUAL_UPLOAD',
  ) {
    const containerClient = this.getContainerClientOrThrow();
    const uploadDate = new Date();

    // Gera nome padronizado
    const newFileName = generateBlobFileName({
      type: 'EXAM',
      empresaCode: employee.CODIGOEMPRESA,
      funcionarioName: employee.NOME,
      documentType: grupo,
      date: uploadDate,
    });

    // Gera path completo
    const blobName = generateBlobPath({
      fileType: 'exames',
      empresaCode: employee.CODIGOEMPRESA,
      prontuario: employee.CODIGOPRONTUARIO,
      fileName: newFileName,
      date: uploadDate,
    });

    const blobClient = containerClient.getBlockBlobClient(blobName);

    await blobClient.uploadData(pdfBuffer, {
      blobHTTPHeaders: { blobContentType: 'application/pdf' },
    });

    employee.EXAMES = employee.EXAMES.map((exame) =>
      exame.grupo?.trim().toLowerCase() === grupo.trim().toLowerCase()
        ? { ...exame, url: blobClient.url }
        : exame,
    );

    // this.logger.log(`[UPLOAD] PDF de exame salvo: ${blobClient.url}`);
    return employee;
  }

  // ============================================================
  // ======== UPLOAD IMAGEM DERIVADA DOCUMENTAL (BIOMETRIA) =====
  // ============================================================
  async uploadBiometricImage(
    prontuario: string,
    dedo: string,
    imageBuffer: Buffer,
    contentType: string = 'image/png',
  ): Promise<string> {
    const containerClient = this.getContainerClientOrThrow();
    
    // Gera path conforme padrao solicitado: autenticacao/biometria/{CODIGOPRONTUARIO}/{dedo}
    const blobName = `autenticacao/biometria/${prontuario}/${dedo}.png`;
    
    const blobClient = containerClient.getBlockBlobClient(blobName);

    await blobClient.uploadData(imageBuffer, {
      blobHTTPHeaders: { blobContentType: contentType },
      // Index Tags para Lifecycle Management (LGPD - 1 ano)
      tags: {
        Retention: '365',
        Type: 'Biometria',
        Prontuario: prontuario
      }
    });

    return blobName;
  }

  // ============================================================
  // ======== UPLOAD IMAGEM REPRESENTATURAL (FACIAL) ============
  // ============================================================
  async uploadFacialImage(
    prontuario: string,
    imageBuffer: Buffer,
    contentType: string = 'image/jpeg',
  ): Promise<string> {
    const containerClient = this.getContainerClientOrThrow();
    
    // Gera path conforme padrao solicitado: autenticacao/facial/{CODIGOPRONTUARIO}/representativa.jpg
    const blobName = `autenticacao/facial/${prontuario}/representativa.jpg`;
    
    const blobClient = containerClient.getBlockBlobClient(blobName);

    await blobClient.uploadData(imageBuffer, {
      blobHTTPHeaders: { blobContentType: contentType },
      // Index Tags para Lifecycle Management (LGPD - 1 ano)
      tags: {
        Retention: '365',
        Type: 'Facial',
        Prontuario: prontuario
      }
    });

    return blobName;
  }

  /**
   * Sanitiza valores para metadados da Azure (ASCII apenas)
   */
  private sanitizeMetadata(value: string): string {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\x20-\x7E]/g, '_') // Mantém apenas ASCII imprimível (espaço até tilde)
      .trim();
  }

  /**
   * Baixa um blob diretamente via SDK utilizando a URL ou o caminho.
   * Útil para evitar problemas de CORS/Auth em containers privados.
   */
  async downloadBlob(urlOrPath: string): Promise<Buffer> {
    const blobPath = this.resolveBlobPath(urlOrPath);

    try {
      return await this.doDownloadBuffer(
        this.getContainerClientOrThrow().getBlobClient(blobPath),
      );
    } catch (error) {
      if (this.isBlobNotFound(error) && this.legacyContainerClient) {
        this.logger.warn(
          `[AZURE] Blob não encontrado no storage primário, tentando legado: ${blobPath}`,
        );
        return await this.doDownloadBuffer(
          this.legacyContainerClient.getBlobClient(blobPath),
        );
      }
      this.logger.error(`Erro ao baixar blob: ${urlOrPath}`, error);
      throw error;
    }
  }

  private async doDownloadBuffer(
    blobClient: ReturnType<ContainerClient['getBlobClient']>,
  ): Promise<Buffer> {
    const downloadResponse = await blobClient.download();

    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const readableStream =
        downloadResponse.readableStreamBody as NodeJS.ReadableStream;
      readableStream.on('data', (data) =>
        chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data)),
      );
      readableStream.on('end', () => resolve(Buffer.concat(chunks)));
      readableStream.on('error', reject);
    });
  }

  async deleteBlob(containerName: string, blobName: string): Promise<void> {
    const client = this.blobServiceClient;
    if (!client) throw new Error('BlobServiceClient not initialized');
    try {
      const containerClient = client.getContainerClient(containerName);
      const blobClient = containerClient.getBlockBlobClient(blobName);
      await blobClient.deleteIfExists();
      this.logger.debug(`Blob deleted: ${containerName}/${blobName}`);
    } catch (error) {
      this.logger.warn(
        `Erro ao deletar blob ${containerName}/${blobName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Retorna o stream legível do blob sem bufferizar em RAM.
   * Usado pelo proxy para streaming direto na resposta HTTP.
   */
  async downloadBlobStream(urlOrPath: string): Promise<{ stream: NodeJS.ReadableStream; contentLength: number; contentType: string }> {
    const blobPath = this.resolveBlobPath(urlOrPath);

    try {
      return await this.doDownloadStream(
        this.getContainerClientOrThrow().getBlobClient(blobPath),
      );
    } catch (err) {
      if (this.isBlobNotFound(err) && this.legacyContainerClient) {
        this.logger.warn(
          `[AZURE] Blob não encontrado no storage primário, tentando legado: ${blobPath}`,
        );
        return await this.doDownloadStream(
          this.legacyContainerClient.getBlobClient(blobPath),
        );
      }
      throw err;
    }
  }

  private async doDownloadStream(
    blobClient: ReturnType<ContainerClient['getBlobClient']>,
  ): Promise<{ stream: NodeJS.ReadableStream; contentLength: number; contentType: string }> {
    const downloadResponse = await blobClient.download();

    if (!downloadResponse.readableStreamBody) {
      throw new Error('Stream não disponível para este blob');
    }

    return {
      stream: downloadResponse.readableStreamBody as NodeJS.ReadableStream,
      contentLength: downloadResponse.contentLength ?? 0,
      contentType: downloadResponse.contentType || 'application/octet-stream',
    };
  }

  private isBlobNotFound(err: any): boolean {
    return (
      err?.statusCode === 404 ||
      err?.code === 'BlobNotFound' ||
      err?.statusCode === 403
    );
  }

  // ============================================================
  // =================       FILAS AZURE       ==================
  // ============================================================

  async filaResultadosExamesProcessar(payload: resultadosExamesQueue) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueResultadosClient,
      this.queueResultadosExames,
    );
    const response = await queueClient.sendMessage(JSON.stringify(payload));
    this.logger.log(
      '[QUEUE] resultado exame enfileirado | queue=' +
        this.queueResultadosExames +
        ' | messageId=' +
        response.messageId +
        ' | grupo=' +
        payload.grupo +
        ' | prontuario=' +
        (payload.funcionario?.CODIGOPRONTUARIO || 'n/d'),
    );
    return response;
  }

  async filaEnvioDeEmail(payload: EmailType) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueEmailClient,
      this.queueEmail,
    );

    const raw = JSON.stringify(payload);
    const encodedSize = Buffer.byteLength(Buffer.from(raw, 'utf8').toString('base64'));
    const limit = 65536; // 64KB Azure Queue Storage limit

    if (encodedSize > limit) {
      this.logger.error(
        `[QUEUE] email payload excede limite: ${encodedSize} bytes > ${limit} bytes. E-mail NÃO enfileirado.`,
      );
      throw new Error(
        `Email payload exceeds Azure Queue 64KB limit (${encodedSize} bytes). Reduce chunk size.`,
      );
    }

    if (encodedSize > limit * 0.9) {
      this.logger.warn(
        `[QUEUE] email payload próximo do limite: ${encodedSize} bytes (${(encodedSize / limit * 100).toFixed(0)}% de 64KB)`,
      );
    }

    await queueClient.sendMessage(raw);
    this.logger.log(`[QUEUE] email enfileirado (${(encodedSize / 1024).toFixed(0)} KB)`);
  }

  async filaUploadSocged(payload: UploadSocged) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueSocgedClient,
      this.queueSocged,
    );
    await queueClient.sendMessage(JSON.stringify(payload));
    this.logger.log(`[QUEUE] SOCGED enfileirado`);
  }

  async filaUploadGoogleDrive(payload: UploadGoogleDrive) {
    if (!this.googleDriveQueueEnabled) {
      this.logger.log(
        `[QUEUE] GOOGLE_DRIVE desabilitado temporariamente. Pulando enfileiramento para schedulingId=${payload.schedulingId} documentType=${payload.documentType}`,
      );
      return;
    }

    const queueClient = this.getQueueClientOrThrow(
      this.queueGoogleDriveUploadClient,
      this.queueGoogleDriveUpload,
    );
    await queueClient.sendMessage(JSON.stringify(payload));
    this.logger.log(
      `[QUEUE] GOOGLE_DRIVE enfileirado para schedulingId=${payload.schedulingId} documentType=${payload.documentType}`,
    );
  }

  async filaAsoProcessing(payload: AsoProcessingMessage) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueAsoProcessingClient,
      this.queueAsoProcessing,
    );
    await queueClient.sendMessage(JSON.stringify(payload));
    this.logger.log(
      `[QUEUE] ASO processing enfileirado para schedulingId=${payload.schedulingId}`,
    );
  }

  async filaAsoProcessingFalhas(payload: AsoProcessingMessage) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueAsoProcessingFalhasClient,
      this.queueAsoProcessingFalhas,
    );
    await queueClient.sendMessage(JSON.stringify(payload));
    this.logger.log(
      `[QUEUE] ASO processing FALHAS enfileirado para schedulingId=${payload.schedulingId}`,
    );
  }

  async filaAsoEnriquecimento(payload: AsoEnriquecimentoMessage) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueAsoEnriquecimentoClient,
      this.queueAsoEnriquecimento,
    );
    await queueClient.sendMessage(
      JSON.stringify({
        ...payload,
        createdAt: new Date().toISOString(),
      }),
    );
    this.logger.log(
      `[QUEUE] ASO enriquecimento enfileirado para schedulingId=${payload.schedulingId}`,
    );
  }

  async filaResultadoExameSoc(payload: ResultadoExameSocMessage) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueResultadoExameSocClient,
      this.queueResultadoExameSoc,
    );
    const response = await queueClient.sendMessage(JSON.stringify(payload));
    this.logger.log(
      `[QUEUE] RESULTADO_EXAME_SOC enfileirado | queue=${this.queueResultadoExameSoc} | messageId=${response.messageId} | schedulingId=${payload.schedulingId} | grupo=${payload.grupo} | examIndex=${payload.examIndex}`,
    );
    return response;
  }

  async filaCustomerEmailCampaignOrchestrate(payload: CustomerEmailCampaignOrchestrateMessage) {
    const queueClient = this.getQueueClientOrThrow(
      this.queueCustomerEmailCampaignClient,
      this.queueCustomerEmailCampaign,
    );
    const response = await queueClient.sendMessage(JSON.stringify(payload));
    this.logger.log(
      `[QUEUE] CUSTOMER_EMAIL_CAMPAIGN enfileirado | queue=${this.queueCustomerEmailCampaign} | messageId=${response.messageId} | campaignId=${payload.campaignId}`,
    );
    return response;
  }

  async enqueuePendingSignaturesForWorker(
    payloads: resultadosExamesQueue[],
  ): Promise<void> {
    const queueClient = this.getQueueClientOrThrow(
      this.queueExameEnriquecimentoClient,
      this.queueExameEnriquecimento,
    );
    for (const payload of payloads) {
      const response = await queueClient.sendMessage(JSON.stringify(payload));
      this.logger.log(
        `[QUEUE] EXAME_ENRIQUECIMENTO enfileirado para worker | messageId=${response.messageId} | schedulingId=${payload.schedulingId} | grupo=${payload.grupo}`,
      );
    }
  }

  // ============================================================
  // ===================     PDF CONVERSION     =================
  // ============================================================

  private async convertImageToPdf(imageBuffer: Buffer, mimeType: string) {
    const pdfDoc = await PDFDocument.create();

    const image =
      mimeType === 'image/jpeg'
        ? await pdfDoc.embedJpg(imageBuffer)
        : await pdfDoc.embedPng(imageBuffer);

    const page = pdfDoc.addPage([image.width, image.height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // ============================================================
  // ============  GERAÇÃO CONFIGURÁVEL DE SAS URL  =============
  // ============================================================
  /**
   * Gera uma SAS URL somente leitura para um blob específico.
   * @param blobPath Caminho do arquivo no container (ex: "funcionarios/2025/XYZ/arquivo.pdf")
   * @param expiresInMinutes Tempo de expiração em minutos (default: 60)
   * @param expiresAt Opcional: data específica de expiração
   */
  private resolveBlobPath(urlOrPath: string): string {
    const raw = String(urlOrPath || '').trim();
    if (!raw) return '';

    if (raw.includes(this.containerName)) {
      const parts = raw.split(`${this.containerName}/`);
      if (parts.length > 1) {
        return decodeURIComponent(parts[1].split('?')[0]);
      }
    }

    return raw.split('?')[0];
  }

  generateSasUrl(
    blobPath: string,
    expiresInMinutes = 60,
    expiresAt?: Date,
  ): string {
    const sharedKeyCredential = this.getSharedKeyCredentialOrThrow();
    const containerClient = this.getContainerClientOrThrow();

    // Data de expiração
    const expiresOn = expiresAt
      ? expiresAt
      : new Date(Date.now() + expiresInMinutes * 60_000);

    // Gera SAS com permissão SOMENTE LEITURA
    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'), // 🔒 read-only
        expiresOn,
      },
      sharedKeyCredential,
    ).toString();

    // Cria o client correto
    const blobClient = containerClient.getBlobClient(blobPath);

    // Retorna a URL com SAS
    return `${blobClient.url}?${sasParams}`;
  }

  private generateSasUrlWithCredential(
    blobPath: string,
    credential: StorageSharedKeyCredential,
    blobServiceClient: BlobServiceClient,
    expiresInMinutes = 60,
    expiresAt?: Date,
  ): string {
    const expiresOn = expiresAt
      ? expiresAt
      : new Date(Date.now() + expiresInMinutes * 60_000);

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
      },
      credential,
    ).toString();

    const containerClient = blobServiceClient.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlobClient(blobPath);

    return `${blobClient.url}?${sasParams}`;
  }

  generateSasUrlFromUrl(
    urlOrPath: string,
    expiresInMinutes = 60,
    expiresAt?: Date,
  ): string {
    const blobPath = this.resolveBlobPath(urlOrPath);
    if (!blobPath) {
      throw new Error('URL/path do blob vazio para geração de SAS.');
    }

    if (
      this.legacySharedKeyCredential &&
      typeof urlOrPath === 'string' &&
      urlOrPath.includes('cmsodocuments')
    ) {
      return this.generateSasUrlWithCredential(
        blobPath,
        this.legacySharedKeyCredential,
        this.legacyBlobServiceClient!,
        expiresInMinutes,
        expiresAt,
      );
    }

    return this.generateSasUrl(blobPath, expiresInMinutes, expiresAt);
  }

  // ============================================================
  // ============  CONSULTA DE FILA ASO PROCESSING  =============
  // ============================================================
  /**
   * Consulta mensagens pendentes na fila aso-processing sem removê-las.
   * Útil para dashboard de acompanhamento de liberação de ASOs.
   * @param maxMessages Número máximo de mensagens a consultar (padrão: 100)
   * @returns Array de mensagens AsoProcessingMessage
   */
  async peekAsoProcessingMessages(
    maxMessages: number = 100,
  ): Promise<AsoProcessingMessage[]> {
    if (!this.enabled || !this.queueAsoProcessingClient) {
      this.logger.warn(
        '[AZURE] Serviço não habilitado. Não foi possível consultar fila aso-processing.',
      );
      return [];
    }

    try {
      const response =
        await this.queueAsoProcessingClient.peekMessages({ numberOfMessages: maxMessages });

      const messages = response.peekedMessageItems
        .map((msg) => {
          try {
            return JSON.parse(msg.messageText) as AsoProcessingMessage;
          } catch (parseError) {
            this.logger.warn(
              `[AZURE] Falha ao parsear mensagem da fila: ${parseError.message}`,
            );
            return null;
          }
        })
        .filter((msg): msg is AsoProcessingMessage => msg !== null);

      this.logger.log(
        `[AZURE] Consultadas ${messages.length} mensagens da fila aso-processing (solicitadas: ${maxMessages})`,
      );

      return messages;
    } catch (error) {
      this.logger.error(
        `[AZURE] Erro ao consultar fila aso-processing: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Retorna estatísticas da fila aso-processing (aproximação de mensagens).
   * @returns Objeto com approximateMessagesCount ou null se indisponível
   */
  async getAsoProcessingQueueStats(): Promise<{
    approximateMessagesCount: number;
  } | null> {
    if (!this.enabled || !this.queueAsoProcessingClient) {
      return null;
    }

    try {
      const properties = await this.queueAsoProcessingClient.getProperties();
      return {
        approximateMessagesCount: properties.approximateMessagesCount || 0,
      };
    } catch (error) {
      this.logger.error(
        `[AZURE] Erro ao obter estatísticas da fila: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Retorna estatísticas de todas as filas (aproximação de mensagens).
   * @returns Array com nome e contagem aproximada de mensagens de cada fila
   */
  async getAllQueueStats(): Promise<
    { name: string; approximateMessagesCount: number }[]
  > {
    if (!this.enabled) {
      return [];
    }

    const queues: { name: string; client: QueueClient | null }[] = [
      { name: this.queueResultadosExames, client: this.queueResultadosClient },
      { name: this.queueEmail, client: this.queueEmailClient },
      { name: this.queueSocged, client: this.queueSocgedClient },
      { name: this.queueAsoProcessing, client: this.queueAsoProcessingClient },
      {
        name: this.queueAsoEnriquecimento,
        client: this.queueAsoEnriquecimentoClient,
      },
      {
        name: this.queueExameEnriquecimento,
        client: this.queueExameEnriquecimentoClient,
      },
      {
        name: this.queueGoogleDriveUpload,
        client: this.queueGoogleDriveUploadClient,
      },
      {
        name: this.queueResultadoExameSoc,
        client: this.queueResultadoExameSocClient,
      },
      // Dead Letter Queues
      { name: this.queueEmailFalhas, client: this.queueEmailFalhasClient },
      {
        name: this.queueAsoEnriquecimentoFalhas,
        client: this.queueAsoEnriquecimentoFalhasClient,
      },
      {
        name: this.queueExameEnriquecimentoFalhas,
        client: this.queueExameEnriquecimentoFalhasClient,
      },
      {
        name: this.queueAsoProcessingFalhas,
        client: this.queueAsoProcessingFalhasClient,
      },
    ];

    const results = await Promise.allSettled(
      queues.map(async (queue) => {
        if (!queue.client) {
          return { name: queue.name, approximateMessagesCount: 0 };
        }
        try {
          const properties = await queue.client.getProperties();
          return {
            name: queue.name,
            approximateMessagesCount: properties.approximateMessagesCount || 0,
          };
        } catch {
          return { name: queue.name, approximateMessagesCount: 0 };
        }
      }),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return { name: queues[index].name, approximateMessagesCount: 0 };
    });
  }

  /**
   * Retorna o QueueClient correspondente ao nome da fila.
   */
  private getQueueClientByName(queueName: string): QueueClient | null {
    const map: Record<string, QueueClient | null> = {
      [this.queueResultadosExames]: this.queueResultadosClient,
      [this.queueEmail]: this.queueEmailClient,
      [this.queueSocged]: this.queueSocgedClient,
      [this.queueAsoProcessing]: this.queueAsoProcessingClient,
      [this.queueAsoEnriquecimento]: this.queueAsoEnriquecimentoClient,
      [this.queueExameEnriquecimento]: this.queueExameEnriquecimentoClient,
      [this.queueGoogleDriveUpload]: this.queueGoogleDriveUploadClient,
      [this.queueResultadoExameSoc]: this.queueResultadoExameSocClient,
      // Dead Letter Queues
      [this.queueEmailFalhas]: this.queueEmailFalhasClient,
      [this.queueAsoEnriquecimentoFalhas]: this.queueAsoEnriquecimentoFalhasClient,
      [this.queueExameEnriquecimentoFalhas]: this.queueExameEnriquecimentoFalhasClient,
      [this.queueAsoProcessingFalhas]: this.queueAsoProcessingFalhasClient,
    };
    return map[queueName] || null;
  }

  /**
   * Retorna a lista de nomes de filas disponíveis.
   */
  getAvailableQueueNames(): string[] {
    return [
      this.queueResultadosExames,
      this.queueEmail,
      this.queueSocged,
      this.queueAsoProcessing,
      this.queueAsoEnriquecimento,
      this.queueExameEnriquecimento,
      this.queueGoogleDriveUpload,
      this.queueResultadoExameSoc,
      // Dead Letter Queues
      this.queueEmailFalhas,
      this.queueAsoEnriquecimentoFalhas,
      this.queueExameEnriquecimentoFalhas,
      this.queueAsoProcessingFalhas,
    ];
  }

  /**
   * Faz peek (leitura não-destrutiva) nas mensagens de uma fila específica.
   * @param queueName Nome da fila
   * @param maxMessages Número máximo de mensagens a retornar (padrão: 10)
   * @returns Array de mensagens com metadados
   */
  async peekQueueMessages(
    queueName: string,
    maxMessages: number = 10,
  ): Promise<
    {
      messageId: string;
      insertedOn: Date;
      expiresOn: Date;
      dequeueCount: number;
      messageText: string;
    }[]
  > {
    if (!this.enabled) {
      return [];
    }

    const client = this.getQueueClientByName(queueName);
    this.logger.log(
      `[AZURE] Tentando peek na fila: '${queueName}'. Client encontrado: ${!!client}.`,
    );
    if (!client) {
      this.logger.warn(`[AZURE] Fila '${queueName}' não encontrada para peek.`);
      return [];
    }

    try {
      const response = await client.peekMessages({
        numberOfMessages: maxMessages,
      });

      this.logger.log(
        `[AZURE] Peek na fila '${queueName}' retornou ${response.peekedMessageItems.length} mensagens.`,
      );

      return response.peekedMessageItems.map((msg) => ({
        messageId: msg.messageId,
        insertedOn: msg.insertedOn,
        expiresOn: msg.expiresOn,
        dequeueCount: msg.dequeueCount,
        messageText: msg.messageText,
      }));
    } catch (error) {
      this.logger.error(
        `[AZURE] Erro ao fazer peek na fila '${queueName}': ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Recebe uma mensagem de uma fila fonte (DLQ) e a reenfileira na fila de destino.
   * Útil para correção manual de mensagens que falharam.
   * @param sourceQueueName Nome da fila de origem (DLQ)
   * @param targetQueueName Nome da fila de destino (ativa)
   * @param editedPayload Payload editado para enviar à fila de destino (null = usar original)
   * @returns true se a mensagem foi reenfileirada com sucesso
   */
  async requeueMessage(
    sourceQueueName: string,
    targetQueueName: string,
    editedPayload: Record<string, unknown> | null,
  ): Promise<boolean> {
    const sourceClient = this.getQueueClientByName(sourceQueueName);
    const targetClient = this.getQueueClientByName(targetQueueName);

    if (!sourceClient) {
      this.logger.warn(
        `[AZURE] Fila fonte '${sourceQueueName}' não encontrada para reenfileiramento.`,
      );
      return false;
    }

    if (!targetClient) {
      this.logger.warn(
        `[AZURE] Fila destino '${targetQueueName}' não encontrada para reenfileiramento.`,
      );
      return false;
    }

    try {
      // 1. Recebe (destructive read) a primeira mensagem da fila fonte
      const receiveResponse = await sourceClient.receiveMessages({
        numberOfMessages: 1,
        visibilityTimeout: 30,
      });

      if (receiveResponse.receivedMessageItems.length === 0) {
        this.logger.warn(
          `[AZURE] Nenhuma mensagem encontrada na fila '${sourceQueueName}' para reenfileirar.`,
        );
        return false;
      }

      const receivedMsg = receiveResponse.receivedMessageItems[0];
      const { messageId, popReceipt, messageText } = receivedMsg;

      // 2. Determina o payload a enviar
      let payloadToSend: string;
      if (editedPayload !== null) {
        payloadToSend = JSON.stringify(editedPayload);
      } else {
        // Usa o payload original
        payloadToSend = messageText;
      }

      // 3. Envia para a fila de destino
      await targetClient.sendMessage(payloadToSend);

      // 4. Deleta a mensagem da fila fonte
      await sourceClient.deleteMessage(messageId, popReceipt);

      this.logger.log(
        `[AZURE] Mensagem reenfileirada com sucesso: ${messageId} de '${sourceQueueName}' para '${targetQueueName}'`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `[AZURE] Erro ao reenfileirar mensagem de '${sourceQueueName}' para '${targetQueueName}': ${error.message}`,
      );
      return false;
    }
  }
}
