import { createReadStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SftpIntegratorFs {
  mkdir(path: string): Promise<void> {
    return mkdir(path, { recursive: true }).then(() => undefined);
  }

  async sha256(path: string): Promise<string> {
    const stream = createReadStream(path);
    const hash = createHash('sha256');
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    return hash.digest('hex');
  }

  async stat(path: string): Promise<{ size: number }> {
    const result = await stat(path);
    return { size: result.size };
  }

  unlink(path: string): Promise<void> {
    return unlink(path);
  }

  createReadStream(path: string) {
    return createReadStream(path);
  }
}
