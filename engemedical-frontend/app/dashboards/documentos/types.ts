export type TipoDocumento = 'PGR' | 'PCMSO' | 'Outro';
export type StatusVigencia = 'Vigente' | 'AVencer' | 'Vencido';

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
