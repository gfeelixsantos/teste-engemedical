import { Injectable } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { ClientActivationDocument, ClientActivationRepositoryPort } from './cliente-ativacao.types';

@Injectable()
export class ClientActivationRepository implements ClientActivationRepositoryPort {
  constructor(private readonly mongoService: MongoService) {}

  async findByUserAndCompany(userId: string, companyCode: string): Promise<ClientActivationDocument | null> {
    await this.mongoService.whenReady();
    const document = await this.mongoService.db.collection<ClientActivationDocument>('client_activations').findOne({ userId, companyCode });
    if (!document) return null;
    return { ...document, id: document.id ?? String(document._id ?? '') };
  }

  async start(document: ClientActivationDocument): Promise<ClientActivationDocument> {
    await this.mongoService.whenReady();
    const insertDocument = { ...document };
    delete insertDocument.updatedAt;
    await this.mongoService.db.collection<ClientActivationDocument>('client_activations').updateOne(
      { userId: document.userId, companyCode: document.companyCode },
      { $setOnInsert: insertDocument, $set: { updatedAt: new Date() } }, { upsert: true },
    );
    return (await this.findByUserAndCompany(document.userId, document.companyCode)) as ClientActivationDocument;
  }

  async update(documentId: string, userId: string, companyCode: string, changes: Partial<ClientActivationDocument>): Promise<ClientActivationDocument> {
    await this.mongoService.whenReady();
    await this.mongoService.db.collection<ClientActivationDocument>('client_activations').updateOne(
      { id: documentId, userId, companyCode }, { $set: { ...changes, updatedAt: new Date() } },
    );
    const result = await this.mongoService.db.collection<ClientActivationDocument>('client_activations').findOne({ id: documentId, userId, companyCode });
    if (!result) throw new Error('Ativação não encontrada');
    return { ...result, id: result.id ?? String(result._id ?? '') };
  }
}
