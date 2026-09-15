import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export type HistoryImportStorageReference = {
  provider: 'temporary';
  key: string;
};

@Injectable()
export class HistoryImportStorage {
  private readonly root = path.join(os.tmpdir(), 'engemedical-history-imports');

  async save(id: string, fileName: string, content: Buffer): Promise<HistoryImportStorageReference> {
    const directory = this.getDirectory(id);
    await fs.mkdir(directory, { recursive: true });
    const packagePath = path.join(directory, this.getSafePackageName(fileName));
    await fs.writeFile(packagePath, content);
    return { provider: 'temporary', key: path.relative(this.root, packagePath) };
  }

  async read(reference: HistoryImportStorageReference): Promise<Buffer> {
    return fs.readFile(this.resolveReference(reference));
  }

  async remove(reference: HistoryImportStorageReference): Promise<void> {
    await fs.rm(this.getDirectory(path.dirname(reference.key)), { recursive: true, force: true });
  }

  private getDirectory(id: string) {
    return path.join(this.root, path.basename(id));
  }

  private getSafePackageName(fileName: string) {
    const extension = path.extname(fileName).toLowerCase() === '.rar' ? '.rar' : '.zip';
    return `package${extension}`;
  }

  private resolveReference(reference: HistoryImportStorageReference) {
    const root = path.resolve(this.root);
    const resolved = path.resolve(root, reference.key);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error('Referência de armazenamento inválida');
    return resolved;
  }
}
