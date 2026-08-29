export declare const QUEUE_PROCESSING: string;
export declare const QUEUE_ENRIQUECIMENTO: string;

export declare class AsoQueueService {
  constructor(connectionString: string);
  initialize(): Promise<void>;
  receiveProcessingMessage(): Promise<any[]>;
  getProcessingQueueStats(): Promise<{ approximateMessagesCount: number }>;
  deleteProcessingMessage(messageId: string, popReceipt: string): Promise<void>;
  renewProcessingMessage(messageId: string, popReceipt: string, messageText: string): Promise<string>;
  sendToEnriquecimento(message: any): Promise<void>;
  sendToPoisonQueue(messageText: string): Promise<void>;
}
