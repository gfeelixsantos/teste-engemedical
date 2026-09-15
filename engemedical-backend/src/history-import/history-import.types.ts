export type HistoryEmployee = { id: string; name: string; cpf: string; unit: string };
export type HistoryFile = {
  id: string;
  name: string;
  type: 'ASO' | 'EXAME' | 'PRONTUARIO' | 'OUTRO';
  date: string | null;
  employeeId?: string;
  sourcePath?: string;
  codigoEmpresa?: string;
  codigoFuncionario?: string;
  codigoGed?: string;
  sequencialFicha?: string;
};
export type HistoryDocument = HistoryFile & {
  status: 'MATCHED' | 'PENDING';
  employee?: HistoryEmployee;
  uploadStatus?: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED';
  uploadError?: string;
  matchedCurrentEmployee?: boolean;
};
export type HistoryAnalysis = {
  id: string;
  fileName: string;
  size: number;
  status: 'ANALYZED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  employees: HistoryEmployee[];
  documents: HistoryDocument[];
  summary: { files: number; employees: number; pending: number };
  createdAt: string;
  storage?: { provider: 'temporary'; key: string };
};
