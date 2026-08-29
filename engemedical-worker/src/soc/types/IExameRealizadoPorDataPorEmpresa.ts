export type ExamesRealizadosPorDataExamesPorEmpresaRequest = {
  empresa: string;
  dataInicio?: string;
  dataFim?: string;
};

export type ExameRealizadoPorDataPorEmpresa = {
  EMPRESA: string;
  CODFUNCIONARIO: string;
  NOMEFUNCIONARIO: string;
  MATRICULA: string;
  DATAFICHA: string;
  TIPOFICHA: string;
  DATAEXAME: string;
  CODEXAME: string;
  NOMEEXAME: string;
  EXAMEALTERADO: string;
  SAIASO: string;
  UNIDADE: string;
  SETOR: string;
  CARGO: string;
  CPF: string;
  CODIGOSEQUENCIALFICHA: string;
  CODIGOSEQUENCIALRESULTADO: string;
  PARECERASO: string;
};
