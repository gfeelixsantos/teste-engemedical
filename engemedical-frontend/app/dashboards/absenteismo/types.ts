export type SituacaoAtestado = 'Ativo' | 'Inativo';

export interface AbsenteismoKPIs {
  totalFuncionarios: number;
  totalAtestados: number;
  totalDiasPerdidos: number;
  taxaFrequencia: number;
  taxaGravidade: number;
  indiceAbsenteismo: number;
  custoDireto: number;
  custoIndireto: number;
  custoTotal: number;
  ultimaAtualizacao: string;
}

export interface PorMesLinha {
  mes: string;
  mesNum: number;
  diasPerdidos: number;
  atestados: number;
}

export interface PorEmpresaBar {
  empresa: string;
  custoTotal: number;
  diasPerdidos: number;
}

export interface PorCidBar {
  cid: string;
  descricao: string;
  grupo: string;
  atestados: number;
}

export interface PorTipoBar {
  tipo: string;
  atestados: number;
}

export interface LicencaDetalhe {
  codigoSequencial: string;
  codigoFuncionario: string;
  cpfFuncionario: string;
  matriculaFuncionario: string;
  dataFicha: string;
  dataInicio: string;
  dataFim: string;
  diasPerdidos: number;
  horasAfastado: string;
  tipoAfastamento: string;
  cid: string;
  cidGrupo: string;
  descricaoMotivo: string;
  empresaCodigo: string;
  custoDireto: number;
  custoIndireto: number;
  custoTotal: number;
}

export interface AbsenteismoDashboardData {
  kpis: AbsenteismoKPIs;
  porMes: PorMesLinha[];
  porEmpresa: PorEmpresaBar[];
  porCid: PorCidBar[];
  porTipo: PorTipoBar[];
  detalhes: LicencaDetalhe[];
  empresas: string[];
  totalRegistros: number;
  filtros: {
    empresas: string[];
    dataInicio: string;
    dataFim: string;
  };
}
