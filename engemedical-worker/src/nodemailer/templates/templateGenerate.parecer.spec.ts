import { TemplateGenerate } from './templateGenerate';
import { TemplateNames, type EmailType } from '../types/emailtype';
import { SchedulingDocument } from '../../mongo/types/scheduling';

function makeFuncionario(overrides?: Partial<SchedulingDocument>): SchedulingDocument {
  return {
    _id: 'proc-123',
    ATENDIMENTOSTATUS: 'FINALIZADO',
    ASOSTATUS: 'LIBERADO',
    ASOINFO: {
      status: 'LIBERADO',
      observacoesParecer: [],
    } as any,
    SCHEDULINGCODE: '',
    CODIGOPRONTUARIO: '123',
    RISCOSASO: [],
    CODIGOEMPRESA: '1955530',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: 'A10 SERVICOS LTDA',
    CODIGO: '139',
    NOME: 'JOSE DA SILVA',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: 'MATRIZ',
    CODIGOSETOR: '',
    NOMESETOR: 'OPERACIONAL',
    CODIGOCARGO: '',
    NOMECARGO: 'CONFERENTE',
    MATRICULAFUNCIONARIO: '',
    CPFFUNCIONARIO: '42514186897',
    SITUACAO: '',
    DATANASCIMENTO: '01/01/1990',
    DATAAGENDAMENTO: '29/05/2026',
    DATAAGENDAMENTO_DATE: new Date('2026-05-29'),
    HORARIO: '09:00',
    UNIDADEATENDIMENTO: 'RIO CLARO',
    SEQUENCIAFICHA: '',
    TIPOEXAME: '3',
    TIPOEXAMENOME: 'RETORNO TRABALHO',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: 'APTO_COM_ORIENTACAO',
    RECOMENDACAOMEDICA: 'Orientar acompanhamento ergonômico.',
    MEDICO: 'DRA. MARIA',
    ANEXOS: [],
    TERM: false,
    CLIENT: null,
    CREATED: '26/05/2026 12:13:43',
    EXAMES: [],
    TICKET: null,
    ...overrides,
  };
}

const medicalOpinion = {
  opinionType: 'APTO_COM_ORIENTACAO' as any,
  details: 'Orientar acompanhamento ergonômico.',
  isProgrammed: true,
  orientacaoId: 'ori-1',
};

const observacoesParecer = [
  'Recomendamos acompanhamento periódico com oftalmologista para preservação da saúde visual do colaborador.',
];

describe('TemplateGenerate PARECER_MEDICO (email da equipe)', () => {
  it('renderiza dados básicos do funcionário e parecer', () => {
    const mail: EmailType = {
      to: 'liberacao@cmsocupacional.com.br',
      cc: 'enfermagem@cmsocupacional.com.br',
      subject: 'PARECER: JOSE DA SILVA',
      attachment: [],
      templatename: TemplateNames.PARECER_MEDICO,
      data: {
        funcionario: makeFuncionario(),
        medicalOpinion: medicalOpinion as any,
        issuedBy: {
          nome: 'DRA. MARIA',
          cpf: '12345678900',
          perfil: 'MEDICO',
          codigo: '1698',
          conselho: 'CRM',
          ufconselho: 'SP',
        },
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('JOSE DA SILVA');
    expect(rendered.template).toContain('RETORNO AO TRABALHO');
    expect(rendered.template).toContain('A10 SERVICOS LTDA');
    expect(rendered.template).toContain('DRA. MARIA');
    expect(rendered.template).toContain('APTO COM ORIENTAÇÃO');
  });

  it('renderiza seção "Observações do Parecer" quando asoInfo.observacoesParecer presente', () => {
    const mail: EmailType = {
      to: 'liberacao@cmsocupacional.com.br',
      subject: 'PARECER: JOSE DA SILVA',
      attachment: [],
      templatename: TemplateNames.PARECER_MEDICO,
      data: {
        funcionario: makeFuncionario(),
        medicalOpinion: medicalOpinion as any,
        issuedBy: undefined,
        asoInfo: {
          nomeFuncionario: 'JOSE DA SILVA',
          nomeEmpresa: 'A10 SERVICOS LTDA',
          tipoExame: 'RETORNO TRABALHO',
          data: '29/05/2026',
          cpf: '42514186897',
          parecer: 'APTO_COM_ORIENTACAO',
          asoFileUrl: 'https://storage/aso-url-signed',
          observacoesParecer,
        },
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Observa&ccedil;&otilde;es do Parecer');
    expect(rendered.template).toContain(observacoesParecer[0]);
  });

  it('renderiza CTA "Visualizar ASO" quando asoFileUrl presente', () => {
    const mail: EmailType = {
      to: 'liberacao@cmsocupacional.com.br',
      subject: 'PARECER: JOSE DA SILVA',
      attachment: [],
      templatename: TemplateNames.PARECER_MEDICO,
      data: {
        funcionario: makeFuncionario(),
        medicalOpinion: medicalOpinion as any,
        issuedBy: undefined,
        asoInfo: {
          nomeFuncionario: 'JOSE DA SILVA',
          nomeEmpresa: 'A10 SERVICOS LTDA',
          tipoExame: 'RETORNO TRABALHO',
          data: '29/05/2026',
          cpf: '42514186897',
          parecer: 'APTO_COM_ORIENTACAO',
          asoFileUrl: 'https://storage/aso-url-signed',
        },
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Visualizar ASO');
    expect(rendered.template).toContain('https://storage/aso-url-signed');
  });

  it('não renderiza CTA quando asoFileUrl ausente (email disparado ainda no finish)', () => {
    const mail: EmailType = {
      to: 'liberacao@cmsocupacional.com.br',
      subject: 'PARECER: JOSE DA SILVA',
      attachment: [],
      templatename: TemplateNames.PARECER_MEDICO,
      data: {
        funcionario: makeFuncionario(),
        medicalOpinion: medicalOpinion as any,
        issuedBy: undefined,
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).not.toContain('Visualizar ASO');
    // Ainda renderiza o texto de parecer normal
    expect(rendered.template).toContain('JOSE DA SILVA');
  });

  it('não renderiza a seção de observações quando ausente', () => {
    const mail: EmailType = {
      to: 'liberacao@cmsocupacional.com.br',
      subject: 'PARECER: JOSE DA SILVA',
      attachment: [],
      templatename: TemplateNames.PARECER_MEDICO,
      data: {
        funcionario: makeFuncionario(),
        medicalOpinion: medicalOpinion as any,
        issuedBy: undefined,
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).not.toContain('Observa&ccedil;&otilde;es do Parecer');
  });
});

describe('TemplateGenerate ASO_RELEASE (email cliente)', () => {
  it('renderiza seção observações do parecer quando presente', () => {
    const mail: EmailType = {
      to: 'cliente@teste.com',
      subject: 'ASO Liberado',
      attachment: [],
      templatename: TemplateNames.ASO_RELEASE,
      data: {
        asoInfo: {
          nomeFuncionario: 'JOSE DA SILVA',
          nomeEmpresa: 'A10 SERVICOS LTDA',
          tipoExame: 'RETORNO TRABALHO',
          data: '29/05/2026',
          cpf: '42514186897',
          parecer: 'APTO_COM_ORIENTACAO',
          asoFileName: 'ASO.pdf',
          asoFileUrl: 'https://storage/aso-url-signed',
          observacoesParecer,
        },
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Observa&ccedil;&otilde;es do Parecer');
    expect(rendered.template).toContain(observacoesParecer[0]);
  });

  it('renderiza CTA Visualizar ASO com link assinado', () => {
    const mail: EmailType = {
      to: 'cliente@teste.com',
      subject: 'ASO Liberado',
      attachment: [],
      templatename: TemplateNames.ASO_RELEASE,
      data: {
        asoInfo: {
          nomeFuncionario: 'JOSE DA SILVA',
          nomeEmpresa: 'A10 SERVICOS LTDA',
          tipoExame: 'RETORNO TRABALHO',
          data: '29/05/2026',
          cpf: '42514186897',
          parecer: 'APTO_COM_ORIENTACAO',
          asoFileName: 'ASO.pdf',
          asoFileUrl: 'https://storage/aso-url-signed',
        },
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).toContain('Visualizar ASO');
    expect(rendered.template).toContain('https://storage/aso-url-signed');
  });

  it('não renderiza a seção de observações quando ausente', () => {
    const mail: EmailType = {
      to: 'cliente@teste.com',
      subject: 'ASO Liberado',
      attachment: [],
      templatename: TemplateNames.ASO_RELEASE,
      data: {
        asoInfo: {
          nomeFuncionario: 'JOSE DA SILVA',
          nomeEmpresa: 'A10 SERVICOS LTDA',
          tipoExame: 'RETORNO TRABALHO',
          data: '29/05/2026',
          cpf: '42514186897',
          parecer: 'APTO_COM_ORIENTACAO',
          asoFileName: 'ASO.pdf',
          asoFileUrl: 'https://storage/aso-url-signed',
        },
      },
    };

    const rendered = TemplateGenerate.render(mail);
    expect(rendered.template).not.toContain('Observa&ccedil;&otilde;es do Parecer');
  });
});