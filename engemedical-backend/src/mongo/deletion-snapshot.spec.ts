import {
  buildAttachmentDeletionSnapshot,
  buildSchedulingDeletionSnapshot,
} from './deletion-snapshot';

const actor = {
  codigo: 'USR-001',
  nome: 'Felix',
  perfil: 'MASTER',
  cpf: '',
  conselho: '',
  ufconselho: '',
};

const schedulingDocument: any = {
  _id: 'sched-123',
  CODIGO: 'PAC-001',
  NOME: 'Paciente Teste',
  UNIDADEATENDIMENTO: 'RIO CLARO',
  ATENDIMENTOSTATUS: 'EM_ATENDIMENTO',
  DATAAGENDAMENTO: '27/05/2026',
  EXAMES: [
    {
      codigoExame: 'EX-001',
      nomeExame: 'Hemograma',
      status: 'FINALIZADO',
      url: 'https://blob/hemograma.pdf',
    },
  ],
  ANEXOS: [
    {
      Name: 'documento.pdf',
      Type: 'application/pdf',
      StoragePath: 'blob/documento.pdf',
    },
  ],
};

describe('deletion-snapshot', () => {
  it('gera snapshot sanitizado para exclusao de atendimento sem payload sensivel', () => {
    const snapshot = buildSchedulingDeletionSnapshot({
        requestId: 'cmso360_1_abc1234',
      motivo: 'cadastro duplicado',
      actor,
      document: schedulingDocument,
    });

    expect(snapshot.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.snapshot.snapshotId).toMatch(/^snapshot_\d+_[a-z0-9]{7}$/);
    expect(snapshot.snapshot).toEqual(
      expect.objectContaining({
      requestId: 'cmso360_1_abc1234',
        acao: 'EXCLUIR_ATENDIMENTO',
        recursoTipo: 'atendimento',
        recursoId: 'sched-123',
        motivo: 'cadastro duplicado',
        resumo: expect.objectContaining({
          quantidadeExames: 1,
          possuiAnexos: true,
        }),
      }),
    );

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('senha');
    expect(serialized).not.toContain('cpf');
  });

  it('gera snapshot sanitizado para remocao de anexo com hash e metadados seguros', () => {
    const snapshot = buildAttachmentDeletionSnapshot({
      requestId: 'cmso360_2_abc1234',
      motivo: 'arquivo incorreto',
      actor,
      document: schedulingDocument,
      recursoId: 'documento.pdf',
      file: schedulingDocument.ANEXOS[0],
      exam: {
        codigoExame: 'EX-001',
        nomeExame: 'Hemograma',
        url: 'https://blob/hemograma.pdf',
      },
    });

    expect(snapshot.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.snapshot).toEqual(
      expect.objectContaining({
        acao: 'REMOVER_ANEXO',
        recursoTipo: 'anexo',
        recursoId: 'documento.pdf',
        resumo: expect.objectContaining({
          nomeArquivo: 'documento.pdf',
          tipoArquivo: 'application/pdf',
          exameCodigo: 'EX-001',
          exameNome: 'Hemograma',
        }),
      }),
    );

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('base64');
    expect(serialized).not.toContain('template');
    expect(serialized).not.toContain('password');
  });
});
