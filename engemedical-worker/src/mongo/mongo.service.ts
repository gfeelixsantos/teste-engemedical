import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  MongoClient,
  Db,
  Collection,
  ServerApiVersion,
  ObjectId,
} from 'mongodb';

import { ConfigService } from '@nestjs/config';
import { MedicalOpinionData, SchedulingDocument } from './types/scheduling';
import { AtendimentoStatus, ExamStatus } from './enum/scheduling.enum';
import { getExamesList } from 'src/exames/exames.provider';
import { CODIGOS_TIPO_SOCGED, UploadSocged } from 'src/azure/types/azure.types';
import { standardizeFileName } from 'src/utils/util';
import { AzureQueueService } from 'src/azure/azure-queue.service';
import { FuncionarioEntity } from './model/FuncionarioEntity';
import {
  buildUnifiedExamSignature as buildUnifiedExamSignatureContract,
  mapLegacySignatureStatus as mapLegacySignatureStatusContract,
} from './utils/exam-signature.contract';

@Injectable()
export class MongoService implements OnModuleInit {
  private client: MongoClient;
  public db: Db;
  public schedulingsCollection: Collection;
  public isReady = false;
  private urlConnection: string;
  private dbName: string;
  private collectionName: string;
  private readonly logger = new Logger(MongoService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly azureQueueService: AzureQueueService,
  ) {
    const MONGO_URL = this.configService.get<string>('MONGO_URL');
    const MONGO_DATABASE = this.configService.get<string>('MONGO_DATABASE');
    const MONGO_COLLECTION = this.configService.get<string>('MONGO_COLLECTION');

    this.urlConnection = MONGO_URL ?? 'Sem url mongo em arquivo .env';
    this.dbName = MONGO_DATABASE ?? 'Sem database mongo em .env';
    this.collectionName = MONGO_COLLECTION ?? 'Sem collection mongo em .env';
  }

  async onModuleInit() {
    try {
      this.client = new MongoClient(this.urlConnection, {
        serverApi: ServerApiVersion.v1,
        ssl: true,
        maxPoolSize: 20, // controla número máximo de conexões simultâneas
        minPoolSize: 5, // mantém algumas conexões quentes
        maxIdleTimeMS: 60000, // tempo máximo de inatividade antes do pool matar a conexão
        socketTimeoutMS: 120000, // espera até 2 min para streams longas
        connectTimeoutMS: 10000, // tempo limite para abrir a conexão
      });

      await this.client.connect();

      this.db = this.client.db(this.dbName);
      this.schedulingsCollection = this.db.collection(this.collectionName);
      this.isReady = true;
      this.logger.log('✅ Conectado ao MongoDB com sucesso');
    } catch (error) {
      this.isReady = false;
      console.error('❌ Erro ao conectar no MongoDB:', error);
    }
  }

  async waitForReady(maxRetries = 10, interval = 1000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.isReady) return true;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return this.isReady;
  }

  private mapLegacySignatureStatus(status?: string) {
    return mapLegacySignatureStatusContract(status);
  }

  private buildUnifiedExamSignature(signatureInfo?: any, url?: string) {
    return buildUnifiedExamSignatureContract(signatureInfo, url);
  }

  async updateExamGroupDocument(
    scheduleDocument: SchedulingDocument,
    grupo: string,
    url: string,
    signatureInfo?: any,
  ) {
    if (!grupo || !scheduleDocument || !url) {
      return null;
    }

    const funcionario = new FuncionarioEntity(scheduleDocument);
    const exames = funcionario.getRaw().EXAMES;

    let modified = false;
    exames.forEach((ex, index) => {
      if (ex.grupo?.trim().toLowerCase() === grupo.trim().toLowerCase()) {
        const patch: any = {
          url: url,
          status: ExamStatus.FINALIZADO,
        };
        if (signatureInfo) {
          patch.signatureInfo = signatureInfo;
          patch.signature = this.buildUnifiedExamSignature(signatureInfo, url);
        }
        funcionario.updateExameAtIndex(index, patch);
        modified = true;
      }
    });

    if (!modified) {
      this.logger.warn(
        `[updateExamGroupDocument] Nenhum exame do grupo ${grupo} encontrado para ID ${scheduleDocument._id}`,
      );
      return null;
    }

    // Recalcular status do atendimento
    funcionario.updateAtendimentoStatus();

    const filter = { _id: new ObjectId(scheduleDocument._id) };
    const update = {
      $set: {
        EXAMES: funcionario.getRaw().EXAMES,
        ATENDIMENTOSTATUS: funcionario.getRaw().ATENDIMENTOSTATUS,
      },
    };

    const result = await this.schedulingsCollection.findOneAndUpdate(
      filter,
      update,
      { returnDocument: 'after' },
    );

    return result;
  }

  async updateAnexo(scheduling: SchedulingDocument) {
    const filter = { _id: new ObjectId(scheduling._id) };

    const update = {
      // Substituir o array ANEXOS inteiro
      $set: {
        ANEXOS: scheduling.ANEXOS,
      },
    };

    const result = await this.schedulingsCollection.findOneAndUpdate(
      filter,
      update,
    );

    if (!result) {
      console.error(
        `[ERRO] Nenhum documento encontrado para ID ${scheduling._id} na atualização de anexo.`,
      );
    } else {
      this.logger.log(
        `[OK] Array ANEXOS atualizado no Mongo para ID ${scheduling._id}.`,
      );
    }
  }

  async findPendingSignatures(): Promise<SchedulingDocument[]> {
    const now = new Date();
    // Procura documentos onde EXAMES contém um item com signatureInfo.status pendente
    // Respeita o campo nextRetryAt independente do status interno (WAITING_AUTH, PENDING_RETRY ou ERRO)
    const filter = {
      EXAMES: {
        $elemMatch: {
          $or: [
            {
              'signatureInfo.status': {
                $in: ['AGUARDANDO_AUTENTICACAO', 'WAITING_AUTH'],
              },
              $or: [
                { 'signatureInfo.nextRetryAt': { $exists: false } },
                { 'signatureInfo.nextRetryAt': null },
                { 'signatureInfo.nextRetryAt': { $lte: now } },
              ],
            },
            {
              'signatureInfo.status': {
                $in: ['AGUARDANDO_REPROCESSAMENTO', 'PENDING_RETRY', 'ERRO'],
              },
              'signatureInfo.nextRetryAt': { $lte: now },
            },
          ],
        },
      },
    };

    // Para o cron, vamos trazer os que estão pendentes. Limitado para não estourar memória caso hajam muitos.
    const result = await this.schedulingsCollection
      .find(filter)
      .limit(50)
      .toArray();

    return result as unknown as SchedulingDocument[];
  }

  async updateSignatureStatus(
    schedulingId: string,
    grupoExame: string,
    signatureInfo: any,
    newUrl?: string,
  ) {
    const filter = {
      _id: new ObjectId(schedulingId),
      'EXAMES.grupo': grupoExame,
    };

    const updatePayload: any = {
      'EXAMES.$.signatureInfo': signatureInfo,
      'EXAMES.$.signature': this.buildUnifiedExamSignature(
        signatureInfo,
        newUrl,
      ),
    };

    // Atualiza a URL apenas se uma nova for fornecida (ex: SIGNED)
    if (newUrl) {
      updatePayload['EXAMES.$.url'] = newUrl;
    }

    const update = {
      $set: updatePayload,
    };

    await this.schedulingsCollection.updateOne(filter, update);
  }

  private isComplementar(doc: SchedulingDocument): boolean {
    const codigosClinico = new Set(getExamesList()['Exame Clínico'][0].codigos);
    return doc.EXAMES.every((e) => !codigosClinico.has(e.codigoExame));
  }

  private isCredenciada(doc: SchedulingDocument): boolean {
    return (
      (doc.NOMECARGO || '').includes('KIT CREDENCIADA') ||
      (doc.NOMESETOR || '').includes('KIT CREDENCIADA')
    );
  }

  private isComplementarManual(doc: SchedulingDocument): boolean {
    const EMPRESAS_COMPLEMENTAR_MANUAL = new Set([
      '263126', // Riclan
    ]);
    const codigo = doc.CODIGOEMPRESA.trim();
    return EMPRESAS_COMPLEMENTAR_MANUAL.has(codigo);
  }

  async updateExamResultsWithDocumentRules(
    schedulingId: string,
    examCodes: string[],
    url: string,
  ): Promise<SchedulingDocument> {
    const filter = { _id: new ObjectId(schedulingId) };

    const doc = (await this.schedulingsCollection.findOne(
      filter,
    )) as unknown as SchedulingDocument;
    if (!doc) throw new Error('Agendamento não encontrado');

    // 1. Atualizar exames (Cirúrgico: apenas se existirem no documento)
    let modified = false;
    doc.EXAMES.forEach((ex) => {
      if (examCodes.includes(ex.codigoExame)) {
        ex.status = ExamStatus.FINALIZADO;
        ex.url = url;
        modified = true;
      }
    });

    if (!modified) {
      this.logger.warn(
        `[REGRAS] Nenhum exame dos códigos ${examCodes} encontrado no prontuário ${schedulingId}`,
      );
      return doc;
    }

    // 2. Recalcular ATENDIMENTOSTATUS
    const allFinished = doc.EXAMES.every(
      (ex) => ex.status === ExamStatus.FINALIZADO,
    );
    const hasClinical = doc.EXAMES.some((ex) => {
      const codigosClinico = new Set(getExamesList()['Exame Clínico'][0].codigos);
      return codigosClinico.has(ex.codigoExame);
    });

    if (allFinished) {
      if (this.isCredenciada(doc)) {
        doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
      } else if (hasClinical) {
        doc.ATENDIMENTOSTATUS = AtendimentoStatus.AGUARDANDO_AVALIACAO_MEDICA;
      } else {
        // Exames Complementares apenas
        doc.ATENDIMENTOSTATUS = AtendimentoStatus.FINALIZADO;
      }

      // 3. [SOCGED] Encaminhar prontuário ao SOCGED se tudo concluído
      try {
        const payload = this.buildSocgedPayload(doc);
        await this.azureQueueService.sendSocgedMessage(payload);
        this.logger.log(
          `[SOCGED] Prontuário ${doc._id} enfileirado para upload.`,
        );
      } catch (err) {
        this.logger.error(
          `[SOCGED] Erro ao enfileirar prontuário ${doc._id}: ${err.message}`,
        );
      }
    } else {
      // Ainda há pendências
      doc.ATENDIMENTOSTATUS = AtendimentoStatus.AGUARDANDO_RESULTADOS;
    }

    await this.schedulingsCollection.replaceOne(filter, doc);

    this.logger.log(
      `[REGRAS] Prontuário ${doc._id} atualizado. Status: ${doc.ATENDIMENTOSTATUS}`,
    );

    return doc;
  }

  private buildSocgedPayload(doc: SchedulingDocument): UploadSocged {
    const dataFormatada = doc.DATAAGENDAMENTO.replace(/\//g, '-');
    const fileName = standardizeFileName(
      'Prontuario',
      doc.NOME,
      doc.TIPOEXAMENOME || 'EXAME',
      dataFormatada,
    );

    return {
      arquivo: null,
      codEmpresa: doc.CODIGOEMPRESA,
      codFuncionario: doc.CODIGO,
      codigoGed: CODIGOS_TIPO_SOCGED.PRONTUARIO_MEDICO,
      sequencialFicha: doc.SEQUENCIAFICHA,
      nomeArquivo: fileName,
      nomeGed: fileName,
      schedulingId: doc._id ? doc._id.toString() : undefined,
    };
  }
}
