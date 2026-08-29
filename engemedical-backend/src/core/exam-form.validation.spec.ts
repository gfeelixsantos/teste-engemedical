import {
  buildMissingExamFormMessage,
  hasMeaningfulExamFormData,
  shouldRequireMeaningfulExamForm,
} from './exam-form.validation';

describe('exam-form.validation', () => {
  it('deve rejeitar formulario ausente, vazio ou apenas com identidade profissional', () => {
    expect(hasMeaningfulExamFormData(null)).toBe(false);
    expect(hasMeaningfulExamFormData(undefined)).toBe(false);
    expect(hasMeaningfulExamFormData({})).toBe(false);
    expect(
      hasMeaningfulExamFormData({
        medico: 'Dra. Andrea',
        codigoMedico: '1',
        profissional: 'Dra. Andrea',
        codigoProfissional: '1',
      }),
    ).toBe(false);
  });

  it('deve aceitar formulario com dados clinicos ou tecnicos relevantes', () => {
    expect(
      hasMeaningfulExamFormData({
        peso: '58',
        altura: '1,75',
      }),
    ).toBe(true);

    expect(
      hasMeaningfulExamFormData({
        observacoes: '',
        pressaoArterial: [
          {
            valor: '111/72',
            horario: '09:20',
          },
        ],
      }),
    ).toBe(true);

    expect(
      hasMeaningfulExamFormData({
        realizarIRF: true,
      }),
    ).toBe(true);
  });

  it('deve considerar falso isolado como nao significativo', () => {
    expect(
      hasMeaningfulExamFormData({
        mascaramentoVAOD250: false,
      }),
    ).toBe(false);
  });

  it('deve exigir validacao significativa para qualquer exame neste rollout', () => {
    expect(shouldRequireMeaningfulExamForm()).toBe(true);
    expect(
      shouldRequireMeaningfulExamForm({
        nome: 'Exame Clínico',
      } as any),
    ).toBe(true);
  });

  it('deve montar mensagem com o grupo quando informado', () => {
    expect(buildMissingExamFormMessage('Exame Clínico')).toContain(
      'grupo Exame Clínico',
    );
    expect(buildMissingExamFormMessage()).toContain('Formulario');
  });
});
