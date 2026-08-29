import { AsoStatus } from "./scheduling/enum/scheduling.enum";

export interface ExameDetalhado {
  nome: string;
  status: "CONCLUÍDO" | "AGUARDANDO" | "EM_ANDAMENTO";
  horaConclusao?: string;
  sala?: string;
  guiche?: string;
  profissional?: string;
}

interface Company {
  CODIGO: string;
  NOMEABREVIADO: string;
  RAZAOSOCIALINICIAL: string;
  RAZAOSOCIAL: string;
  CIDADE: string;
  CNPJ: string;
  ATIVO: string;
  CODIGOINTERNO: string;
}

interface Client {
  Email: string;
  CPF: string;
  _id: string;
  Name: string;
  Companys: Company[];
  Active: boolean;
  Phone: string;
  Profile: string;
}

interface Exame {
  codigoExame: string;
  nomeExame: string;
  preparacao: string;
  status: string;
}

// Modelo agendamento mongo
interface Scheduling {
  ATENDIMENTOSTATUS: string;
  ASOSTATUS: AsoStatus;
  SCHEDULINGCODE: string;
  CODIGOEMPRESA: string;
  CODIGOINTERNOEMPRESA: string;
  NOMEEMPRESA: string;
  CODIGO: string;
  NOME: string;
  CODIGOUNIDADE: string;
  NOMEUNIDADE: string;
  CODIGOSETOR: string;
  NOMESETOR: string;
  CODIGOCARGO: string;
  NOMECARGO: string;
  MATRICULAFUNCIONARIO: string;
  CPFFUNCIONARIO: string;
  SITUACAO: string;
  DATANASCIMENTO: string | null;
  DATAAGENDAMENTO: string;
  HORARIO: string;
  CMSO: string;
  TIPOEXAME: number;
  TIPOEXAMENOME: string;
  OBSERVACOES: string;
  ANEXOS: any[];
  TERM: boolean;
  CLIENT: Client;
  EXAMES: Exame[];
}
