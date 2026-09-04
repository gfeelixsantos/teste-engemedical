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

// Backend types
export interface LicencaNormalizada {
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

export interface AbsenteismoDashboardData {
  kpis: AbsenteismoKPIs;
  porMes: PorMesLinha[];
  porEmpresa: PorEmpresaBar[];
  porCid: PorCidBar[];
  detalhes: LicencaNormalizada[];
  empresas: string[];
  totalRegistros: number;
  filtros: {
    empresas: string[];
    dataInicio: string;
    dataFim: string;
  };
}