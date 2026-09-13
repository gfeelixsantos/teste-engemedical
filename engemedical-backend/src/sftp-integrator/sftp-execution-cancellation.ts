import { Injectable } from '@nestjs/common';

@Injectable()
export class SftpExecutionCancellationRegistry {
  private readonly cancelled = new Set<string>();

  start(executionId: string) {
    this.cancelled.delete(executionId);
  }

  cancel(executionId: string) {
    this.cancelled.add(executionId);
  }

  isCancelled(executionId: string) {
    return this.cancelled.has(executionId);
  }

  finish(executionId: string) {
    this.cancelled.delete(executionId);
  }
}
