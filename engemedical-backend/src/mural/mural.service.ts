import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { ObjectId } from 'mongodb';
import { MuralDocument } from 'src/mongo/types/mural';

@Injectable()
export class MuralService {
  private readonly logger = new Logger(MuralService.name);

  constructor(
    private readonly mongoService: MongoService,
  ) {}

  private get collection() {
    return this.mongoService.db.collection<MuralDocument>('murais');
  }

  async findAll() {
    await this.mongoService.whenReady();
    const items = await this.collection.find().sort({ CREATEDAT: -1 }).toArray();
    return items.map((i) => this.mapToEntity(i));
  }

  async findActive() {
    await this.mongoService.whenReady();
    const items = await this.collection.find({ ACTIVE: true }).sort({ CREATEDAT: -1 }).toArray();
    return items.map((i) => this.mapToEntity(i));
  }

  async findOne(id: string) {
    await this.mongoService.whenReady();
    const item = await this.collection.findOne({ _id: new ObjectId(id) });
    if (!item) return null;
    return this.mapToEntity(item);
  }

  private mapToEntity(doc: any) {
    return {
      id: doc._id.toHexString(),
      LAYOUTTYPE: doc.LAYOUTTYPE,
      TITLE: doc.TITLE,
      BODYTEXT: doc.BODYTEXT,
      IMAGEURL: doc.IMAGEURL,
      STYLES: doc.STYLES,
      CREATEDBY: doc.CREATEDBY,
      ACTIVE: doc.ACTIVE,
      CREATEDAT: doc.CREATEDAT,
      UPDATEDAT: doc.UPDATEDAT,
    };
  }
}
