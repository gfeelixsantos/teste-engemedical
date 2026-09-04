export type StatusEvento = 'Concluido' | 'Inconsistencias' | 'Pendente' | 'Excluido' | 'Assinado';
export type CodigoEvento = 'S2210' | 'S2220' | 'S2230' | 'S2240' | 'Sem evento identificado';

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
}

export interface NaoConcluidoEmpresaItem {
  empresa: string;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
}

export interface RegistroEsocial {
  id: number;
  empresa: string;
  unidade: string;
  evento: CodigoEvento;
  statusEvento: StatusEvento;
  dataGeracao: string;
  funcionario: string;
  nomeArquivo: string;
  erro: string;
}

export interface MatrizEmpresaItem {
  nome: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
}

export interface MatrizEventoItem {
  evento: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  empresas: MatrizEmpresaItem[];
}

export interface MatrizMesItem {
  mes: string;
  mesNum: number;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  eventos: MatrizEventoItem[];
}

export interface MatrizAnoItem {
  ano: number;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  meses: MatrizMesItem[];
}

export interface EsocialDashboardData {
  kpis: EsocialKPIs;
  statusXml: StatusXmlItem[];
  eventosDonut: EventoDonutItem[];
  evolucaoMensal: EvolucaoMensalItem[];
  statusPorMes: StatusMesItem[];
  comparativoEmpresas: ComparativoEmpresaItem[];
  naoConcluidosEmpresa: NaoConcluidoEmpresaItem[];
  matriz: {
    ano: number;
    totais: { concluido: number; inconsistencias: number; pendente: number; assinado: number; excluido: number };
    anos: MatrizAnoItem[];
  };
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