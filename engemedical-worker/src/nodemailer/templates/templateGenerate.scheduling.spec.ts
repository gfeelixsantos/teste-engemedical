import { TemplateGenerate } from './templateGenerate';
import { TemplateNames, type EmailType } from '../types/emailtype';
import { SchedulingDocument } from '../../mongo/types/scheduling';

function makeFuncionario(overrides?: Partial<SchedulingDocument>): SchedulingDocument {
  return {
    _id: 'proc-123',
    ATENDIMENTOSTATUS: '',
    ASOSTATUS: '',
    SCHEDULINGCODE: '',
    CODIGOPRONTUARIO: '',
    RISCOSASO: [],
    CODIGOEMPRESA: '1955530',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: 'A10 SERVICOS LTDA',
    CODIGO: '139',
    NOME: 'EVERTON APARECIDO ALVES GOUVEA CAETANO',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: 'MATRIZ',
    CODIGOSETOR: '',
    NOMESETOR: 'OPERACIONAL',
    CODIGOCARGO: '',
    NOMECARGO: 'CONFERENTE',
    MATRICULAFUNCIONARIO: '',
    CPFFUNCIONARIO: '42514186897',
    SITUACAO: '',
    DATANASCIMENTO: '',
    DATAAGENDAMENTO: '29/05/2026',
    DATAAGENDAMENTO_DATE: new Date('2026-05-29'),
    HORARIO: '09:00',
    UNIDADEATENDIMENTO: 'RIO CLARO',
    SEQUENCIAFICHA: '',
    TIPOEXAME: '3',
    TIPOEXAMENOME: 'RETORNO TRABALHO',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: null,
    RECOMENDACAOMEDICA: null,
    MEDICO: null,
    ANEXOS: [],
    TERM: false,
    CLIENT: {
      _id: 'cli-1',
      Email: 'aline.souza@grupomngt.com.br',
      CPF: '',
      Name: 'Aline Souza',
      Phone: '19982037128',
      Active: true,
      Profile: '',
      Companys: [],
    },
    CREATED: '26/05/2026 12:13:43',
    EXAMES: [
      {
        codigoExame: 'clinico',
        nomeExame: 'Avaliação Clínica Ocupacional (Anamnese e Exame físico) (Cód. eSocial - 0295)',
        preparacao: '',
        status: 'PENDENTE',
      },
    ],
    TICKET: null,
    ...overrides,
  };
}

describe('TemplateGenerate SCHEDULING_CLIENT', () => {
  it('renders client email with employee name and exam type', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'agendamento@cmsocupacional.com.br',
      to: 'aline.souza@grupomngt.com.br',
      subject: 'Agendamento: EVERTON CAETANO',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_CLIENT,
      data: {
        funcionario: makeFuncionario(),
      },
    };

    const rendered = TemplateGenerate.render(mail);

    expect(rendered.template).toContain('EVERTON APARECIDO ALVES GOUVEA CAETANO');
    expect(rendered.template).toContain('RETORNO TRABALHO');
    expect(rendered.template).toContain('29/05/2026');
    expect(rendered.template).toContain('09:00');
    expect(rendered.template).toContain('Rio Claro');
    expect(rendered.template).toContain('Aline Souza');
    expect(rendered.template).toContain('A10 SERVICOS LTDA');
    expect(rendered.template).toContain('CONFERENTE');
    expect(rendered.template).toContain('OPERACIONAL');
    expect(rendered.template).toContain('MATRIZ');
    expect(rendered.template).toContain('425.141.868-97');
    expect(rendered.template).toContain('O que levar');
  });

  it('renders preparation block when exams have preparacao', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'agendamento@cmsocupacional.com.br',
      to: 'cliente@teste.com',
      subject: 'Agendamento: Teste',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_CLIENT,
      data: {
        funcionario: makeFuncionario({
          EXAMES: [
            {
              codigoExame: '51.01.004-6',
              nomeExame: 'AUDIOMETRIA',
              preparacao: 'Manter repouso auditivo de 14 horas antes do exame',
              status: 'PENDENTE',
            },
          ],
        }),
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Preparo para o exame');
    expect(rendered.template).toContain('repouso auditivo');
  });

  it('omits preparation block when no exams have preparacao', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'agendamento@cmsocupacional.com.br',
      to: 'cliente@teste.com',
      subject: 'Agendamento: Teste',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_CLIENT,
      data: {
        funcionario: makeFuncionario({
          EXAMES: [
            {
              codigoExame: 'clinico',
              nomeExame: 'Avaliação Clínica',
              preparacao: '',
              status: 'PENDENTE',
            },
          ],
        }),
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).not.toContain('Preparo para o exame');
  });

  it('shows unit info for Rio Claro', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'agendamento@cmsocupacional.com.br',
      to: 'cliente@teste.com',
      subject: 'Agendamento: Teste',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_CLIENT,
      data: {
        funcionario: makeFuncionario({ UNIDADEATENDIMENTO: 'ARARAS' }),
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Araras');
    expect(rendered.template).toContain('agendamento.araras@cmsocupacional.com.br');
  });
});

describe('TemplateGenerate SCHEDULING_INTERNAL', () => {
  it('renders internal email with employee data and exam checklist', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'aline.souza@grupomngt.com.br',
      to: 'agendamentocmsorioclaro@gmail.com',
      cc: 'preparoagenda.cmso@gmail.com',
      subject: '29/05/2026 - 09:00 - EVERTON CAETANO - A10 SERVICOS LTDA',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_INTERNAL,
      data: {
        funcionario: makeFuncionario(),
      },
    };

    const rendered = TemplateGenerate.render(mail);

    expect(rendered.template).toContain('EVERTON APARECIDO ALVES GOUVEA CAETANO');
    expect(rendered.template).toContain('425.141.868-97');
    expect(rendered.template).toContain('A10 SERVICOS LTDA');
    expect(rendered.template).toContain('CONFERENTE');
    expect(rendered.template).toContain('OPERACIONAL');
    expect(rendered.template).toContain('CÓDIGO SOC');
    expect(rendered.template).toContain('139');
    expect(rendered.template).toContain('CLÍNICO');
    expect(rendered.template).toContain('AUDIOMETRIA');
    expect(rendered.template).toContain('Atendente');
    expect(rendered.template).toContain('Finalização');
  });

  it('shows exam tags for solicited exams (filtra nomes com eSocial)', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'cliente@teste.com',
      to: 'agendamento@cmsocupacional.com.br',
      subject: 'Teste',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_INTERNAL,
      data: {
        funcionario: makeFuncionario({
          EXAMES: [
            {
              codigoExame: '51.01.004-6',
              nomeExame: 'AUDIOMETRIA',
              preparacao: '',
              status: 'PENDENTE',
            },
          ],
        }),
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Exames solicitados');
    expect(rendered.template).toContain('AUDIOMETRIA');
  });

  it('renders adendo warning when CODIGOCARGO contains ADENDO-WEB', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'cliente@teste.com',
      to: 'agendamento@cmsocupacional.com.br',
      subject: 'Teste',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_INTERNAL,
      data: {
        funcionario: makeFuncionario({
          CODIGOCARGO: 'ADENDO-WEB-123',
        }),
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('ADENDO-WEB');
  });

  it('shows observacoes when present', () => {
    const mail: EmailType = {
      from: 'CMSO Agendamento <noreply@cmsocupacional.com.br>',
      replyTo: 'cliente@teste.com',
      to: 'agendamento@cmsocupacional.com.br',
      subject: 'Teste',
      attachment: [],
      templatename: TemplateNames.SCHEDULING_INTERNAL,
      data: {
        funcionario: makeFuncionario({ OBSERVACOES: 'Trazer relatório de exame anterior' }),
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Trazer relatório');
  });
});
