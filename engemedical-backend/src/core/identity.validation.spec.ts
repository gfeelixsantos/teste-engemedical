import { HttpStatus } from '@nestjs/common';

import { ExamsScheduled } from 'src/mongo/types/scheduling';
import { UserSignatureSettings } from 'src/signature/signature.service';
import { IUserInfo } from 'src/user/interfaces/user.interface';

import {
  assertProfessionalIdentityAvailable,
  assertProfessionalMismatch,
  hasMinimumProfessionalIdentity,
  IdentityValidator,
  requiresStrictProfessionalIdentityForGroup,
} from './identity.validation';
import {
  resolveAsoFinishProfessionalIdentity,
  resolveProfessionalIdentity,
} from './professional-identity.resolver';

describe('IdentityValidator', () => {
  const mockUser: IUserInfo = {
    codigo: '123',
    nome: 'Dr. Teste',
  } as any;

  const mockSettings: UserSignatureSettings = {
    id: '1',
    user_codigo: '123',
    assina_digitalmente: true,
    assinatura_imagem_url: 'url',
    psc_padrao: 'bry',
    assinatura_posicao: null,
  };

  const mockExam: ExamsScheduled = {
    codigoExame: 'EX1',
    nomeExame: 'Exame 1',
    status: 'FINALIZADO',
    codigoProfissional: '123',
    profissional: 'Dr. Teste',
  };

  it('deve retornar true se todos os codigos forem compativeis', () => {
    const result = IdentityValidator.validateProfessionalIdentity(
      mockUser,
      mockSettings,
      mockExam,
    );
    expect(result).toBe(true);
  });

  it('deve retornar false se user.codigo != supabase.user_codigo', () => {
    const badSettings = { ...mockSettings, user_codigo: '999' };
    const result = IdentityValidator.validateProfessionalIdentity(
      mockUser,
      badSettings,
      mockExam,
    );
    expect(result).toBe(false);
  });

  it('deve retornar false se exam.codigoProfissional != user.codigo', () => {
    const badExam = { ...mockExam, codigoProfissional: '999' };
    const result = IdentityValidator.validateProfessionalIdentity(
      mockUser,
      mockSettings,
      badExam,
    );
    expect(result).toBe(false);
  });

  it('deve retornar false quando a identidade minima do exame estiver ausente', () => {
    const badExam = {
      ...mockExam,
      codigoProfissional: undefined,
      profissional: undefined,
    };
    const result = IdentityValidator.validateProfessionalIdentity(
      mockUser,
      mockSettings,
      badExam,
    );
    expect(result).toBe(false);
  });
});

describe('identity runtime validation', () => {
  it('deve reconhecer grupos com enforcement imediato', () => {
    expect(requiresStrictProfessionalIdentityForGroup('Exame Clínico')).toBe(
      true,
    );
    expect(requiresStrictProfessionalIdentityForGroup('Audiometria')).toBe(
      true,
    );
    expect(requiresStrictProfessionalIdentityForGroup('Triagem')).toBe(false);
  });

  it('deve considerar identidade minima quando codigo e nome estiverem presentes', () => {
    expect(
      hasMinimumProfessionalIdentity({
        codigo: '123',
        nome: 'Dr. Teste',
      }),
    ).toBe(true);
    expect(
      hasMinimumProfessionalIdentity({
        codigo: '123',
        nome: '',
      }),
    ).toBe(false);
  });

  it('deve lancar 409 quando auth e body divergirem', () => {
    try {
      assertProfessionalMismatch({
        route: 'schedulings/exame/update',
        grupo: 'Exame Clínico',
        authUser: { codigo: '1', nome: 'Dr. A' } as any,
        bodyProfessional: { codigo: '2', nome: 'Dr. B' } as any,
        enforced: true,
      });
      throw new Error('era esperado lancar HttpException');
    } catch (error: any) {
      expect(error?.getStatus?.()).toBe(HttpStatus.CONFLICT);
    }
  });

  it('deve lancar 422 quando identidade obrigatoria estiver insuficiente', () => {
    try {
      assertProfessionalIdentityAvailable({
        route: 'schedulings/finish',
        grupo: 'ASO',
        professional: { codigo: '123', nome: '' },
        required: true,
        enforced: true,
      });
      throw new Error('era esperado lancar HttpException');
    } catch (error: any) {
      expect(error?.getStatus?.()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    }
  });

  it('nao deve lancar quando o grupo nao exigir enforcement imediato', () => {
    expect(() =>
      assertProfessionalIdentityAvailable({
        route: 'schedulings/exame/update',
        grupo: 'Triagem',
        professional: null,
        required: false,
        enforced: false,
      }),
    ).not.toThrow();
  });

  it('deve priorizar body > authUser > snapshot do exame > legado do exame na resolucao profissional', () => {
    const existingExam = {
      codigoProfissional: '100',
      profissional: 'Dr. Legado',
      professional: {
        codigo: '150',
        nome: 'Dra. Snapshot',
        cpf: '12345678900',
        conselho: 'CRM',
        ufconselho: 'SP',
      },
    } as any;

    const resolvedWithLegacy = resolveProfessionalIdentity({
      route: 'EXAME_UPDATE',
      authUser: null,
      bodyProfessional: { codigo: '200', nome: 'Dr. Body' } as any,
      existingExam,
    });

    const resolvedWithoutBody = resolveProfessionalIdentity({
      route: 'EXAME_UPDATE',
      authUser: null,
      bodyProfessional: null,
      existingExam,
    });

    const resolvedWithAuth = resolveProfessionalIdentity({
      route: 'EXAME_UPDATE',
      authUser: { codigo: '300', nome: 'Dr. Auth' } as any,
      bodyProfessional: { codigo: '200', nome: 'Dr. Body' } as any,
      existingExam,
    });

    const resolvedWithSnapshot = resolveProfessionalIdentity({
      route: 'EXAME_UPDATE',
      authUser: null,
      bodyProfessional: null,
      existingExam,
    });

    expect(resolvedWithLegacy?.codigo).toBe('200');
    expect(resolvedWithoutBody?.codigo).toBe('150');
    expect(resolvedWithAuth?.codigo).toBe('200');
    expect(resolvedWithSnapshot?.codigo).toBe('150');
  });

  it('deve priorizar medico clinico > authUser > body na resolucao do ASO', () => {
    const resolvedWithClinical = resolveAsoFinishProfessionalIdentity({
      authUser: null,
      clinicalProfessional: { codigo: '1698', nome: 'Dr. Clinico' } as any,
      bodyProfessional: { codigo: '1727', nome: 'Dra. Acuidade' } as any,
    });

    const resolvedWithAuth = resolveAsoFinishProfessionalIdentity({
      authUser: { codigo: '900', nome: 'Dr. Prontuario' } as any,
      clinicalProfessional: { codigo: '1698', nome: 'Dr. Clinico' } as any,
      bodyProfessional: { codigo: '1727', nome: 'Dra. Acuidade' } as any,
    });

    expect(resolvedWithClinical?.codigo).toBe('1698');
    expect(resolvedWithAuth?.codigo).toBe('1698');
  });

  it('deve completar cpf e conselho do ASO com body/auth quando o clinico vier parcial', () => {
    const resolved = resolveAsoFinishProfessionalIdentity({
      authUser: {
        codigo: '1006',
        nome: 'Amanda de Souza Zanetti',
        cpf: '389.583.238-33',
        conselho: '226402',
        ufconselho: 'SP',
      } as any,
      clinicalProfessional: {
        codigo: '1006',
        nome: 'Amanda de Souza Zanetti',
      } as any,
      bodyProfessional: {
        codigo: '1006',
        nome: 'Amanda de Souza Zanetti',
        cpf: '389.583.238-33',
        conselho: '226402',
        ufconselho: 'SP',
      } as any,
    });

    expect(resolved?.codigo).toBe('1006');
    expect(resolved?.nome).toBe('Amanda de Souza Zanetti');
    expect(resolved?.cpf).toBe('389.583.238-33');
    expect(resolved?.conselho).toBe('226402');
    expect(resolved?.ufconselho).toBe('SP');
  });

  it('nao deve bloquear mismatch quando enforcement estiver desligado', () => {
    expect(() =>
      assertProfessionalMismatch({
        route: 'schedulings/exame/update',
        authUser: { codigo: '1', nome: 'Dr. A' } as any,
        bodyProfessional: { codigo: '2', nome: 'Dr. B' } as any,
        enforced: false,
      }),
    ).not.toThrow();
  });

  it('nao deve bloquear identidade insuficiente quando enforcement estiver desligado', () => {
    expect(() =>
      assertProfessionalIdentityAvailable({
        route: 'schedulings/finish',
        grupo: 'ASO',
        professional: { codigo: '', nome: '' },
        required: true,
        enforced: false,
      }),
    ).not.toThrow();
  });
});
