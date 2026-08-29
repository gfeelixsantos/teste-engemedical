export type GedBatchScope = 'empresa' | 'periodo' | 'prontuario';
export type GedBatchTipo = 'prontuario' | 'aso';

export type GedBatchQueueMessage = {
  jobId: string;
  scope: GedBatchScope;
  empresaCodigo: string;
  empresaNome: string;
  periodo?: {
    ano?: string;
    mes?: string;
  };
  tipo?: GedBatchTipo;
  createdBy: string;
  prontuarios: { codigoProntuario: string; nome: string }[];
};

export type GedBatchResult = {
  jobId: string;
  itemCodigoProntuario?: string;
  status: 'completed' | 'failed' | 'partial';
  blobName?: string;
  blobUrl?: string;
  error?: string;
  finishedAt?: string;
};
