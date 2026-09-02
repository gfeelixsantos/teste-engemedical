import { Injectable } from '@nestjs/common';
import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import {
  buildSocExportDataUrl,
  getSocExportCredentials,
} from 'src/soc/utils/soc-export-data-url';

export type SftpSocEmployeeLookupRecord = {
  CODIGOEMPRESA?: string;
  NOMEEMPRESA?: string;
  EMPRESASOCNET?: string;
  CODIGO?: string;
  NOME?: string;
  CODIGOUNIDADE?: string;
  NOMEUNIDADE?: string;
  CODIGOSETOR?: string;
  NOMESETOR?: string;
  CODIGOCARGO?: string;
  NOMECARGO?: string;
  CBOCARGO?: string;
  MATRICULAFUNCIONARIO?: string;
  MATRICULARHFUNCIONARIO?: string;
  CPFFUNCIONARIO?: string;
  SITUACAO?: string;
  DATA_NASCIMENTO?: string;
  DATA_ADMISSAO?: string;
  DATA_DEMISSAO?: string;
  DATA_INATIVACAO?: string;
  ENDERECO?: string;
  NUMERO_ENDERECO?: string;
  BAIRRO?: string;
  UF?: string;
  EMAILCORPORATIVO?: string;
  EMAILPESSOAL?: string;
  TELEFONECELULAR?: string;
  DATACADASTRO?: string;
};

export type SftpSocEmployeeLookupResult = {
  source: SftpSocEmployeeLookupRecord;
  employee: CadastroFuncionarioPorSituacao;
};

export type SftpSocEmployeeLookupOptions = {
  companyCode?: string;
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function digits(value: unknown): string {
  return text(value).replace(/\D/g, '');
}

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

function mapToCadastroFuncionario(
  source: SftpSocEmployeeLookupRecord,
): CadastroFuncionarioPorSituacao {
  return {
    ...emptyCadastro(),
    CODIGOEMPRESA: text(source.CODIGOEMPRESA),
    NOMEEMPRESA: text(source.NOMEEMPRESA),
    CODIGO: text(source.CODIGO),
    NOME: text(source.NOME),
    CODIGOUNIDADE: text(source.CODIGOUNIDADE),
    NOMEUNIDADE: text(source.NOMEUNIDADE),
    CODIGOSETOR: text(source.CODIGOSETOR),
    NOMESETOR: text(source.NOMESETOR),
    CODIGOCARGO: text(source.CODIGOCARGO),
    NOMECARGO: text(source.NOMECARGO),
    CBOCARGO: text(source.CBOCARGO),
    MATRICULAFUNCIONARIO: text(source.MATRICULAFUNCIONARIO),
    MATRICULARH: text(source.MATRICULARHFUNCIONARIO),
    CPF: digits(source.CPFFUNCIONARIO),
    SITUACAO: text(source.SITUACAO),
    DATA_NASCIMENTO: text(source.DATA_NASCIMENTO),
    DATA_ADMISSAO: text(source.DATA_ADMISSAO),
    DATA_DEMISSAO: text(source.DATA_DEMISSAO),
    ENDERECO: text(source.ENDERECO),
    NUMERO_ENDERECO: text(source.NUMERO_ENDERECO),
    BAIRRO: text(source.BAIRRO),
    UF: text(source.UF),
    TELEFONECELULAR: text(source.TELEFONECELULAR),
    EMAIL: text(source.EMAILCORPORATIVO) || text(source.EMAILPESSOAL),
  };
}

@Injectable()
export class SftpSocEmployeeLookupService {
  async findByCpf(
    cpf: string,
    options: SftpSocEmployeeLookupOptions = {},
  ): Promise<SftpSocEmployeeLookupResult[]> {
    const cleanCpf = digits(cpf);
    const credentials = getSocExportCredentials(
      'SOC_ED_CADASTRO_FUNCIONARIO_CPF',
    );
    const url = buildSocExportDataUrl({
      ...credentials,
      tipoSaida: 'json',
      cpf: cleanCpf,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao consultar cadastro por CPF. status=${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const decoded = new TextDecoder('iso-8859-1').decode(buffer);
    const parsed = JSON.parse(decoded);
    const rows = Array.isArray(parsed) ? parsed : [];
    if (!rows.length) {
      return [];
    }

    const companyCode = text(options.companyCode);
    const filteredRows = rows
      .map((row) => row as SftpSocEmployeeLookupRecord)
      .filter(
        (row) => !companyCode || text(row.CODIGOEMPRESA) === companyCode,
      );

    return filteredRows.map((source) => ({
      source,
      employee: mapToCadastroFuncionario(source),
    }));
  }
}
