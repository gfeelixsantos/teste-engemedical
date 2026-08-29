/**
 * =============================================================================
 * Azure Blob Storage Service - Serviço de Armazenamento de Arquivos
 * =============================================================================
 * 
 * Este serviço gerencia o armazenamento de PDFs e outros documentos no
 * Azure Blob Storage.
 * 
 * Container: 'documents'
 * 
 * Estrutura de diretórios virtual:
 * - relatorio/validacao/aso-{schedulingId}.pdf  <- ASOs gerados
 * - relatorio/assinatura/                        <- ASOs assinados digitalmente
 * - temporario/                                  <- Arquivos temporários
 * 
 * Utilização:
 * 1. Upload de PDFs gerados pelo Puppeteer
 * 2. Download de PDFs para processamento adicional
 * 3. Armazenamento de arquivos temporários
 * 
 * Referência: https://docs.microsoft.com/en-us/azure/storage/blobs/
 * =============================================================================
 */

import { BlobServiceClient } from '@azure/storage-blob';

/**
 * =============================================================================
 * AzureBlobService
 * =============================================================================
 * Gerencia as operações com Azure Blob Storage
 */
class AzureBlobService {
  /**
   * Construtor
   * @param {string} connectionString - String de conexão do Azure Storage
   */
  constructor(connectionString) {
    if (!connectionString) {
      throw new Error('AZURE_CONNECTION_STRING_BLOB não configurado');
    }
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerName = 'documents';
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  /**
   * Inicializa o container - cria se não existir
   * Chamado uma vez na inicialização do worker
   */
  async initialize() {
    await this.containerClient.createIfNotExists();
    console.log('[BLOB] Container disponível:', this.containerName);
  }

  /**
   * Faz upload de um arquivo local para o Blob Storage
   * 
   * @param {string} fileName - Nome do arquivo no blob (inclui caminho virtual)
   * @param {string} filePath - Caminho local do arquivo
   * @returns {Promise<string>} URL pública do arquivo上传
   */
  async uploadFile(fileName, filePath) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(filePath);
      
       await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
         blobHTTPHeaders: { blobContentType: 'application/pdf' }
       });
      
      const url = blockBlobClient.url;
      console.log(`[BLOB] Upload concluído: ${fileName}`);
      
      return url;
    } catch (error) {
      const errorMessage = error.message || String(error);
      console.error(`[BLOB] Erro ao fazer upload: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Faz upload de um buffer (memória) para o Blob Storage
   * Útil para arquivos gerados dinamicamente
   * 
   * @param {string} fileName - Nome do arquivo no blob
   * @param {Buffer} buffer - Buffer com os dados do arquivo
   * @returns {Promise<string>} URL pública do arquivo
   */
  async uploadBuffer(fileName, buffer) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      
       await blockBlobClient.upload(buffer, buffer.length, {
         blobHTTPHeaders: { blobContentType: 'application/pdf' }
       });
      
      const url = blockBlobClient.url;
      console.log(`[BLOB] Upload concluído (buffer): ${fileName}`);
      
      return url;
    } catch (error) {
      const errorMessage = error.message || String(error);
      console.error(`[BLOB] Erro ao fazer upload: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Faz download de um arquivo do Blob Storage para o sistema local
   * 
   * @param {string} fileName - Nome do arquivo no blob
   * @param {string} downloadPath - Caminho local para salvar
   * @returns {Promise<string>} Caminho do arquivo baixado
   */
  async downloadFile(fileName, downloadPath) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      
      const fs = require('fs');
      const downloadBlockBlobResponse = await blockBlobClient.downloadToFile(downloadPath);
      
      console.log(`[BLOB] Download concluído: ${fileName}`);
      
      return downloadPath;
    } catch (error) {
      const errorMessage = error.message || String(error);
      console.error(`[BLOB] Erro ao fazer download: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gera URL pública para um arquivo no blob
   * 
   * @param {string} fileName - Nome do arquivo no blob
   * @returns {string} URL pública do arquivo
   */
  getFileUrl(fileName) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    return blockBlobClient.url;
  }
}

export { AzureBlobService };
