// Raw type from SOC "Preco" (codigo 218761) - filtered for eSocial
export interface SocPrecoEmpresa {
  codigoEmpresa: string;
  situacaoEmpresa: string;
  nomeEmpresa: string;
  estadoEmpresa: string;
  cidadeEmpresa: string;
  codigoUnidade: string;
  nomeUnidade: string;
  estadoUnidade: string;
  cidadeUnidade: string;
  codigoProduto: string;
  nomeProduto: string;
  codigoGrupoProduto: string;
  nomeGrupoProduto: string;
  exames: string;
  valorProdutoPontual: string;
  valorVidaMes: string;
  valorMensal: string;
  valorAnual: string;
  valorTotalParcela: string;
  valorMinimo: string;
  minimoVidas: string;
  valorMinimo2: string;
  minimoVidas2: string;
  valorMinimo3: string;
  minimoVidas3: string;
  valorMinimo4: string;
  minimoVidas4: string;
  valorMinimo5: string;
  minimoVidas5: string;
  valorMinimo6: string;
  minimoVidas6: string;
  valorMinimo7: string;
  minimoVidas7: string;
  valorMinimo8: string;
  minimoVidas8: string;
  valorMinimo9: string;
  minimoVidas9: string;
  valorMinimo10: string;
  minimoVidas10: string;
  dia: string;
  tipoCobranca: string;
  classificacaoCliente: string;
  dataAssinaturaContrato: string;
  diaContagem: string;
  tipoContagem: string;
  nomeSubgrupo: string;
  tipoRelatorioFatura: string;
  vidasAtivasUltimaContagem: string;
  flagClienteInadimplente: string;
  valorEvento: string;
}

// Status possiveis dos registros eSocial
export type StatusEvento = 'Concluido' | 'Inconsistencias' | 'Pendente' | 'Excluido' | 'Assinado';

// Eventos eSocial
export type CodigoEvento = 'S2210' | 'S2220' | 'S2230' | 'S2240' | 'Sem evento identificado';

// Registro individual de evento eSocial
export interface RegistroEsocial {
  id: number;
  codigoEmpresa: string;
  empresa: string;
  cnpj: string;
  unidade: string;
  evento: CodigoEvento;
  statusEvento: StatusEvento;
  dataGeracao: string;
  ano: number;
  mesNum: number;
  mesNome: string;
  funcionario: string;
  nrRecibo: string;
  codigoGed: string;
  nomeArquivo: string;
  erro: string;
}

// KPIs do dashboard
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

// Status XML para grafico
export interface StatusXmlItem {
  status: string;
  qtd: number;
  pct: number;
}

// Evento para donut
export interface EventoDonutItem {
  evento: string;
  qtd: number;
  pct: number;
}

// Evolucao mensal
export interface EvolucaoMensalItem {
  label: string;
  qtd: number;
}

// Status por mes (stacked bar)
export interface StatusMesItem {
  mes: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
}

// Comparativo empresas
export interface ComparativoEmpresaItem {
  empresa: string;
  totalRegistros: number;
  pctConcluido: number;
}

// Nao concluidos por empresa
export interface NaoConcluidoEmpresaItem {
  empresa: string;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
}

// Matriz hierarquica
export interface MatrizAnoItem {
  ano: number;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  meses: MatrizMesItem[];
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

export interface MatrizEventoItem {
  evento: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
  empresas: MatrizEmpresaItem[];
}

export interface MatrizEmpresaItem {
  nome: string;
  concluido: number;
  inconsistencias: number;
  pendente: number;
  assinado: number;
  excluido: number;
}

// Dashboard completo
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