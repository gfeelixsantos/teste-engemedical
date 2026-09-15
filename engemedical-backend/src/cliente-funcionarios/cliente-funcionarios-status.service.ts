import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import {
  FuncionarioStatus,
  ResolvedFuncionarioStatus,
  SchedulingSummary,
} from './cliente-funcionarios.types';

export { SchedulingSummary } from './cliente-funcionarios.types';

const BUSINESS_ZONE = 'America/Sao_Paulo';

@Injectable()
export class ClienteFuncionariosStatusService {
  resolve(
    employee: CadastroFuncionarioPorSituacao,
    scheduling: SchedulingSummary | null,
    today: Date,
  ): ResolvedFuncionarioStatus {
    const schedulingStatus = this.normalizeStatus(scheduling?.atendimentoStatus);
    const schedulingStatuses = new Set<FuncionarioStatus>([
      'ATENDIMENTO',
      'AGUARDANDO_RESULTADOS',
      'AVALIACAO_MEDICA',
      'AGENDADO',
    ]);

    if (schedulingStatuses.has(schedulingStatus as FuncionarioStatus)) {
      return this.result(
        schedulingStatus as FuncionarioStatus,
        scheduling,
        this.reasonForScheduling(schedulingStatus as FuncionarioStatus),
      );
    }

    const examDates = [
      this.readDate((employee as CadastroFuncionarioPorSituacao & { DTASO?: unknown }).DTASO),
      ...(scheduling?.examDates ?? []).map((value) => this.readDate(value)),
    ].filter((value): value is DateTime => value !== null);

    if (examDates.length === 0) {
      return this.result('PENDENTE', scheduling, this.reasonWithoutHistory(employee, scheduling));
    }

    const latestExam = examDates.reduce((latest, current) =>
      current.toMillis() > latest.toMillis() ? current : latest,
    );
    const todayDate = this.toCalendarDay(today);
    const oneYearAgo = todayDate.minus({ years: 1 });
    const elevenMonthsAgo = todayDate.minus({ months: 11 });

    if (latestExam.toMillis() < oneYearAgo.toMillis()) {
      return this.result('EXPIRADO', scheduling, this.reasonFor('EXPIRADO', employee, scheduling));
    }

    if (latestExam.toMillis() <= elevenMonthsAgo.toMillis()) {
      return this.result('EXPIRANDO', scheduling, this.reasonFor('EXPIRANDO', employee, scheduling));
    }

    return this.result('VALIDO', scheduling, this.reasonFor('VALIDO', employee, scheduling));
  }

  private result(
    status: FuncionarioStatus,
    scheduling: SchedulingSummary | null,
    statusReason: string,
  ): ResolvedFuncionarioStatus {
    return {
      status,
      statusLabel: this.label(status),
      statusReason,
      schedulingId: scheduling?.id ?? null,
      schedulingDate: this.formatDate(scheduling?.schedulingDate),
    };
  }

  private normalizeStatus(value: unknown): string {
    return String(value ?? '').trim().toUpperCase();
  }

  private readDate(value: unknown): DateTime | null {
    if (value instanceof Date) {
      return this.toCalendarDay(value);
    }
    if (typeof value !== 'string' || !value.trim()) return null;

    const text = value.trim();
    const date = /^\d{2}\/\d{2}\/\d{4}$/.test(text)
      ? DateTime.fromFormat(text, 'dd/MM/yyyy', { zone: BUSINESS_ZONE })
      : DateTime.fromISO(text, { zone: BUSINESS_ZONE });

    return date.isValid ? date.startOf('day') : null;
  }

  private toCalendarDay(value: Date): DateTime {
    return DateTime.fromJSDate(value, { zone: BUSINESS_ZONE }).startOf('day');
  }

  private formatDate(value: string | Date | null | undefined): string | null {
    const parsed = this.readDate(value);
    return parsed?.toFormat('dd/MM/yyyy') ?? null;
  }

  private label(status: FuncionarioStatus): string {
    return {
      ATENDIMENTO: 'Em atendimento',
      AGUARDANDO_RESULTADOS: 'Aguardando resultados',
      AVALIACAO_MEDICA: 'Avaliação médica',
      AGENDADO: 'Agendado',
      PENDENTE: 'Pendente',
      EXPIRADO: 'Expirado',
      EXPIRANDO: 'Expirando',
      VALIDO: 'Válido',
    }[status];
  }

  private reasonForScheduling(status: FuncionarioStatus): string {
    return {
      ATENDIMENTO: 'Atendimento em andamento.',
      AGUARDANDO_RESULTADOS: 'Aguardando resultados de exames.',
      AVALIACAO_MEDICA: 'Aguardando avaliação médica.',
      AGENDADO: 'Exame agendado.',
    }[status];
  }

  private reasonWithoutHistory(
    employee: CadastroFuncionarioPorSituacao,
    scheduling: SchedulingSummary | null,
  ): string {
    const context = this.examContext(employee, scheduling);
    return context === 'DEMISSIONAL'
      ? 'Exame demissional pendente.'
      : 'Sem histórico de exame.';
  }

  private reasonFor(
    status: 'EXPIRADO' | 'EXPIRANDO' | 'VALIDO',
    employee: CadastroFuncionarioPorSituacao,
    scheduling: SchedulingSummary | null,
  ): string {
    const context = this.examContext(employee, scheduling);
    const suffix = context === 'DEMISSIONAL' ? ' Exame demissional.' : '';
    return {
      EXPIRADO: `Último exame há mais de um ano.${suffix}`,
      EXPIRANDO: `Último exame entre onze meses e um ano.${suffix}`,
      VALIDO: `Último exame dentro da validade.${suffix}`,
    }[status];
  }

  private examContext(
    employee: CadastroFuncionarioPorSituacao,
    scheduling: SchedulingSummary | null,
  ): 'DEMISSIONAL' | 'VIDA' | 'NAO_VIDA' | null {
    const values = [
      (employee as CadastroFuncionarioPorSituacao & { TPASO?: unknown }).TPASO,
      (employee as CadastroFuncionarioPorSituacao & {
        TIPOEXAME?: unknown;
        TIPOEXAMENOME?: unknown;
        TIPOASO?: unknown;
      }).TIPOEXAME,
      (employee as CadastroFuncionarioPorSituacao & {
        TIPOEXAME?: unknown;
        TIPOEXAMENOME?: unknown;
        TIPOASO?: unknown;
      }).TIPOEXAMENOME,
      (employee as CadastroFuncionarioPorSituacao & {
        TIPOEXAME?: unknown;
        TIPOEXAMENOME?: unknown;
        TIPOASO?: unknown;
      }).TIPOASO,
      scheduling?.examType,
      scheduling?.examTypeCode,
      scheduling?.examTypeName,
    ]
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter(Boolean);
    if (values.some((value) => value.includes('DEMISSIONAL'))) return 'DEMISSIONAL';
    if (values.some((value) => value === 'NAO_VIDA' || value.includes('NAO VIDA'))) {
      return 'NAO_VIDA';
    }
    if (values.some((value) => value.includes('VIDA'))) return 'VIDA';
    return values.length > 0 ? 'NAO_VIDA' : null;
  }
}
