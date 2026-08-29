import { ExamStatus } from '../enum/scheduling.enum';
import {
  getExamDownstreamStateLabel,
  isExamReadyForDownstream,
  isFinalSignatureStatus,
} from './exam-downstream-readiness.contract';

describe('backend downstream readiness contract', () => {
  it('releases a signed-required exam when the PDF already exists but PSC auth is still pending', () => {
    expect(
      isExamReadyForDownstream({
        grupo: 'Exame Clinico',
        status: ExamStatus.FINALIZADO,
        url: 'https://storage.local/clinico.pdf',
        signature: {
          documentType: 'EXAME',
          requiresSignature: true,
          status: 'PENDENTE',
        } as any,
      }),
    ).toBe(true);
  });

  it('releases a BRYKMS exam only when signature reached a final state', () => {
    expect(isFinalSignatureStatus('ASSINADO')).toBe(true);
    expect(
      isExamReadyForDownstream({
        grupo: 'Exame Clinico',
        status: ExamStatus.FINALIZADO,
        url: 'https://storage.local/assinado_ExameClinico.pdf',
        signature: {
          documentType: 'EXAME',
          requiresSignature: true,
          status: 'ASSINADO',
          provider: 'BRYKMS',
        } as any,
      }),
    ).toBe(true);
  });

  it('keeps legacy exams without signature object compatible when they already have result url', () => {
    expect(
      isExamReadyForDownstream({
        grupo: 'Espirometria',
        status: ExamStatus.AGUARDANDO_RESULTADO,
        url: 'https://storage.local/espiro.pdf',
      }),
    ).toBe(true);
    expect(
      getExamDownstreamStateLabel({
        grupo: 'Espirometria',
        status: ExamStatus.AGUARDANDO_RESULTADO,
        url: 'https://storage.local/espiro.pdf',
      }),
    ).toContain('Espirometria:AGUARDANDO_RESULTADO:SEM_ASSINATURA:com URL');
  });
});
