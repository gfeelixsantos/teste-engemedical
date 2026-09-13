export type HistoryEmployee = { id: string; name: string; cpf: string; unit: string };
export type HistoryFile = { id: string; name: string; type: 'ASO' | 'EXAME' | 'PRONTUARIO' | 'OUTRO'; date: string | null; employeeId?: string };
export type HistoryDocument = HistoryFile & { status: 'MATCHED' | 'PENDING'; employee?: HistoryEmployee };
export type HistoryAnalysis = {
  id: string;
  fileName: string;
  size: number;
  status: 'ANALYZED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  employees: HistoryEmployee[];
  documents: HistoryDocument[];
  summary: { files: number; employees: number; pending: number };
  createdAt: string;
};
