import { SchedulingDocument } from 'src/mongo/types/scheduling';
import { IUserInfo } from 'src/mongo/types/user';

export type AsoQueueMessage = {
  schedulingId: string;
  sequencial: string;
  nomeFuncionario: string;
  nomeEmpresa: string;
  tipoExame: string;
  dataFicha: string;
  codEmpresa: string;
  codFuncionario: string;
  cpfFuncionario: string;
  parecer: string;
  observacoes?: string[];
  action: 'PROCESSAR' | 'REPROCESSAR';
  retryCount?: number;
  createdAt: Date;
};

export type AsoEnriquecimentoMessage = {
  schedulingId: string;
  url: string;
  nomeFuncionario: string;
  nomeEmpresa: string;
  tipoExame: string;
  codEmpresa: string; // Adicionado para facilitar a busca de contatos
  medico?: string;
  profissional?: IUserInfo; // Adicionado para evitar lookups recorrentes
  observacoesParecer?: string[];
  prontuario?: string;
  retryCount?: number;
  commandId?: string;
  createdAt: Date | string;
  credentials?: {
    pin?: string;
  };
};
