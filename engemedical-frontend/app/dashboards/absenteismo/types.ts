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
  atestadosFeminino?: number;
  atestadosMasculino?: number;
  ultimaAtualizacao: string;
}

export interface PorMesLinha {
  mes: string;
  mesNum: number;
  diasPerdidos: number;
  atestados: number;
  indiceAbsenteismo?: number;
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
  percentual: number;
}

export interface PorCidGrupoItem {
  grupo: string;
  diasPerdidos: number;
  cids: string[];
}

export interface PorDiaSemanaItem {
  dia: string;
  diasPerdidos: number;
}

export interface PorFuncionarioItem {
  nome: string;
  atestados: number;
}

export interface PorFaixaEtariaSexoItem {
  faixa: string;
  feminino: number;
  pctFeminino: number;
  masculino: number;
  pctMasculino: number;
}

export interface PorFaixaDiasPerdidosItem {
  faixa: string;
  funcionarios: number;
}

export interface PorUnidadeItem {
  unidade: string;
  atestados: number;
}

export interface PorSetorItem {
  setor: string;
  atestados: number;
}

export interface PorCargoItem {
  cargo: string;
  atestados: number;
}

export interface PorTipoAfastamento {
  tipo: string;
  atestados: number;
  diasPerdidos: number;
}

export interface LicencaNormalizada {
  codigoSequencial: string;
  codigoFuncionario: string;
  nomeFuncionario?: string;
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
  empresaNome?: string;
  unidade?: string;
  setor?: string;
  cargo?: string;
  sexo?: string;
  idade?: number;
  faixaEtaria?: string;
  custoDireto: number;
  custoIndireto: number;
  custoTotal: number;
}

export interface AbsenteismoDashboardData {
  kpis: AbsenteismoKPIs;
  porMes: PorMesLinha[];
  porEmpresa: PorEmpresaBar[];
  porCid: PorCidBar[];
  porCidGrupo: PorCidGrupoItem[];
  diasPorDiaSemana: PorDiaSemanaItem[];
  porFuncionario: PorFuncionarioItem[];
  porFaixaEtariaSexo: PorFaixaEtariaSexoItem[];
  porFaixaDiasPerdidos: PorFaixaDiasPerdidosItem[];
  porUnidade: PorUnidadeItem[];
  porSetor: PorSetorItem[];
  porCargo: PorCargoItem[];
  porTipoAfastamento: PorTipoAfastamento[];
  detalhes: LicencaNormalizada[];
  empresas: string[];
  totalRegistros: number;
  filtros: {
    empresas: string[];
    dataInicio: string;
    dataFim: string;
  };
}
