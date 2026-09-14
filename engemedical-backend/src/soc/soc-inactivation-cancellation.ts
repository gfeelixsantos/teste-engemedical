import { Injectable } from '@nestjs/common';

@Injectable()
export class SocInactivationCancellationRegistry {
  private readonly cancelled = new Set<string>();
  start(id: string) { this.cancelled.delete(id); }
  cancel(id: string) { this.cancelled.add(id); }
  isCancelled(id: string) { return this.cancelled.has(id); }
  finish(id: string) { this.cancelled.delete(id); }
}
