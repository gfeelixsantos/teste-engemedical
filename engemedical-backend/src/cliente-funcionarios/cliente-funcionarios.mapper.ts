import { CadastroFuncionarioPorSituacao } from 'src/soc/types/CadastroFuncionarioPorSituacao';
import { DateTime } from 'luxon';
import {
  ClienteFuncionarioItem,
  ResolvedFuncionarioStatus,
} from './cliente-funcionarios.types';

export function mapClienteFuncionario(
  employee: CadastroFuncionarioPorSituacao,
  resolved: ResolvedFuncionarioStatus,
): ClienteFuncionarioItem {
  return {
    codigo: text(employee.CODIGO),
    nome: text(employee.NOME),
    matricula: text(employee.MATRICULAFUNCIONARIO),
    cpfMasked: maskCpf(employee.CPF),
    cargo: text(employee.NOMECARGO),
    unidade: text(employee.NOMEUNIDADE),
    situacao: text(employee.SITUACAO),
    dataAdmissao: normalizeDate(employee.DATA_ADMISSAO),
    dataDemissao: normalizeDate(employee.DATA_DEMISSAO),
    status: resolved.status,
    statusLabel: resolved.statusLabel,
    statusReason: resolved.statusReason,
    schedulingId: resolved.schedulingId,
    schedulingDate: resolved.schedulingDate,
  };
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function maskCpf(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 2 ? `***.***.***-${digits.slice(-2)}` : null;
}

function normalizeDate(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const date = DateTime.fromISO(raw, { zone: 'America/Sao_Paulo' });
  return date.isValid ? date.toFormat('dd/MM/yyyy') : null;
}
