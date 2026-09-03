import { Inject, Injectable, Optional } from '@nestjs/common';
import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import {
  FuncionarioModelo2HierarchyUpdate,
  WsFuncionarioModelo2,
} from 'src/soc/webservice/funcionario/WsFuncionarioModelo2';
import type { GrupoToraSocPayload } from './sftp-soc-payload.mapper';
import { SftpSocEmployeeLookupService } from './sftp-soc-employee-lookup.service';

export type FuncionarioModelo2Caller = (
  employee: CadastroFuncionarioPorSituacao,
  options: {
    lookupKey: 'CPF';
    overwriteSituacao: string;
    auditObservation: string;
    hierarchyUpdate?: FuncionarioModelo2HierarchyUpdate;
  },
) => Promise<{
  status: number;
  responseText: string;
  xml: string;
  data?: {
    success?: boolean;
    encontrouErro?: boolean;
    descricaoErro?: string | null;
    error?: string | null;
    codigoFuncionario?: string | null;
    observacao?: string | null;
  };
}>;

export type SftpSocProcessOptions = {
  limit: number;
  delayMs: number;
  lookupCompanyCode?: string;
};

export type SftpSocProcessRowResult = {
  rowNumber: number;
  cpf: string;
  maskedCpf: string;
  nomeFuncionario: string;
  matriculaRh: string;
  codigoFuncionario?: string;
  codigoEmpresaSoc?: string;
  lookupKey: 'CPF';
  situationToSend: string;
  success: boolean;
  httpStatus?: number;
  error?: string;
};

function defaultDelay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function maskCpf(value: string): string {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length <= 4) return cpf;
  return `${'*'.repeat(cpf.length - 4)}${cpf.slice(-4)}`;
}

function valueOrUndefined(value: string | undefined): string | undefined {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function overlaySpreadsheetEmployee(
  socEmployee: CadastroFuncionarioPorSituacao,
  spreadsheetEmployee: CadastroFuncionarioPorSituacao,
): CadastroFuncionarioPorSituacao {
  return {
    ...socEmployee,
    NOME: spreadsheetEmployee.NOME || socEmployee.NOME,
    CODIGOUNIDADE:
      spreadsheetEmployee.CODIGOUNIDADE || socEmployee.CODIGOUNIDADE,
    NOMEUNIDADE: spreadsheetEmployee.NOMEUNIDADE || socEmployee.NOMEUNIDADE,
    CODIGOSETOR: spreadsheetEmployee.CODIGOSETOR || socEmployee.CODIGOSETOR,
    NOMESETOR: spreadsheetEmployee.NOMESETOR || socEmployee.NOMESETOR,
    CODIGOCARGO: spreadsheetEmployee.CODIGOCARGO || socEmployee.CODIGOCARGO,
    NOMECARGO: spreadsheetEmployee.NOMECARGO || socEmployee.NOMECARGO,
    CBOCARGO: spreadsheetEmployee.CBOCARGO || socEmployee.CBOCARGO,
    CCUSTO: spreadsheetEmployee.CCUSTO || socEmployee.CCUSTO,
    MATRICULAFUNCIONARIO:
      spreadsheetEmployee.MATRICULAFUNCIONARIO ||
      socEmployee.MATRICULAFUNCIONARIO,
    MATRICULARH: spreadsheetEmployee.MATRICULARH || socEmployee.MATRICULARH,
    SITUACAO: spreadsheetEmployee.SITUACAO || socEmployee.SITUACAO,
    RHUNIDADE: spreadsheetEmployee.RHUNIDADE || socEmployee.RHUNIDADE,
    RHSETOR: spreadsheetEmployee.RHSETOR || socEmployee.RHSETOR,
    RHCARGO: spreadsheetEmployee.RHCARGO || socEmployee.RHCARGO,
    RHCCENTROCUSTOUNIDADE:
      spreadsheetEmployee.RHCCENTROCUSTOUNIDADE ||
      socEmployee.RHCCENTROCUSTOUNIDADE,
  };
}

function buildHierarchyUpdate(
  employee: CadastroFuncionarioPorSituacao,
): FuncionarioModelo2HierarchyUpdate {
  return {
    atualizarCargo: true,
    atualizarCentroCusto: true,
    atualizarFuncionario: true,
    atualizarSetor: true,
    atualizarUnidade: true,
    criarHistorico: true,
    unidade: {
      tipoBusca: 'CODIGO_RH',
      codigoRh: valueOrUndefined(employee.RHUNIDADE || employee.CODIGOUNIDADE),
    },
    setor: {
      tipoBusca: 'CODIGO_RH',
      codigoRh: valueOrUndefined(employee.RHSETOR || employee.CODIGOSETOR),
    },
    cargo: {
      tipoBusca: 'CODIGO_RH',
      codigoRh: valueOrUndefined(employee.RHCARGO || employee.CODIGOCARGO),
      cbo: valueOrUndefined(employee.CBOCARGO),
    },
    centroCusto: {
      tipoBusca: 'CODIGO_RH',
      codigoRh: valueOrUndefined(
        employee.RHCCENTROCUSTOUNIDADE || employee.CCUSTO,
      ),
    },
  };
}

@Injectable()
export class SftpSocProcessor {
  constructor(
    @Optional()
    @Inject('SFTP_SOC_FUNCIONARIO_MODELO2')
    private readonly callFuncionarioModelo2: FuncionarioModelo2Caller = WsFuncionarioModelo2 as FuncionarioModelo2Caller,
    @Optional()
    @Inject('SFTP_SOC_DELAY')
    private readonly delay: (ms: number) => Promise<void> = defaultDelay,
    private readonly employeeLookup: SftpSocEmployeeLookupService,
  ) {}

  async process(
    payloads: GrupoToraSocPayload[],
    options: SftpSocProcessOptions,
  ) {
    const safeLimit = Math.max(Number(options.limit) || 0, 0);
    const selected = payloads.slice(0, safeLimit);
    const rows: SftpSocProcessRowResult[] = [];

    for (let index = 0; index < selected.length; index++) {
      const payload = selected[index];
      try {
        const lookupResults = await this.employeeLookup.findByCpf(
          payload.employee.CPF,
          { companyCode: options.lookupCompanyCode },
        );
        if (!lookupResults.length) {
          rows.push({
            rowNumber: payload.rowNumber,
            cpf: payload.employee.CPF,
            maskedCpf: maskCpf(payload.employee.CPF),
            nomeFuncionario: payload.employee.NOME,
            matriculaRh: payload.employee.MATRICULARH,
            lookupKey: payload.lookupKey,
            situationToSend: payload.situationToSend,
            success: false,
            error: 'Cadastro SOC nao encontrado para o CPF',
          });
          continue;
        }

        for (const lookup of lookupResults) {
          const employeeToSend = overlaySpreadsheetEmployee(
            lookup.employee,
            payload.employee,
          );
          const response = await this.callFuncionarioModelo2(employeeToSend, {
            lookupKey: payload.lookupKey,
            overwriteSituacao: payload.situationToSend,
            auditObservation: `Integrado Engemedical Connect em ${new Date().toLocaleString('pt-BR')}`,
            hierarchyUpdate: buildHierarchyUpdate(employeeToSend),
          });
          const functionalSuccess =
            response.data?.success !== false && !response.data?.encontrouErro;
          rows.push({
            rowNumber: payload.rowNumber,
            cpf: employeeToSend.CPF,
            maskedCpf: maskCpf(employeeToSend.CPF),
            nomeFuncionario: employeeToSend.NOME,
            matriculaRh: employeeToSend.MATRICULARH,
            codigoFuncionario: employeeToSend.CODIGO,
            codigoEmpresaSoc: employeeToSend.CODIGOEMPRESA,
            lookupKey: payload.lookupKey,
            situationToSend: payload.situationToSend,
            success: functionalSuccess,
            httpStatus: response.status,
            error: functionalSuccess
              ? undefined
              : response.data?.descricaoErro ||
                response.data?.error ||
                'Erro funcional retornado pelo SOC',
          });
        }
      } catch (error) {
        rows.push({
          rowNumber: payload.rowNumber,
          cpf: payload.employee.CPF,
          maskedCpf: maskCpf(payload.employee.CPF),
          nomeFuncionario: payload.employee.NOME,
          matriculaRh: payload.employee.MATRICULARH,
          lookupKey: payload.lookupKey,
          situationToSend: payload.situationToSend,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (options.delayMs > 0 && index < selected.length - 1) {
        await this.delay(options.delayMs);
      }
    }

    return {
      rows,
      summary: {
        totalSelected: selected.length,
        success: rows.filter((row) => row.success).length,
        failed: rows.filter((row) => !row.success).length,
        skippedByLimit: Math.max(payloads.length - selected.length, 0),
        delayMs: options.delayMs,
      },
    };
  }
}
