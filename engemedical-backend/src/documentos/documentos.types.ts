// Raw type from SOC "Controle Vencimentos Documentos/Servicos" (codigo 217483)
export interface SocControleVencimento {
  codigoEmpresa: string;
  nomeEmpresa: string;
  codigoUnidade: string;
  nomeUnidade: string;
  statusUnidade: string;
  cnpjUnidade: string;
  codigoProduto: string;
  nomeProduto: string;
  dataVencimento: string;
  situacao: string;
  dataRealizacaoUltimoServicoRealizado: string;
  dataPrevisaoUltimoServicoRealizado: string;
  observacaoUltimoServicoRealizado: string;
  legenda: string;
  grauRisco: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  estado: string;
  cnae: string;
  cnae_2_0: string;
  cnae_7: string;
}

export type TipoDocumento = 'PGR' | 'PCMSO' | 'Outro';
export type StatusVigencia = 'Vigente' | 'AVencer' | 'Vencido';

export interface RegistroDocumento {
  codigoEmpresa: string;
  empresa: string;
  codigoUnidade: string;
  unidade: string;
  cnpj: string;
  produto: string;
  tipoDocumento: TipoDocumento;
  dataVencimento: string;
  situacao: string;
  vigenciaContrato: StatusVigencia;
  ultimaEntrega: string;
  previsao: string;
  observacao: string;
  grauRisco: string;
  cidade: string;
  estado: string;
}

export interface DocumentosKPIs {
  totalDocumentos: number;
  totalPGR: number;
  totalPCMSO: number;
  vigentes: number;
  aVencer: number;
  vencidos: number;
  percentualVigentes: number;
}

export interface VigenciaPorTipoItem {
  tipo: string;
  vigentes: number;
  aVencer: number;
  vencidos: number;
}

export interface VigenciaPorUnidadeItem {
  unidade: string;
  vigentes: number;
  aVencer: number;
  vencidos: number;
}

export interface StatusDocumentoItem {
  status: string;
  quantidade: number;
}

export interface AcaoPgr {
  empresa: string;
  unidade: string;
  acao: string;
  descricao: string;
  anexos: string;
  situacao: string;
  categoria: string;
  prioridade: 'Imediata' | 'Alta' | 'Média' | 'Baixa' | string;
  periodo: string;
  responsavel: string;
  perigosRiscos: string;
}

export interface AcoesPgrSectionData {
  totalAcoes: number;
  porSituacao: { situacao: string; qtd: number }[];
  porNomeAcao: { acao: string; qtd: number }[];
  prioridades: { imediata: number; alta: number; media: number; baixa: number };
  porCategoria: { categoria: string; qtd: number }[];
  porResponsavel: { responsavel: string; qtd: number }[];
  porEmpresa: { empresa: string; qtd: number }[];
  porUnidade: { unidade: string; qtd: number }[];
  lista: AcaoPgr[];
}

export interface DocumentosDashboardData {
  success: boolean;
  kpis: DocumentosKPIs;
  vigenciaGeral: { label: string; value: number; color: string }[];
  documentosPorTipo: { tipo: string; qtd: number }[];
  vigenciaPorTipo: VigenciaPorTipoItem[];
  vigenciaPorUnidade: VigenciaPorUnidadeItem[];
  vigenciaPorUnidadePGR: VigenciaPorUnidadeItem[];
  vigenciaPorUnidadePCMSO: VigenciaPorUnidadeItem[];
  statusDocumentos: StatusDocumentoItem[];
  registros: RegistroDocumento[];
  acoesPgr?: AcoesPgrSectionData;
  meta: { dataBase: string; fonte: string };
  filtros: { empresas: string[]; unidades: string[]; tipos: string[] };
}

