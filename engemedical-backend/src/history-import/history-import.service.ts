import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as unzipper from 'unzipper';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { MongoService } from '../mongo/mongo.service';
import { SocUploadService } from '../soc/services/soc-upload.service';
import { analyzeHistoryImport, normalizeHistoryFilename, parseHistoryCatalogRows, validateHistoryImportFile } from './history-import.analyzer';
import type { HistoryAnalysis } from './history-import.types';

@Injectable()
export class HistoryImportService {
  private readonly logger = new Logger(HistoryImportService.name);
  private readonly execFileAsync = promisify(execFile);
  constructor(private readonly mongo: MongoService, private readonly socUpload: SocUploadService) {}

  async analyze(file: Express.Multer.File): Promise<HistoryAnalysis> {
    const extension = validateHistoryImportFile(file);
    const source = file.buffer ?? file.path;
    if (!source) throw new BadRequestException('Arquivo recebido sem conteúdo para análise');
    const sourceBuffer = Buffer.isBuffer(source) ? source : await fs.readFile(source);
    const files = await this.readArchiveEntries(sourceBuffer, file.originalname);
    this.logger.log(`[HISTORY_IMPORT] pacote=${normalizeHistoryFilename(file.originalname)} tamanho=${file.size} entradas=${files.length} xlsx=${files.filter((item) => item.name.toLowerCase().endsWith('.xlsx')).length}`);
    const employees = [];
    const catalogFiles = [];
    const xlsxBuffers = await this.readArchiveXlsx(sourceBuffer, file.originalname);
    for (const [entryName, buffer] of xlsxBuffers) {
      const { readSheet } = await import('read-excel-file/node');
      const rows = (await readSheet(buffer)) as unknown[][];
      const parsedCatalog = parseHistoryCatalogRows(rows);
      employees.push(...parsedCatalog.employees);
      catalogFiles.push(...parsedCatalog.files);
      this.logger.debug(`[HISTORY_IMPORT] catalogo=${normalizeHistoryFilename(entryName)} linhas=${rows.length} colaboradores=${parsedCatalog.employees.length} documentos=${parsedCatalog.files.length}`);
    }
    const uniqueEmployees = [...new Map(employees.map((item) => [item.id, item])).values()];
    const parsed = analyzeHistoryImport({ employees: uniqueEmployees, files: catalogFiles.length ? catalogFiles : files });
    const result: HistoryAnalysis = { id: randomUUID(), fileName: normalizeHistoryFilename(file.originalname), size: file.size, status: 'ANALYZED', ...parsed, createdAt: new Date().toISOString() };
    if (this.mongo.historyImportCollection) await this.mongo.historyImportCollection.insertOne(result);
    return result;
  }

  private async readArchiveEntries(source: Buffer, name: string) {
    if (name.toLowerCase().endsWith('.rar')) return this.listRarEntries(source);
    const archive = await unzipper.Open.buffer(source);
    const entries = [] as Array<{ id: string; name: string; type: any; date: null }>;
    for (const entry of archive.files) {
      if (entry.type === 'Directory') continue;
      const entryName = normalizeHistoryFilename(entry.path);
      if (/\.(zip|rar)$/i.test(entryName)) entries.push(...await this.readArchiveEntries(await entry.buffer(), entryName));
      else entries.push({ id: entryName, name: entryName, type: entryName.toLowerCase().endsWith('.xlsx') ? 'OUTRO' : 'EXAME', date: null });
    }
    return entries;
  }

  private async readArchiveXlsx(source: Buffer, name: string): Promise<Array<[string, Buffer]>> {
    if (name.toLowerCase().endsWith('.rar')) return this.extractRarXlsx(source, name);
    const archive = await unzipper.Open.buffer(source);
    const result: Array<[string, Buffer]> = [];
    for (const entry of archive.files) {
      if (entry.type === 'Directory') continue;
      const entryName = normalizeHistoryFilename(entry.path);
      if (entryName.toLowerCase().endsWith('.xlsx')) result.push([entryName, await entry.buffer()]);
      else if (/\.(zip|rar)$/i.test(entryName)) result.push(...await this.readArchiveXlsx(await entry.buffer(), entryName));
    }
    return result;
  }

  private async listRarEntries(source: Buffer) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-import-'));
    const archivePath = path.join(tempDir, 'source.rar');
    try {
      await fs.writeFile(archivePath, source);
      const { executable, kind } = this.resolveRarTool();
      let output: string;
      try { ({ stdout: output } = await this.execFileAsync(executable, kind === 'unrar' ? ['lb', archivePath] : ['l', '-slt', archivePath], { maxBuffer: 4 * 1024 * 1024 })); }
      catch { throw new BadRequestException('Não foi possível listar o RAR. Configure HISTORY_IMPORT_7Z_PATH com 7z.exe ou UnRAR.exe.'); }
      const entries = kind === 'unrar' ? output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : output.split(/\r?\n/).filter((line) => line.startsWith('Path = ')).slice(1).map((line) => line.slice(7).trim()).filter(Boolean);
      return entries.map((entryName) => ({ id: normalizeHistoryFilename(entryName), name: normalizeHistoryFilename(entryName), type: 'EXAME', date: null as null }));
    } finally { await fs.rm(tempDir, { recursive: true, force: true }); }
  }

  private async extractRarXlsx(source: Buffer, name: string): Promise<Array<[string, Buffer]>> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-import-'));
    const archivePath = path.join(tempDir, 'source.rar');
    try {
      await fs.writeFile(archivePath, source);
      const { executable, kind } = this.resolveRarTool();
      const args = kind === 'unrar' ? ['x', '-y', archivePath, '*.xlsx', `${tempDir}${path.sep}`] : ['x', '-y', `-o${tempDir}`, archivePath, '*.xlsx', '-r'];
      try { await this.execFileAsync(executable, args, { maxBuffer: 4 * 1024 * 1024 }); }
      catch { throw new BadRequestException(`Não foi possível extrair os catálogos XLSX do RAR ${normalizeHistoryFilename(name)}. Verifique o 7-Zip ou WinRAR.`); }
      const result: Array<[string, Buffer]> = [];
      const visit = async (directory: string) => { for (const item of await fs.readdir(directory, { withFileTypes: true })) { const itemPath = path.join(directory, item.name); if (item.isDirectory()) await visit(itemPath); else if (item.name.toLowerCase().endsWith('.xlsx') && itemPath !== archivePath) result.push([normalizeHistoryFilename(item.name), await fs.readFile(itemPath)]); } };
      await visit(tempDir);
      return result;
    } finally { await fs.rm(tempDir, { recursive: true, force: true }); }
  }

  private resolveRarTool(): { executable: string; kind: '7z' | 'unrar' } {
    const configured = process.env.HISTORY_IMPORT_7Z_PATH;
    if (configured) return { executable: configured, kind: /unrar/i.test(configured) ? 'unrar' : '7z' };
    if (process.platform === 'win32') {
      const candidates = ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe'];
      for (const candidate of candidates) { try { require('node:fs').accessSync(candidate); return { executable: candidate, kind: '7z' }; } catch {} }
      const unrar = 'C:\\Program Files\\WinRAR\\UnRAR.exe';
      try { require('node:fs').accessSync(unrar); return { executable: unrar, kind: 'unrar' }; } catch {}
    }
    return { executable: process.platform === 'win32' ? '7z.exe' : '7z', kind: '7z' };
  }


  async get(id: string) {
    const result = await this.mongo.historyImportCollection?.findOne({ id });
    if (!result) throw new NotFoundException('Análise não encontrada');
    return result;
  }

  async confirm(id: string, employeeId: string, documentIds: string[]) {
    const analysis = await this.get(id);
    const selected = analysis.documents.filter((item) => documentIds.includes(item.id));
    if (!employeeId || !selected.length) throw new BadRequestException('Selecione um colaborador e ao menos um documento');
    if (selected.some((item) => item.status !== 'MATCHED' || item.employee?.id !== employeeId)) throw new BadRequestException('Existem documentos pendentes ou incompatíveis com o colaborador');
    await this.mongo.historyImportCollection?.updateOne({ id }, { $set: { status: 'PROCESSING', confirmedEmployeeId: employeeId, confirmedDocumentIds: documentIds } });
    return { id, status: 'PROCESSING', selected: selected.length, message: 'Lote controlado preparado para envio ao SOC' };
  }
}
