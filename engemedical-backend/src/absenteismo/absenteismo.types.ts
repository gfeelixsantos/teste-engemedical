// Raw type from SOC "Licenca Medica V2" (codigo 216645)
export interface SocLicencaMedica {
  abonado: string;
  acidenteTrajeto: string;
  cidContestado: string;
  cids: string;
  codigoEmpresaFuncionario: string;
  codigoFuncionario: string;
  codigoMotivoAfastamento: string;
  nomeSolicitante: string;
  conselhoClasseSolicitante: string;
  siglaConselhoSolicitante: string;
  ufConselhoSolicitante: string;
  codigoPessoaSolicitante: string;
  nomePessoaSolicitante: string;
  conselhoClassePessoaSolicitante: string;
  siglaConselhoClassePessoaSolicitante: string;
  ufConselhoClassePessoaSolicitante: string;
  codigoMedico: string;
  conselhoClasseMedico: string;
  siglaConselhoMedico: string;
  ufConselhoMedico: string;
  codigoSequencialLicenca: string;
  cpfFuncionario: string;
  dataFicha: string;
  dataFimAfastamento: string;
  dataInicioAfastamento: string;
  descricaoMotivo: string;
  especialidade1: string;
  especialidade2: string;
  imprimirCid: string;
  imprimirMotivo: string;
  imprimirSolicitante: string;
  matriculaFuncionario: string;
  tipoDeAfastamento: string;
  codigoSocTipoDeAfastamento: string;
  codigoSocMotivoAfastamento: string;
  motivoLicencaTabela18: string;
  orgaoPublico: string;
  afastamentoHoras: string;
  versaoEsocialFicha: string;
  origemAlteracao: string;
  nrProcessoJudicial: string;
  existeLicencaMesmoMotivo60Dias: string;
  codigoAgrupamentoAfastamento: string;
  tipoProcesso: string;
  cidESocial: string;
  tipoCid: string;
  tipoAcidenteTransito: string;
  dataSolicitacao: string;
  pericia: string;
  restricaoRetorno: string;
  situacaoAtual: string;
  tipoLocalAtendimento: string;
  nomeLocalAtendimento: string;
  dataCriacao: string;
  usuarioResponsavelCriacaoLicenca: string;
  HoraInicio: string;
  HoraFim: string;
  HorasAfastado: string;
  dataUltimaAlteracao: string;
}

// Backend normalized type
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
  sexo?: 'M' | 'F' | string;
  idade?: number;
  faixaEtaria?: string;
  custoDireto: number;
  custoIndireto: number;
  custoTotal: number;
}

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
  // Smartrics layout fields
  totalFuncionariosAfetados?: number;
  mediaDiasPorLicenca?: number;
  custoMensal?: number;
  atestadosFeminino?: number;
  atestadosMasculino?: number;
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
