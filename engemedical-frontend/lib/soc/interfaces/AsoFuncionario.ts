export interface AsoFuncionarioRequest {
  CODIGO: string;
  CODIGOEMPRESA: string;
}

export interface AsoFuncionario {
  IDFICHA: string;
  TPINSCEMPRESA: string;
  NRINSCEMPRESA: string;
  TPINSCUNIDADE: string;
  NRINSCEMPRESAUNIDADE: string;
  CODIGOEMPRESA: string;
  CODIGOFUNCIONARIO: string;
  NMTRAB: string;
  CPFTRAB: string;
  NISTRAB: string;
  MATRICULA: string;
  DATAFICHA: string;
  DTASO: string;
  DTINCLUSAOPARECERASO: string;
  DTULTALTASO: string;
  DSVALIDADEASO: string;
  TPASO: string;
  RESASO: string;
  RESASOSOC: string;
  DTEXAME: string;
  PROCREALIZADO: string;
  INTERPREEXM: string;
  DTINIMONIT: string;
  DTFIMMONIT: string;
  DESCRICAOEXAME: string;
  ORDEXAME: string;
  INDRESULTADOALTNORMAL: string;
  INDRESULTADOAGRAV: string;
  INDRESULTADOESTAVEL: string;
  OBSPROC: string;
  EMAILSERVSAUDE: string;
  CODIGOMEDICO: string;
  NMMED: string;
  NRCRM: string;
  UFCRM: string;
  RHUNIDADE: string;
  RHSETOR: string;
  RHCARGO: string;
  CODIGOEXAME: string;
}

export interface AsoOption {
  sequenciaFicha: string;
  codigoTipoExame: string;
  tipoExameNome: string;
  dataFicha: string;
}

export type AsoFuncionarioDto = {
  IDFICHA: string;
  CODIGOEMPRESA: string;
  CODIGOFUNCIONARIO: string;
  NMTRAB: string;
  DATAFICHA: string;
  DTASO: string;
  TPASO: string;
  RESASO: string;
  RESASOSOC: string;
  DTEXAME: string;
  DESCRICAOEXAME: string;
  CODIGOMEDICO: string;
  NMMED: string;
  NRCRM: string;
  UFCRM: string;
  CODIGOEXAME: string;
};
