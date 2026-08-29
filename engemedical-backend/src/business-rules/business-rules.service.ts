import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { Collection } from 'mongodb';
import { IBusinessRuleDocument, IBusinessRuleUpdate, IBusinessRuleResponse } from './business-rules.interface';

@Injectable()
export class BusinessRulesService {
  private readonly logger = new Logger(BusinessRulesService.name);
  private collection: Collection<IBusinessRuleDocument>;

  constructor(private readonly mongoService: MongoService) {
    this.collection = this.mongoService.db.collection<IBusinessRuleDocument>('business_rules');
  }

  private toResponse(doc: IBusinessRuleDocument): IBusinessRuleResponse {
    return {
      id: doc._id?.toString() || '',
      chave: doc.chave,
      descricao: doc.descricao,
      valor: doc.valor,
      tipo: doc.tipo,
      ativo: doc.ativo,
    };
  }

  async findAll(): Promise<IBusinessRuleResponse[]> {
    const docs = await this.collection.find({ ativo: true }).toArray();
    return docs.map((d) => this.toResponse(d));
  }

  async findByChave(chave: string): Promise<IBusinessRuleResponse | null> {
    const doc = await this.collection.findOne({ chave });
    return doc ? this.toResponse(doc) : null;
  }

  async getValor(chave: string): Promise<string[]> {
    const doc = await this.collection.findOne({ chave, ativo: true });
    return doc?.valor || [];
  }

  async getAsSet(chave: string): Promise<Set<string>> {
    const valor = await this.getValor(chave);
    return new Set(valor);
  }

  async findAllAsMap(): Promise<Record<string, string[]>> {
    const docs = await this.collection.find({ ativo: true }).toArray();
    const map: Record<string, string[]> = {};
    for (const d of docs) {
      map[d.chave] = d.valor;
    }
    return map;
  }

  async upsert(chave: string, data: IBusinessRuleUpdate): Promise<IBusinessRuleResponse> {
    const update: Record<string, any> = { updatedAt: new Date() };
    if (data.descricao !== undefined) update.descricao = data.descricao;
    if (data.valor !== undefined) update.valor = data.valor;
    if (data.tipo !== undefined) update.tipo = data.tipo;
    if (data.ativo !== undefined) update.ativo = data.ativo;

    const result = await this.collection.findOneAndUpdate(
      { chave },
      { $set: update, $setOnInsert: { createdAt: new Date() } },
      { returnDocument: 'after', upsert: true },
    );
    return this.toResponse(result!);
  }
}
