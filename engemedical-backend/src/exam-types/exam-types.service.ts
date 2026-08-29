import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { Collection, ObjectId } from 'mongodb';
import { IExamTypeDocument, IExamTypeCreate, IExamTypeUpdate, IExamTypeResponse } from './exam-types.interface';

@Injectable()
export class ExamTypesService {
  private readonly logger = new Logger(ExamTypesService.name);
  private collection: Collection<IExamTypeDocument>;

  constructor(private readonly mongoService: MongoService) {
    this.collection = this.mongoService.db.collection<IExamTypeDocument>('exam_types');
  }

  private toResponse(doc: IExamTypeDocument): IExamTypeResponse {
    return {
      id: doc._id?.toString() || '',
      chave: doc.chave,
      valor: doc.valor,
      ordem: doc.ordem,
      ativo: doc.ativo,
    };
  }

  async findAll(): Promise<IExamTypeResponse[]> {
    const docs = await this.collection.find({ ativo: true }).sort({ ordem: 1 }).toArray();
    return docs.map((d) => this.toResponse(d));
  }

  async findAllAsRecord(): Promise<Record<string, string>> {
    const docs = await this.collection.find({ ativo: true }).toArray();
    const record: Record<string, string> = {};
    for (const d of docs) {
      record[d.chave] = d.valor;
    }
    return record;
  }

  async findByChave(chave: string): Promise<IExamTypeResponse | null> {
    const doc = await this.collection.findOne({ chave: chave.toUpperCase() });
    return doc ? this.toResponse(doc) : null;
  }

  async create(data: IExamTypeCreate): Promise<IExamTypeResponse> {
    const chave = data.chave.toUpperCase();
    const existing = await this.collection.findOne({ chave });
    if (existing) throw new ConflictException(`Tipo de exame "${chave}" já existe`);

    const doc: IExamTypeDocument = {
      chave,
      valor: data.valor,
      ordem: data.ordem ?? 0,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.collection.insertOne(doc);
    return this.toResponse({ ...doc, _id: result.insertedId });
  }

  async update(chave: string, data: IExamTypeUpdate): Promise<IExamTypeResponse> {
    const update: Record<string, any> = { updatedAt: new Date() };
    if (data.valor !== undefined) update.valor = data.valor;
    if (data.ordem !== undefined) update.ordem = data.ordem;
    if (data.ativo !== undefined) update.ativo = data.ativo;

    const result = await this.collection.findOneAndUpdate(
      { chave: chave.toUpperCase() },
      { $set: update },
      { returnDocument: 'after' },
    );
    if (!result) throw new NotFoundException(`Tipo de exame "${chave}" não encontrado`);
    return this.toResponse(result);
  }

  async remove(chave: string): Promise<void> {
    const result = await this.collection.deleteOne({ chave: chave.toUpperCase() });
    if (result.deletedCount === 0) throw new NotFoundException(`Tipo de exame "${chave}" não encontrado`);
  }
}
