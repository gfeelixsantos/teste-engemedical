import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import type { EmpresaDocument } from './types/empresa';
import type { MongoService } from './mongo.service';

// Lazy getter para evitar ReferenceError causado por import estático circular com SWC
const getMongoService = () => require('./mongo.service').MongoService;

@Injectable()
export class EmpresaCacheService {
  private readonly logger = new Logger(EmpresaCacheService.name);
  private cache = new Map<string, { data: EmpresaDocument; expiresAt: number }>();
  private readonly TTL_MS = 10 * 60 * 1000;

  constructor(
    @Inject(forwardRef(getMongoService))
    private readonly mongoService: MongoService,
  ) {}

  async getEmpresa(codigo: string): Promise<EmpresaDocument | null> {
    const entry = this.cache.get(codigo);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data;
    }
    const empresa = await this.mongoService.findEmpresaByCode(codigo);
    if (empresa) {
      this.cache.set(codigo, {
        data: empresa,
        expiresAt: Date.now() + this.TTL_MS,
      });
    }
    return empresa;
  }

  invalidate(codigo: string): void {
    this.cache.delete(codigo);
  }

  clear(): void {
    this.cache.clear();
  }
}
