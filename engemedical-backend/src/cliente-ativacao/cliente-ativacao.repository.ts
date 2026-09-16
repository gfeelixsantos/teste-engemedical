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
}
