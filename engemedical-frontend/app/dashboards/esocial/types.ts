export type StatusEvento = 'Concluido' | 'Inconsistencias' | 'Pendente' | 'Excluido' | 'Assinado';

export interface EsocialKPIs {
  totalEmpresas: number;
  pctInconsistentes: number;
  totalRegistrosXml: number;
  conclusao: { qtd: number; pct: number };
  inconsistencias: { qtd: number; pct: number };
  pendente: { qtd: number; pct: number };
  excluido: { qtd: number; pct: number };
  assinado: { qtd: number; pct: number };
  ultimaAtualizacao: string;
  valorTotalEventos: number;
  empresasEsocial: number;
  empresasComEventos: number;
  empresasFaturamento: number;
}

export interface StatusXmlItem {
  status: string;
  qtd: number;
  pct: number;
}

export interface EventoDonutItem {
  evento: string;
  qtd: number;
  pct: number;
}

export interface EvolucaoMensalItem {
  label: string;
  qtd: number;
}

export interface StatusMesItem {
  mes: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
}

export interface ComparativoEmpresaItem {
  empresa: string;
  totalRegistros: number;
  pctConcluido: number;
  valor?: number;
}

export interface NaoConcluidoEmpresaItem {
  empresa: string;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  valor?: number;
}

export interface RegistroEsocial {
  id: number;
  empresa: string;
  unidade: string;
  evento: string;
  statusEvento: StatusEvento;
  dataGeracao: string;
  funcionario: string;
  nomeArquivo: string;
  erro: string;
}

export interface EsocialDashboardData {
  kpis: EsocialKPIs;
  statusXml: StatusXmlItem[];
  eventosDonut: EventoDonutItem[];
  evolucaoMensal: EvolucaoMensalItem[];
  statusPorMes: StatusMesItem[];
  comparativoEmpresas: ComparativoEmpresaItem[];
  naoConcluidosEmpresa: NaoConcluidoEmpresaItem[];
  registros: RegistroEsocial[];
  empresas: string[];
  totalRegistros: number;
  filtros: {
    empresas: string[];
    eventos: string[];
    status: string[];
    dataInicio: string;
    dataFim: string;
  };
}