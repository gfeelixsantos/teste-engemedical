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
  meta: { dataBase: string; fonte: string };
  filtros: { empresas: string[]; unidades: string[]; tipos: string[] };
}
