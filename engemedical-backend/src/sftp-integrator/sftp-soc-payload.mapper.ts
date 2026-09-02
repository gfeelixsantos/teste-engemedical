import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import { GrupoToraParsedRow } from './sftp-spreadsheet-parser';

export type GrupoToraSocPayload = {
  rowNumber: number;
  lookupKey: 'CPF';
  situationToSend: string;
  employee: CadastroFuncionarioPorSituacao;
};

function emptyCadastro(): CadastroFuncionarioPorSituacao {
  return {
    CODIGOEMPRESA: '',
    NOMEEMPRESA: '',
    CODIGO: '',
    NOME: '',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: '',
    CBOCARGO: '',
    CCUSTO: '',
    NOMECENTROCUSTO: '',
    MATRICULAFUNCIONARIO: '',
    CPF: '',
    RG: '',
    UFRG: '',
    ORGAOEMISSORRG: '',
    SITUACAO: '',
    SEXO: '',
    PIS: '',
    CTPS: '',
    SERIECTPS: '',
    ESTADOCIVIL: '',
    TIPOCONTATACAO: '',
    DATA_NASCIMENTO: '',
    DATA_ADMISSAO: '',
    DATA_DEMISSAO: '',
    ENDERECO: '',
    NUMERO_ENDERECO: '',
    BAIRRO: '',
    CIDADE: '',
    UF: '',
    CEP: '',
    TELEFONERESIDENCIAL: '',
    TELEFONECELULAR: '',
    EMAIL: '',
    DEFICIENTE: '',
    DEFICIENCIA: '',
    NM_MAE_FUNCIONARIO: '',
    DATAULTALTERACAO: '',
    MATRICULARH: '',
    COR: '',
    ESCOLARIDADE: '',
    NATURALIDADE: '',
    RAMAL: '',
    REGIMEREVEZAMENTO: '',
    REGIMETRABALHO: '',
    TELCOMERCIAL: '',
    TURNOTRABALHO: '',
    RHUNIDADE: '',
    RHSETOR: '',
    RHCARGO: '',
    RHCCENTROCUSTOUNIDADE: '',
  };
}

export function buildGrupoToraSocPayload(
  row: GrupoToraParsedRow,
): GrupoToraSocPayload {
  const source = row.employee;
  const employee: CadastroFuncionarioPorSituacao = {
    ...emptyCadastro(),
    CODIGOEMPRESA: source.codigoEmpresaProtheus,
    NOME: source.nomeFuncionario,
    CODIGOUNIDADE: source.codigoUnidadeProtheus,
    NOMEUNIDADE: source.nomeUnidadeProtheus,
    CODIGOSETOR: source.codigoSetor,
    NOMESETOR: source.nomeSetor,
    CODIGOCARGO: source.codigoCargo,
    NOMECARGO: source.nomeCargo,
    MATRICULAFUNCIONARIO: source.matriculaRh,
    MATRICULARH: source.matriculaRh,
    CPF: source.cpf,
    SITUACAO: source.situacao,
  };

  return {
    rowNumber: row.rowNumber,
    lookupKey: 'CPF',
    situationToSend: source.situacao,
    employee,
  };
}
