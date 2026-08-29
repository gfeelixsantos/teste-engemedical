import { ObjectId } from "mongodb";
import { CertificateStatus } from "../CertificateStatus";

/**
 * Tipo padronizado para mensagens de processamento de ASO
 * Corresponde ao AsoProcessingMessage do cmso360-backend
 */
export type AsoProcessingMessage = {
  _id?: ObjectId;
  commandId?: string;
  schedulingId: string;
  sequencial: string;
  nomeFuncionario: string;
  nomeEmpresa: string;
  tipoExame: string;      // ID/C?digo do tipo de exame (ex: "1")
  tipoExameNome: string;  // Nome por extenso (ex: "Admissional")
  dataFicha: string;
  codEmpresa: string;
  codFuncionario: string;
  cpfFuncionario: string;
  parecer?: string;
  alturaParecer?: string;
  confinadoParecer?: string;
  observacoesParecer?: string[];
  action?: string;
  medico: string;
  prontuario: string;
  socgedCode: string;
  status: CertificateStatus;
  created: string;
  updated: string;
  errorMessage?: string;
  errorCount?: number;
  credentials?: {
    pin?: string;
  };
  profissional?: any;
};


export type AsoEnriquecimentoMessage = {
  commandId?: string;
  schedulingId: string;
  url: string;
  nomeFuncionario: string;
  nomeEmpresa: string;
  tipoExame: string;      // Nome/Descri??o (ex: "Admissional")
  codEmpresa: string;
  medico?: string;
  observacoesParecer?: string[];
  createdAt: string;
  credentials?: {
    pin?: string;
  };
  profissional?: any;
};

/**
 * @deprecated Use AsoProcessingMessage
 */
export type ICertificate = AsoProcessingMessage;


