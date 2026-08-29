import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  correlationId?: string;
  worker?: string;
  companyId?: string;
  examId?: string;
  [key: string]: any;
}

export const logContextStorage = new AsyncLocalStorage<LogContext>();

export function getLogContext(): LogContext {
  return logContextStorage.getStore() || {};
}

export function runWithContext<T>(context: LogContext, fn: () => T): T {
  const currentContext = getLogContext();
  return logContextStorage.run({ ...currentContext, ...context }, fn);
}
