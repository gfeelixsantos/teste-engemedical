import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import { WsFuncionarioModelo2 } from 'src/soc/webservice/funcionario/WsFuncionarioModelo2';
import type { GrupoToraSocPayload } from './sftp-soc-payload.mapper';
import { SftpSocEmployeeLookupService } from './sftp-soc-employee-lookup.service';

export type FuncionarioModelo2Caller = (
  employee: CadastroFuncionarioPorSituacao,
  options: {
    lookupKey: 'CPF';
    overwriteSituacao: string;
    auditObservation: string;
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
  nomeSetor: string;
  nomeCargo: string;
  matriculaRh: string;
  codigoFuncionario?: string;
  codigoEmpresaSoc?: string;
  lookupKey: 'CPF';
  situationToSend: string;
  success: boolean;
  notInBase?: boolean;
  httpStatus?: number;
  error?: string;
  xml?: string;
  responseText?: string;
};

function defaultDelay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function maskCpf(value: string): string {
  const cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length <= 4) return cpf;
  return `${'*'.repeat(cpf.length - 4)}${cpf.slice(-4)}`;
}

@Injectable()
export class SftpSocProcessor {
  private readonly logger = new Logger(SftpSocProcessor.name);

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

    this.logger.log(
      `[SOC_PROCESSOR] Iniciando processamento de ${selected.length} funcionarios (limite: ${safeLimit})`,
    );

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
            nomeSetor: payload.employee.NOMESETOR || '',
            nomeCargo: payload.employee.NOMECARGO || '',
            matriculaRh: payload.employee.MATRICULARH,
            lookupKey: payload.lookupKey,
            situationToSend: payload.situationToSend,
            success: false,
            notInBase: true,
            error: 'Cadastro SOC nao encontrado para o CPF',
          });
          continue;
        }

        for (const lookup of lookupResults) {
          const response = await this.callFuncionarioModelo2(lookup.employee, {
            lookupKey: payload.lookupKey,
            overwriteSituacao: payload.situationToSend,
            auditObservation: `Integrado Engemedical Connect em ${new Date().toLocaleString('pt-BR')}`,
          });
          const functionalSuccess =
            response.data?.success !== false && !response.data?.encontrouErro;
          rows.push({
            rowNumber: payload.rowNumber,
            cpf: lookup.employee.CPF,
            maskedCpf: maskCpf(lookup.employee.CPF),
            nomeFuncionario: lookup.employee.NOME,
            nomeSetor: payload.employee.NOMESETOR || '',
            nomeCargo: payload.employee.NOMECARGO || '',
            matriculaRh: lookup.employee.MATRICULARH,
            codigoFuncionario: lookup.employee.CODIGO,
            codigoEmpresaSoc: lookup.employee.CODIGOEMPRESA,
            lookupKey: payload.lookupKey,
            situationToSend: payload.situationToSend,
            success: functionalSuccess,
            httpStatus: response.status,
            error: functionalSuccess
              ? undefined
              : response.data?.descricaoErro ||
                response.data?.error ||
                'Erro funcional retornado pelo SOC',
            xml: response.xml,
            responseText: response.responseText,
          });
        }
      } catch (error) {
        rows.push({
          rowNumber: payload.rowNumber,
          cpf: payload.employee.CPF,
          maskedCpf: maskCpf(payload.employee.CPF),
          nomeFuncionario: payload.employee.NOME,
          nomeSetor: payload.employee.NOMESETOR || '',
          nomeCargo: payload.employee.NOMECARGO || '',
          matriculaRh: payload.employee.MATRICULARH,
          lookupKey: payload.lookupKey,
          situationToSend: payload.situationToSend,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Log progresso a cada 10 registros
      if ((index + 1) % 10 === 0 || index === selected.length - 1) {
        const success = rows.filter((r) => r.success).length;
        const failed = rows.filter((r) => !r.success && !r.notInBase).length;
        const notInBase = rows.filter((r) => r.notInBase).length;
        this.logger.log(
          `[SOC_PROCESSOR] Progresso: ${index + 1}/${selected.length} ` +
          `(sucesso: ${success}, falhas: ${failed}, naoBase: ${notInBase})`,
        );
      }

      // Delay randômico entre chamadas
      const delayMs = Math.floor(Math.random() * 700) + 100;
      if (index < selected.length - 1) {
        await this.delay(delayMs);
      }
    }

    const success = rows.filter((r) => r.success).length;
    const failed = rows.filter((r) => !r.success && !r.notInBase).length;
    const notInBase = rows.filter((r) => r.notInBase).length;

    this.logger.log(
      `[SOC_PROCESSOR] Processamento concluido: ${selected.length} processados | ` +
      `sucesso: ${success} | falhas: ${failed} | naoBase: ${notInBase}`,
    );

    return {
      rows,
      summary: {
        totalRows: payloads.length,
        totalSelected: selected.length,
        success,
        failed,
        notInBase,
        skippedByLimit: Math.max(payloads.length - selected.length, 0),
        delayMs: options.delayMs,
      },
    };
  }
}
