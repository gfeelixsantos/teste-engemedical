import { createHash } from 'crypto';
import { FileUpload, SchedulingDocument } from './types/scheduling';
import { IUserInfo } from 'src/user/interfaces/user.interface';

export type DeletionActor = {
  codigo: string;
  perfil: string;
  nome?: string;
};

export type DeletionSnapshotRecord = {
  snapshotId: string;
  requestId: string;
  acao: 'EXCLUIR_ATENDIMENTO' | 'REMOVER_ANEXO';
  recursoTipo: 'atendimento' | 'anexo';
  recursoId: string;
  motivo: string;
  snapshot: Record<string, unknown>;
  snapshotHash: string;
  criadoEm: Date;
  criadoPor: DeletionActor;
  schemaVersion: 1;
};

function createSnapshotId(): string {
  return `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : undefined;
}

function pickOperationalDates(document: SchedulingDocument): Record<string, string> {
  const dates: Record<string, string> = {};
  const candidates = [
    ['createdAt', (document as any).createdAt],
    ['updatedAt', (document as any).updatedAt],
    ['dataAgendamento', (document as any).DATAAGENDAMENTO],
    ['dataAtendimento', (document as any).DATAATENDIMENTO],
  ] as const;

  for (const [key, value] of candidates) {
    const normalized = normalizeText(
      value instanceof Date ? value.toISOString() : value,
    );
    if (normalized) {
      dates[key] = normalized;
    }
  }

  return dates;
}

function summarizeExams(document: SchedulingDocument) {
  const exams = Array.isArray(document.EXAMES) ? document.EXAMES : [];
  return exams.slice(0, 20).map((exam) => ({
    codigo: normalizeText((exam as any).codigoExame),
    nome: normalizeText((exam as any).nomeExame),
    status: normalizeText((exam as any).status),
  }));
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)
    .join(',')}}`;
}

export function computeDeletionSnapshotHash(snapshot: Record<string, unknown>): string {
  return createHash('sha256').update(stableSerialize(snapshot)).digest('hex');
}

function baseSnapshot(params: {
  requestId: string;
  acao: 'EXCLUIR_ATENDIMENTO' | 'REMOVER_ANEXO';
  recursoTipo: 'atendimento' | 'anexo';
  recursoId: string;
  motivo: string;
  actor: IUserInfo;
  document: SchedulingDocument;
}) {
  const actor = params.actor;
  return {
    snapshotId: createSnapshotId(),
    requestId: params.requestId,
    recursoTipo: params.recursoTipo,
    recursoId: params.recursoId,
    acao: params.acao,
    motivo: params.motivo,
    criadoEm: new Date(),
    criadoPor: {
      codigo: String(actor.codigo || '').trim(),
      perfil: String(actor.perfil || '').trim(),
      nome: normalizeText(actor.nome),
    },
    unidade:
      normalizeText((params.document as any).UNIDADEATENDIMENTO) ??
      normalizeText((params.document as any).UNIDADE),
    pacienteCodigo:
      normalizeText((params.document as any).CODIGO) ??
      normalizeText((params.document as any).pacienteCodigo),
    pacienteNome:
      normalizeText((params.document as any).NOME) ??
      normalizeText((params.document as any).pacienteNome),
    schemaVersion: 1 as const,
  };
}

export function buildSchedulingDeletionSnapshot(params: {
  requestId: string;
  motivo: string;
  actor: IUserInfo;
  document: SchedulingDocument;
}): DeletionSnapshotRecord {
  const snapshot = {
    ...baseSnapshot({
      requestId: params.requestId,
      acao: 'EXCLUIR_ATENDIMENTO',
      recursoTipo: 'atendimento',
      recursoId: String((params.document as any)._id || ''),
      motivo: params.motivo,
      actor: params.actor,
      document: params.document,
    }),
    resumo: {
      status: normalizeText((params.document as any).ATENDIMENTOSTATUS),
      quantidadeExames: Array.isArray(params.document.EXAMES)
        ? params.document.EXAMES.length
        : 0,
      exames: summarizeExams(params.document),
      possuiAnexos: Array.isArray(params.document.ANEXOS)
        ? params.document.ANEXOS.length > 0
        : false,
      datasOperacionais: pickOperationalDates(params.document),
    },
  };

  const snapshotHash = computeDeletionSnapshotHash(snapshot);

  return {
    snapshotId: snapshot.snapshotId,
    requestId: snapshot.requestId,
    acao: 'EXCLUIR_ATENDIMENTO',
    recursoTipo: 'atendimento',
    recursoId: snapshot.recursoId,
    motivo: snapshot.motivo,
    snapshot,
    snapshotHash,
    criadoEm: snapshot.criadoEm,
    criadoPor: snapshot.criadoPor,
    schemaVersion: 1,
  };
}

export function buildAttachmentDeletionSnapshot(params: {
  requestId: string;
  motivo: string;
  actor: IUserInfo;
  document: SchedulingDocument;
  recursoId: string;
  file?: Partial<FileUpload> | null;
  exam?: Record<string, unknown> | null;
}): DeletionSnapshotRecord {
  const snapshot = {
    ...baseSnapshot({
      requestId: params.requestId,
      acao: 'REMOVER_ANEXO',
      recursoTipo: 'anexo',
      recursoId: params.recursoId,
      motivo: params.motivo,
      actor: params.actor,
      document: params.document,
    }),
    resumo: {
      nomeArquivo:
        normalizeText(params.file?.Name) ??
        normalizeText((params.exam as any)?.nomeArquivo),
      tipoArquivo:
        normalizeText(params.file?.Type) ??
        normalizeText((params.exam as any)?.tipoArquivo),
      exameCodigo: normalizeText((params.exam as any)?.codigoExame),
      exameNome:
        normalizeText((params.exam as any)?.nomeExame) ??
        normalizeText((params.exam as any)?.nome),
      blobPath:
        normalizeText(params.file?.StoragePath) ??
        normalizeText((params.exam as any)?.url),
    },
  };

  const snapshotHash = computeDeletionSnapshotHash(snapshot);

  return {
    snapshotId: snapshot.snapshotId,
    requestId: snapshot.requestId,
    acao: 'REMOVER_ANEXO',
    recursoTipo: 'anexo',
    recursoId: snapshot.recursoId,
    motivo: snapshot.motivo,
    snapshot,
    snapshotHash,
    criadoEm: snapshot.criadoEm,
    criadoPor: snapshot.criadoPor,
    schemaVersion: 1,
  };
}
