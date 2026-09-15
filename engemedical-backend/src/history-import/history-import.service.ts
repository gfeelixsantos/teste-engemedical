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
import { SocExportService } from '../soc/services/soc-export.service';
import { analyzeHistoryImport, normalizeHistoryFilename, parseHistoryCatalogRows, validateHistoryImportFile } from './history-import.analyzer';
import { resolveHistoryEmployeeForUpload, resolveHistoryUploadMetadata } from './history-import.mapping';
import type { CurrentHistoryEmployee } from './history-import.mapping';
import type { HistoryAnalysis, HistoryDocument } from './history-import.types';
import { HistoryImportCancellationRegistry } from './history-import-cancellation';
import { HistoryImportStorage } from './history-import-storage';

@Injectable()
export class HistoryImportService {
  private readonly logger = new Logger(HistoryImportService.name);
  private readonly execFileAsync = promisify(execFile);
  constructor(private readonly mongo: MongoService, private readonly socUpload: SocUploadService, private readonly socExport: SocExportService, private readonly cancellation: HistoryImportCancellationRegistry, private readonly storage: HistoryImportStorage) {}

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
    result.storage = await this.storage.save(result.id, result.fileName, sourceBuffer);
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

  async confirm(id: string, targetCompany: string, documentIds: string[]) {
    const analysis = await this.get(id);
    const selected = analysis.documents.filter((item) => documentIds.includes(item.id));
    if (!selected.length) {
      this.logger.warn(`[HISTORY_IMPORT] confirmação rejeitada id=${id}: nenhum documento selecionado`);
      throw new BadRequestException('Selecione ao menos um documento');
    }
    if (!targetCompany?.trim()) {
      this.logger.warn(`[HISTORY_IMPORT] confirmação rejeitada id=${id}: empresa alvo ausente`);
      throw new BadRequestException('Selecione a empresa alvo');
    }

    this.cancellation.start(id);
    const currentEmployees = await this.loadCurrentEmployees(targetCompany);
    let sourceBuffer: Buffer;
    try {
      if (!analysis.storage) throw new Error('Referência temporária ausente');
      sourceBuffer = await this.storage.read(analysis.storage);
    } catch {
      this.logger.warn(`[HISTORY_IMPORT] confirmação rejeitada id=${id}: pacote temporário ausente`);
      throw new BadRequestException('A análise expirou. Envie o pacote novamente.');
    }

    await this.mongo.historyImportCollection?.updateOne({ id }, { $set: { status: 'PROCESSING', targetCompany: targetCompany.trim(), confirmedDocumentIds: documentIds } });
    const report = { sent: 0, failed: 0, skipped: 0, generic: 0, selected: selected.length, items: [] as Array<{ documentId: string; status: string; error?: string }> };

    for (const document of selected) {
      if (this.cancellation.isCancelled(id)) {
        report.items.push({ documentId: document.id, status: 'CANCELLED' });
        continue;
      }
      try {
        const arquivo = await this.readArchiveDocument(sourceBuffer, analysis.fileName, document.name);
        if (!arquivo) throw new Error('Arquivo físico não encontrado no pacote');
        const importedEmployee = analysis.employees.find((item) => item.id === document.employeeId);
        const resolved = importedEmployee ? resolveHistoryEmployeeForUpload(importedEmployee, currentEmployees) : { found: false as const, employee: null };
        const metadata = resolveHistoryUploadMetadata(document.type, document.name);
        const current = resolved.found ? resolved.employee : null;
        const sequencialFicha = String(document.sequencialFicha ?? '').trim();
        if (!current) {
          report.generic++;
          report.skipped++;
          const error = 'CPF não localizado na empresa alvo; envio genérico ainda não habilitado para o UploadArquivosWs';
          report.items.push({ documentId: document.id, status: 'SKIPPED', error });
          await this.updateDocumentStatus(id, document.id, { uploadStatus: 'SKIPPED', matchedCurrentEmployee: false, uploadError: error });
          this.logger.warn(`[HISTORY_IMPORT] documento=${document.name} não enviado: ${error}`);
          continue;
        }
        if (!sequencialFicha) {
          report.skipped++;
          const error = 'Código sequencial da ficha ausente; envio bloqueado para evitar vínculo incorreto';
          report.items.push({ documentId: document.id, status: 'SKIPPED', error });
          await this.updateDocumentStatus(id, document.id, { uploadStatus: 'SKIPPED', matchedCurrentEmployee: true, uploadError: error });
          this.logger.warn(`[HISTORY_IMPORT] documento=${document.name} não enviado: ${error}`);
          continue;
        }
        await this.socUpload.uploadFile({
          arquivo,
          codEmpresa: current.codEmpresa,
          codFuncionario: current.codFuncionario,
          sequencialFicha,
          nomeArquivo: document.name,
          nomeGed: `${current.name}_${sequencialFicha}`,
          codigoGed: document.codigoGed || '',
          tipoGed: metadata.codigoTipoGed,
          classificacao: metadata.classificacao,
          sobreescreveArquivo: false,
        });
        report.sent++;
        report.items.push({ documentId: document.id, status: current ? 'SENT' : 'SENT_GENERIC' });
        await this.updateDocumentStatus(id, document.id, { uploadStatus: 'SENT', matchedCurrentEmployee: Boolean(current), uploadError: undefined });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.failed++;
        report.items.push({ documentId: document.id, status: 'FAILED', error: message });
        await this.updateDocumentStatus(id, document.id, { uploadStatus: 'FAILED', uploadError: message });
        this.logger.error(`[HISTORY_IMPORT] falha documento=${document.name}: ${message}`);
      }
    }

    const cancelled = this.cancellation.isCancelled(id);
    const status = cancelled ? 'CANCELLED' : report.failed ? 'FAILED' : 'COMPLETED';
    const hasOccurrences = report.failed > 0 || report.skipped > 0;
    await this.mongo.historyImportCollection?.updateOne({ id }, { $set: { status, report } });
    this.cancellation.finish(id);
    if (analysis.storage) await this.storage.remove(analysis.storage);
    return { id, status, cancelled, ...report, message: cancelled ? 'Processamento cancelado. O relatório parcial foi preservado.' : hasOccurrences ? 'Processamento concluído com documentos não enviados para revisão.' : 'Importação concluída com sucesso.' };
  }

  cancel(id: string) {
    this.cancellation.cancel(id);
    return { id, status: 'CANCELLATION_REQUESTED' as const };
  }

  private async loadCurrentEmployees(targetCompany: string): Promise<CurrentHistoryEmployee[]> {
    const people = (await this.socExport.EdCadastroPessoas()) ?? [];
    return people
      .filter((person) => String(person.EMPRESA ?? '').trim() === String(targetCompany).trim())
      .map((person) => ({
        id: `${person.EMPRESA}-${person.CODIGO}`,
        cpf: person.CPF,
        name: person.NOME,
        codEmpresa: person.EMPRESA,
        codFuncionario: person.CODIGO,
        sequencialFicha: '',
      }));
  }

  private async updateDocumentStatus(id: string, documentId: string, update: Partial<HistoryDocument>) {
    const analysis = await this.get(id);
    const documents = analysis.documents.map((document) => document.id === documentId ? { ...document, ...update } : document);
    await this.mongo.historyImportCollection?.updateOne({ id }, { $set: { documents } });
  }

  private async readArchiveDocument(source: Buffer, name: string, target: string): Promise<Buffer | null> {
    if (!name.toLowerCase().endsWith('.rar')) {
      const archive = await unzipper.Open.buffer(source);
      for (const entry of archive.files) {
        if (entry.type === 'Directory') continue;
        const entryName = normalizeHistoryFilename(entry.path);
        if (entryName === target || path.basename(entryName) === path.basename(target)) return entry.buffer();
        if (/\.(zip|rar)$/i.test(entryName)) {
          const nested = await this.readArchiveDocument(await entry.buffer(), entryName, target);
          if (nested) return nested;
        }
      }
      return null;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-import-upload-'));
    const archivePath = path.join(tempDir, 'source.rar');
    try {
      await fs.writeFile(archivePath, source);
      const { executable, kind } = this.resolveRarTool();
      const entries = await this.listRarEntries(source);
      const targetBaseName = path.basename(target).toLowerCase();
      const matchingEntry = entries.find((entry) => path.basename(entry.name).toLowerCase() === targetBaseName);
      if (!matchingEntry) {
        this.logger.warn(`[HISTORY_IMPORT] arquivo não localizado no RAR alvo=${target}`);
        return null;
      }
      // O WinRAR/UnRAR pode devolver os diretórios com a codificação do
      // console (OEM/ANSI). Reutilizar esse caminho textual corrompido faz o
      // comando falhar quando há acentos em qualquer pasta do arquivo.
      // O nome do documento é suficiente para localizar a entrada e evita
      // depender da representação codificada do caminho completo.
      const targetPattern = `*${path.basename(target)}`;
      const args = kind === 'unrar'
        ? ['x', '-y', archivePath, targetPattern, `${tempDir}${path.sep}`]
        : ['x', '-y', `-o${tempDir}`, archivePath, targetPattern, '-r'];
      try {
        await this.execFileAsync(executable, args, { maxBuffer: 4 * 1024 * 1024 });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Falha ao extrair ${target} do RAR: ${message}`);
      }
      const visit = async (directory: string): Promise<Buffer | null> => {
        for (const item of await fs.readdir(directory, { withFileTypes: true })) {
          const itemPath = path.join(directory, item.name);
          if (item.isDirectory()) { const nested = await visit(itemPath); if (nested) return nested; }
          else if (normalizeHistoryFilename(item.name) === path.basename(target)) return fs.readFile(itemPath);
        }
        return null;
      };
      return visit(tempDir);
    } finally {
      try {
        await fs.rm(tempDir, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 100,
        });
      } catch (error) {
        // A extração já pode ter sido concluída. No Windows, o UnRAR pode
        // deixar uma pasta temporariamente ocupada; isso não deve transformar
        // um documento lido com sucesso em falha de importação.
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[HISTORY_IMPORT] limpeza temporária pendente diretório=${tempDir}: ${message}`);
      }
    }
  }
}
