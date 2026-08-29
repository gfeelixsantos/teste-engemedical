import {
  ParecerEspaçoConfinado,
  ParecerMedico,
  ParecerTrabalhoAltura,
  TipoExame,
} from 'src/mongo/enum/scheduling.enum';
import { MedicalOpinionRules } from './MedicalOptionsRules';
import {
  LaudoRestricaoData,
  MedicalOpinionData,
  SchedulingDocument,
} from 'src/mongo/types/scheduling';

function createBaseScheduling(): SchedulingDocument {
  return {
    _id: 'dummy-id',
    ATENDIMENTOSTATUS: '',
    ASOSTATUS: '',
    ASOINFO: null,
    SCHEDULINGCODE: '',
    CODIGOPRONTUARIO: '123',
    RISCOSASO: null,
    CODIGOEMPRESA: '000000',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: 'EMPRESA TESTE',
    CODIGO: '1',
    NOME: 'FUNCIONARIO TESTE',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: 'AUXILIAR',
    MATRICULAFUNCIONARIO: '',
    CPFFUNCIONARIO: '',
    SITUACAO: '',
    DATANASCIMENTO: '01/01/1990',
    DATAAGENDAMENTO: '01/01/2025',
    DATAAGENDAMENTO_DATE: new Date(),
    HORARIO: '00:00',
    UNIDADEATENDIMENTO: '',
    SEQUENCIAFICHA: '1',
    TIPOEXAME: TipoExame.ADMISSIONAL,
    TIPOEXAMENOME: 'ADMISSIONAL',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: null,
    RECOMENDACAOMEDICA: null,
    ALTURA_PARECER: null,
    CONFINADO_PARECER: null,
    MEDICO: null,
    ANEXOS: [],
    TERM: false,
    CLIENT: null,
    CREATED: new Date().toISOString(),
    EXAMES: [
      {
        codigoExame: 'CLINICO',
        nomeExame: 'Exame Clínico',
        grupo: 'Exame Clínico',
        status: 'FINALIZADO',
      } as any,
    ],
    TICKET: null,
    TELEFONE: '',
  } as SchedulingDocument;
}

function createOpinion(
  overrides: Partial<MedicalOpinionData>,
): MedicalOpinionData {
  return {
    opinionType: ParecerMedico.APTO,
    details: '',
    isProgrammed: null,
    laudoPCD: null,
    laudoRestricao: null,
    altura: null,
    confinado: null,
    examesParaRepetir: [],
    ...overrides,
  };
}

describe('MedicalOpinionRules - geração de ASO e envio de e-mail', () => {
  it('APTO puro gera ASO e não envia email', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({ opinionType: ParecerMedico.APTO });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(false);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(true);
  });

  it('APTO_COM_ORIENTACAO com justificativa programada gera ASO e não envia PARECER_MEDICO', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_ORIENTACAO,
      details: 'Retorno em 30 dias para reavaliação',
      isProgrammed: true,
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(false);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(true);
  });

  it('APTO_COM_ORIENTACAO com justificativa não programada gera ASO e envia PARECER_MEDICO', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_ORIENTACAO,
      details: 'Texto livre digitado pelo médico',
      isProgrammed: false,
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('APTO_COM_RESTRICAO gera ASO e envia PARECER_MEDICO', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      details: null,
      laudoRestricao: {
        cid: 'M54',
        descricaoCid: 'Dorsalgia',
        restricoes: 'Evitar esforço',
        periodoDias: 30,
        dataInicio: '2024-01-15',
        dataFim: '2024-02-14',
        recomendacoes: 'Repouso',
      },
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('INAPTO não gera ASO e envia email', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.INAPTO,
      details: 'Inapto para a função',
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(false);
    expect(MedicalOpinionRules.getAsoEligibilityReason(options, scheduled)).toBe(
      'parecer INAPTO nao gera ASO',
    );
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('INAPTO_TEMPORARIAMENTE não gera ASO e envia email', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.INAPTO_TEMPORARIAMENTE,
      details: 'Inapto temporariamente',
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(false);
    expect(MedicalOpinionRules.getAsoEligibilityReason(options, scheduled)).toBe(
      'parecer INAPTO_TEMPORARIAMENTE nao gera ASO',
    );
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('Parecer APTO com details não gera ASO (validação front-end) e envia email', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO,
      details: 'Usar EPIs e manter acompanhamento.',
    });

    expect(MedicalOpinionRules.getInvalidOpinionReason(options)).toContain(
      'APTO_COM_ORIENTACAO',
    );
    // Com o novo fluxo, APTO+details gera ASO no backend (validação força APTO_COM_ORIENTACAO no frontend)
    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('Parecer APTO com altura INAPTO não gera ASO (validação) e envia email', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO,
      altura: ParecerTrabalhoAltura.INAPTO_ALTURA,
      details: 'Inapto para trabalho em altura',
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('Parecer APTO com confinado INAPTO não gera ASO (validação) e envia email', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO,
      confinado: ParecerEspaçoConfinado.INAPTO_CONFINADO,
      details: 'Inapto para espaço confinado',
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('APTO com altura APTO libera ASO sem e-mail (sem detalhes)', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO,
      altura: ParecerTrabalhoAltura.APTO_ALTURA,
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(false);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(true);
  });

  it('APTO com altura APTO COM CINTO libera ASO sem e-mail (sem detalhes)', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO,
      altura: ParecerTrabalhoAltura.APTO_ALTURA_CINTO_100KG,
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(false);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(true);
  });

  it('APTO com altura APTO e confinado APTO libera ASO sem e-mail (sem detalhes)', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO,
      altura: ParecerTrabalhoAltura.APTO_ALTURA,
      confinado: ParecerEspaçoConfinado.APTO_CONFINADO,
    });

    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(false);
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(true);
  });
});

describe('MedicalOpinionRules — shouldSendAsoLiberado', () => {
  it('APTO puro → true', () => {
    const options = createOpinion({ opinionType: ParecerMedico.APTO });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(true);
  });

  it('APTO_COM_ORIENTACAO + isProgrammed=true → true', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_ORIENTACAO,
      details: 'Retorno em 30 dias',
      isProgrammed: true,
    });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(true);
  });

  it('APTO_COM_ORIENTACAO + isProgrammed=false → false', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_ORIENTACAO,
      details: 'Texto livre',
      isProgrammed: false,
    });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('APTO_COM_ORIENTACAO sem isProgrammed → false', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_ORIENTACAO,
      details: 'Retorno em 30 dias',
      isProgrammed: null,
    });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('APTO_COM_RESTRICAO → false', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: {
        cid: 'M54',
        descricaoCid: 'Dorsalgia',
        restricoes: 'Evitar esforço',
        periodoDias: 30,
        dataInicio: '2024-01-15',
        dataFim: '2024-02-14',
        recomendacoes: 'Repouso',
      },
    });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('INAPTO → false', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.INAPTO,
      details: 'Inapto',
    });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('INAPTO_TEMPORARIAMENTE → false', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.INAPTO_TEMPORARIAMENTE,
      details: 'Inapto temporariamente',
    });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });
});

describe('MedicalOpinionRules — APTO_COM_RESTRICAO', () => {
  const laudoValido: LaudoRestricaoData = {
    cid: 'M54',
    descricaoCid: 'Dorsalgia',
    restricoes: 'Evitar esforço físico',
    periodoDias: 30,
    dataInicio: '2024-01-15',
    dataFim: '2024-02-14',
    recomendacoes: 'Repouso relativo',
  };

  it('getInvalidOpinionReason: retorna null quando laudoRestricao está preenchido', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: laudoValido,
    });
    expect(MedicalOpinionRules.getInvalidOpinionReason(options)).toBeNull();
  });

  it('getInvalidOpinionReason: retorna erro quando laudoRestricao é null', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: null,
    });
    expect(MedicalOpinionRules.getInvalidOpinionReason(options)).toContain(
      'APTO_COM_RESTRICAO',
    );
  });

  it('shouldCreateAso: retorna true — APTO_COM_RESTRICAO gera ASO (novo fluxo)', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: laudoValido,
    });
    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
  });

  it('getAsoEligibilityReason: retorna null — APTO_COM_RESTRICAO é elegível', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: laudoValido,
    });
    expect(MedicalOpinionRules.getAsoEligibilityReason(options, scheduled)).toBe(
      null,
    );
  });

  it('shouldSendEmail: retorna true — APTO_COM_RESTRICAO sempre envia email', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: laudoValido,
      details: null,
    });
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
  });

  it('shouldSendEmail: retorna true mesmo sem details preenchido', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: laudoValido,
      details: '',
    });
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(true);
  });

  it('shouldSendAsoLiberado: retorna false — APTO_COM_RESTRICAO não libera ASO ao cliente', () => {
    const options = createOpinion({
      opinionType: ParecerMedico.APTO_COM_RESTRICAO,
      laudoRestricao: laudoValido,
    });
    expect(MedicalOpinionRules.shouldSendAsoLiberado(options)).toBe(false);
  });

  it('APTO puro ainda gera ASO (sem regressão)', () => {
    const scheduled = createBaseScheduling();
    const options = createOpinion({ opinionType: ParecerMedico.APTO });
    expect(MedicalOpinionRules.shouldCreateAso(options, scheduled)).toBe(true);
    expect(MedicalOpinionRules.shouldSendEmail(options)).toBe(false);
  });
});

describe('MedicalOpinionRules.validateLaudoRestricao', () => {
  function createBaseLaudoRestricao(
    overrides: Partial<LaudoRestricaoData> = {},
  ): LaudoRestricaoData {
    return {
      cid: 'M54',
      descricaoCid: 'Dorsalgia',
      restricoes: 'Evitar esforço físico',
      periodoDias: 30,
      dataInicio: '2024-01-15',
      dataFim: '2024-02-14',
      recomendacoes: 'Repouso',
      ...overrides,
    };
  }

  it('retorna null para dados válidos (periodoDias=30, dataInicio válida)', () => {
    const laudo = createBaseLaudoRestricao();
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBeNull();
  });

  it('retorna erro quando periodoDias = 0', () => {
    const laudo = createBaseLaudoRestricao({ periodoDias: 0 });
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBe(
      'laudoRestricao.periodoDias deve ser um número inteiro positivo.',
    );
  });

  it('retorna erro quando periodoDias = -1', () => {
    const laudo = createBaseLaudoRestricao({ periodoDias: -1 });
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBe(
      'laudoRestricao.periodoDias deve ser um número inteiro positivo.',
    );
  });

  it('retorna erro quando periodoDias = 1.5 (não inteiro)', () => {
    const laudo = createBaseLaudoRestricao({ periodoDias: 1.5 });
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBe(
      'laudoRestricao.periodoDias deve ser um número inteiro positivo.',
    );
  });

  it('retorna erro quando periodoDias = "30" (string)', () => {
    const laudo = createBaseLaudoRestricao({
      periodoDias: '30' as unknown as number,
    });
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBe(
      'laudoRestricao.periodoDias deve ser um número inteiro positivo.',
    );
  });

  it('retorna null para dataInicio = "2024-01-15" (formato válido)', () => {
    const laudo = createBaseLaudoRestricao({ dataInicio: '2024-01-15' });
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBeNull();
  });

  it('retorna erro quando dataInicio = "15/01/2024" (formato inválido)', () => {
    const laudo = createBaseLaudoRestricao({ dataInicio: '15/01/2024' });
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBe(
      'laudoRestricao.dataInicio deve estar no formato ISO 8601 (YYYY-MM-DD).',
    );
  });

  it('retorna erro quando dataInicio = "" (vazio)', () => {
    const laudo = createBaseLaudoRestricao({ dataInicio: '' });
    expect(MedicalOpinionRules.validateLaudoRestricao(laudo)).toBe(
      'laudoRestricao.dataInicio deve estar no formato ISO 8601 (YYYY-MM-DD).',
    );
  });
});
