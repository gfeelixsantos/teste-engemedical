import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { MongoService } from 'src/mongo/mongo.service';
import { AzureService } from 'src/azure/azure.service';
import { SocCompanyService } from 'src/soc/services/soc-company.service';
import { EmpresaDocumento } from 'src/mongo/types/empresa-documento';
import { EmailType, TemplateNames } from 'src/azure/types/azure.types';
import { ObjectId } from 'mongodb';

@Injectable()
export class EmpresaDocumentosService {
  private readonly logger = new Logger(EmpresaDocumentosService.name);

  constructor(
    @Inject(forwardRef(() => MongoService))
    private readonly mongoService: MongoService,
    @Inject(forwardRef(() => AzureService))
    private readonly azureService: AzureService,
    @Inject(forwardRef(() => SocCompanyService))
    private readonly socCompanyService: SocCompanyService,
  ) {}

  async uploadDocument(
    empresaId: string,
    file: Express.Multer.File,
    metadata: {
      categoria: 'FATURAMENTO' | 'LOGO';
      tipoDocumento: string;
      dataReferencia: string;
      observacoes?: string;
      comunicarEmail: boolean;
      contatosNotificados?: string[];
    },
    userId: string,
  ): Promise<EmpresaDocumento> {
    if (!this.mongoService.empresaDocumentosCollection) {
      throw new Error('Coleção de documentos da empresa não inicializada.');
    }

    const { categoria, tipoDocumento, dataReferencia, observacoes, comunicarEmail, contatosNotificados } = metadata;
    const ano = dataReferencia ? dataReferencia.split('/')[1] || new Date().getFullYear().toString() : new Date().getFullYear().toString();
    const mes = dataReferencia ? dataReferencia.split('/')[0] : '';

    let nomeEmpresa = empresaId;
    let cnpjEmpresa = '';
    try {
      const empresaData = await this.mongoService.findEmpresaByCode(empresaId);
      if (empresaData?.RAZAOSOCIAL) {
        nomeEmpresa = empresaData.RAZAOSOCIAL;
      }
      if (empresaData?.CNPJ) {
        cnpjEmpresa = empresaData.CNPJ;
      }

      // Fallback: buscar no cache SOC se nao encontrou no MongoDB
      if (nomeEmpresa === empresaId) {
        const socEmpresa = this.socCompanyService.getCompanyByCode(empresaId);
        if (socEmpresa?.RAZAOSOCIAL) {
          nomeEmpresa = socEmpresa.RAZAOSOCIAL;
        }
        if (socEmpresa?.CNPJ && !cnpjEmpresa) {
          cnpjEmpresa = socEmpresa.CNPJ;
        }
      }
    } catch {
      this.logger.warn(`Nao foi possivel buscar dados da empresa ${empresaId}`);
    }

    const nomeAbreviado = nomeEmpresa.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const safeFileName = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    let blobName = `empresas/${empresaId}/${categoria.toLowerCase()}/${ano}/${nomeAbreviado}_${mes}_${ano}_${safeFileName}`;
    if (categoria === 'LOGO') {
      blobName = `empresas/${empresaId}/logo/logo_${safeFileName}`;
    }
 
    // Upload to Azure
    let blobUrl: string;
    try {
      if (categoria === 'LOGO') {
        const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';
        blobUrl = await this.azureService.uploadPublic(publicContainer, blobName, file.buffer, file.mimetype);
      } else {
        blobUrl = await this.azureService.upload('documents', blobName, file.buffer, file.mimetype);
      }
    } catch (error) {
      this.logger.error(`Erro ao fazer upload para Azure: ${error.message}`);
      throw new BadRequestException('Erro ao salvar o arquivo no Azure Storage');
    }

    const documentRecord: EmpresaDocumento = {
      EMPRESAID: empresaId,
      CNPJ: cnpjEmpresa || undefined,
      CATEGORIA: categoria,
      TIPODOCUMENTO: tipoDocumento,
      NOMEARQUIVOORIGINAL: file.originalname,
      BLOBURL: blobUrl,
      DATAREFERENCIA: dataReferencia,
      OBSERVACOES: observacoes,
      COMUNICAREMAIL: String(comunicarEmail) === 'true',
      CONTATOSNOTIFICADOS: typeof contatosNotificados === 'string' ? JSON.parse(contatosNotificados) : (contatosNotificados || []),
      CRIADOPOR: userId,
      CRIADOEM: new Date(),
    };

    const result = await this.mongoService.empresaDocumentosCollection.insertOne(documentRecord);
    documentRecord._id = result.insertedId;

    if (documentRecord.COMUNICAREMAIL && documentRecord.CONTATOSNOTIFICADOS && documentRecord.CONTATOSNOTIFICADOS.length > 0) {
      try {
        const sasUrl = this.azureService.generateSasUrl(
          blobName,
          30 * 24 * 60,
        );

        const emailPayload: EmailType = {
          to: documentRecord.CONTATOSNOTIFICADOS,
          bcc: String(process.env.EMPRESA_DOCS_EMAIL_BCC || 'tecnologia@cmsocupacional.com.br').trim(),
          replyTo: 'financeiro@cmsocupacional.com.br,draandrea@cmsocupacional.com.br',
          from: 'CMSO Faturamento <noreply@cmsocupacional.com.br>',
          subject: `CMSO - Relatorio de Faturamento - ${nomeEmpresa} - ${dataReferencia}`,
          templatename: TemplateNames.RELATORIO_FATURAMENTO,
          attachment: [],
          data: {
            faturamentoInfo: {
              nomeEmpresa,
              cnpj: cnpjEmpresa,
              empresaId,
              dataReferencia,
              tipoDocumento,
              arquivoUrl: sasUrl,
              nomeArquivo: file.originalname,
              observacoes,
            },
          },
        };

        await this.azureService.filaEnvioDeEmail(emailPayload);
        this.logger.log(`E-mail enfileirado para: ${documentRecord.CONTATOSNOTIFICADOS.join(', ')}`);
      } catch (error) {
        this.logger.error(`Erro ao enfileirar e-mail: ${error.message}`);
      }
    }

    return documentRecord;
  }

  async listDocuments(empresaId: string, categoria?: string): Promise<EmpresaDocumento[]> {
    if (!this.mongoService.empresaDocumentosCollection) {
      throw new Error('Coleção de documentos da empresa não inicializada.');
    }

    const query: any = { EMPRESAID: empresaId };
    if (categoria) {
      query.CATEGORIA = categoria;
    }

    return await this.mongoService.empresaDocumentosCollection
      .find(query)
      .sort({ CRIADOEM: -1 })
      .toArray() as unknown as EmpresaDocumento[];
  }

  async updateDocumentNotification(
    empresaId: string,
    documentoId: string,
    file: Express.Multer.File | undefined,
    metadata: {
      comunicarEmail: boolean;
      contatosNotificados?: string[];
    },
  ): Promise<EmpresaDocumento> {
    if (!this.mongoService.empresaDocumentosCollection) {
      throw new Error('Coleção de documentos da empresa não inicializada.');
    }

    const doc = await this.mongoService.empresaDocumentosCollection.findOne({ _id: new ObjectId(documentoId), EMPRESAID: empresaId }) as unknown as EmpresaDocumento;
    if (!doc) {
      throw new BadRequestException('Documento não encontrado ou não pertence a esta empresa');
    }

    const { comunicarEmail, contatosNotificados } = metadata;
    const updateFields: any = {
      COMUNICAREMAIL: String(comunicarEmail) === 'true',
      CONTATOSNOTIFICADOS: typeof contatosNotificados === 'string' ? JSON.parse(contatosNotificados) : (contatosNotificados || doc.CONTATOSNOTIFICADOS || []),
    };

    // If a new file was uploaded, replace the old blob
    if (file) {
      const now = new Date();
      const mes = (now.getMonth() + 1).toString().padStart(2, '0');
      const ano = now.getFullYear().toString();
      const dataReferencia = doc.DATAREFERENCIA || `${mes}/${ano}`;

      let nomeEmpresa = empresaId;
      try {
        const empresaData = await this.mongoService.findEmpresaByCode(empresaId);
        if (empresaData?.RAZAOSOCIAL) {
          nomeEmpresa = empresaData.RAZAOSOCIAL;
        }
      } catch {
        this.logger.warn(`Nao foi possivel buscar dados da empresa ${empresaId}`);
      }

      const nomeAbreviado = nomeEmpresa.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const safeFileName = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const blobName = `empresas/${empresaId}/${doc.CATEGORIA.toLowerCase()}/${ano}/${nomeAbreviado}_${mes}_${ano}_${safeFileName}`;

      // Delete old blob
      try {
        const oldUrlParts = doc.BLOBURL.split('/documents/');
        if (oldUrlParts.length > 1) {
          await this.azureService.deleteBlob('documents', oldUrlParts[1]);
        }
      } catch (error) {
        this.logger.warn(`Erro ao excluir blob antigo: ${error.message}`);
      }

      // Upload new blob
      let blobUrl: string;
      try {
        blobUrl = await this.azureService.upload('documents', blobName, file.buffer, file.mimetype);
      } catch (error) {
        this.logger.error(`Erro ao fazer upload para Azure: ${error.message}`);
        throw new BadRequestException('Erro ao salvar o arquivo no Azure Storage');
      }

      updateFields.BLOBURL = blobUrl;
      updateFields.NOMEARQUIVOORIGINAL = file.originalname;
    }

    await this.mongoService.empresaDocumentosCollection.updateOne(
      { _id: new ObjectId(documentoId) },
      { $set: updateFields },
    );

    const updatedDoc = await this.mongoService.empresaDocumentosCollection.findOne({ _id: new ObjectId(documentoId) }) as unknown as EmpresaDocumento;

    // Re-dispatch email if requested
    if (updatedDoc.COMUNICAREMAIL && updatedDoc.CONTATOSNOTIFICADOS && updatedDoc.CONTATOSNOTIFICADOS.length > 0) {
      try {
        // Reconstruct blob name from URL
        const urlParts = updatedDoc.BLOBURL.split('/documents/');
        const blobName = urlParts.length > 1 ? urlParts[1] : updatedDoc.BLOBURL;
        const sasUrl = this.azureService.generateSasUrl(blobName, 30 * 24 * 60);

        let nomeEmpresa = empresaId;
        let cnpjEmpresa = '';
        try {
          const empresaData = await this.mongoService.findEmpresaByCode(empresaId);
          if (empresaData?.RAZAOSOCIAL) nomeEmpresa = empresaData.RAZAOSOCIAL;
          if (empresaData?.CNPJ) cnpjEmpresa = empresaData.CNPJ;
        } catch {
          this.logger.warn(`Nao foi possivel buscar dados da empresa ${empresaId}`);
        }

        const emailPayload: EmailType = {
          to: updatedDoc.CONTATOSNOTIFICADOS,
          bcc: String(process.env.EMPRESA_DOCS_EMAIL_BCC || 'tecnologia@cmsocupacional.com.br').trim(),
          replyTo: 'financeiro@cmsocupacional.com.br,draandrea@cmsocupacional.com.br',
          from: 'CMSO Faturamento <noreply@cmsocupacional.com.br>',
          subject: `CMSO - Relatorio de Faturamento - ${nomeEmpresa} - ${updatedDoc.DATAREFERENCIA || ''}`,
          templatename: TemplateNames.RELATORIO_FATURAMENTO,
          attachment: [],
          data: {
            faturamentoInfo: {
              nomeEmpresa,
              cnpj: cnpjEmpresa,
              empresaId,
              dataReferencia: updatedDoc.DATAREFERENCIA || '',
              tipoDocumento: updatedDoc.TIPODOCUMENTO || '',
              arquivoUrl: sasUrl,
              nomeArquivo: updatedDoc.NOMEARQUIVOORIGINAL || '',
              observacoes: updatedDoc.OBSERVACOES || '',
            },
          },
        };

        await this.azureService.filaEnvioDeEmail(emailPayload);
        this.logger.log(`E-mail re-enviado para: ${updatedDoc.CONTATOSNOTIFICADOS.join(', ')}`);
      } catch (error) {
        this.logger.error(`Erro ao re-enfileirar e-mail: ${error.message}`);
      }
    }

    return updatedDoc;
  }

  async deleteDocument(empresaId: string, documentoId: string): Promise<void> {
    if (!this.mongoService.empresaDocumentosCollection) {
      throw new Error('Coleção de documentos da empresa não inicializada.');
    }

    const doc = await this.mongoService.empresaDocumentosCollection.findOne({ _id: new ObjectId(documentoId), EMPRESAID: empresaId }) as unknown as EmpresaDocumento;
    if (!doc) {
      throw new BadRequestException('Documento não encontrado ou não pertence a esta empresa');
    }

    // Attempt to delete from Azure Blob Storage
    try {
      const urlParts = doc.BLOBURL.split('/documents/');
      if (urlParts.length > 1) {
        const blobName = urlParts[1];
        await this.azureService.deleteBlob('documents', blobName);
      }
    } catch (error) {
      this.logger.warn(`Erro ao excluir blob do Azure: ${error.message}`);
    }

    await this.mongoService.empresaDocumentosCollection.deleteOne({ _id: new ObjectId(documentoId) });
  }
}
