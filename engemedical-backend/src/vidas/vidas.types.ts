export interface VidasKPIs {
  totalRegistros: number;
  inativos: number;
  ativos: number;
  pendentes: number;
  ferias: number;
  afastados: number;
  percentInconsistenciaBase: number;
  totalConsistencias: number;
  totalInconsistencias: number;
  ultimaAtualizacao: string;
}

export interface RegistroCadastralItem {
  situacao: string;
  quantidade: number;
}

export interface IndiceRegularizacaoItem {
  categoria: string;
  percentual: number;
  tipo: 'Consistente' | 'Inconsistente';
}

export interface EmpresasPorPlanoItem {
  categoria: string;
  quantidade: number;
}

export interface RegistrosPorEmpresaItem {
  empresa: string;
  quantidade: number;
}

export interface ConformidadeAtivacaoItem {
  status: string;
  percentual: number;
  tipo: 'Consistente' | 'Inconsistente';
}

export interface PlanoProdutoItem {
  produto: string;
  quantidade: number;
}

export interface ValorVidasEmpresaItem {
  empresa: string;
  valorTotal: number;
  valorFormatado: string;
}

export interface VidasAtivasEmpresaItem {
  empresa: string;
  quantidade: number;
}

export interface ProdutoTabelaItem {
  codigo: string;
  empresa: string;
  planoAtivacao: string;
  produto: string;
  subgrupo: string;
  valorVidaMes: string;
  vidasAtivas: number;
}

export interface EmpresaAtivacaoTabelaItem {
  codigo: string;
  empresa: string;
  planoAtivacao: 'SIM' | 'NÃO';
}

export interface AnaliseEstruturalItem {
  nome: string;
  consistente: number;
  inconsistente: number;
}

export interface PerfilDemografico {
  masculino: number;
  feminino: number;
  faixaEtaria: { faixa: string; quantidade: number }[];
  localidade: { cidadeUf: string; quantidade: number }[];
}

export interface VidasTabelaGeralItem {
  produtoEmpresa: string;
  consistenciaProdutoAtivacao: string;
  situacao: string;
  admissao: string;
  demissao: string;
  consistenciaAtivacaoColaborador: string;
  subgrupo: string;
  codigoEmpresa: string;
  empresa: string;
  nomeFuncionario?: string;
  unidade?: string;
  setor?: string;
}

export interface VidasDashboardResponse {
  kpis: VidasKPIs;
  registrosCadastrais: RegistroCadastralItem[];
  indiceRegularizacao: IndiceRegularizacaoItem[];
  empresasPorPlano: EmpresasPorPlanoItem[];
  registrosPorEmpresa: RegistrosPorEmpresaItem[];
  conformidadeAtivacao: ConformidadeAtivacaoItem[];
  planoProdutos: PlanoProdutoItem[];
  valorVidasEmpresas: ValorVidasEmpresaItem[];
  vidasAtivasEmpresas: VidasAtivasEmpresaItem[];
  produtosTabela: ProdutoTabelaItem[];
  empresasAtivacaoTabela: EmpresaAtivacaoTabelaItem[];
  analiseEmpresas: AnaliseEstruturalItem[];
  analiseUnidades: AnaliseEstruturalItem[];
  analiseSetores: AnaliseEstruturalItem[];
  perfilDemografico: PerfilDemografico;
}
