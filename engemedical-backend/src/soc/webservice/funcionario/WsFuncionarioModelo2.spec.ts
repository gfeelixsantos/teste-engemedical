import { CadastroFuncionarioPorSituacao } from '../../types/CadastroFuncionarioPorSituacao';
import { WsFuncionarioModelo2 } from './WsFuncionarioModelo2';

function baseEmployee(): CadastroFuncionarioPorSituacao {
  return {
    CODIGOEMPRESA: '115',
    NOMEEMPRESA: '',
    CODIGO: '',
    NOME: 'Pessoa Teste',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: '',
    CBOCARGO: '',
    CCUSTO: '',
    NOMECENTROCUSTO: '',
    MATRICULAFUNCIONARIO: 'RH123',
    CPF: '123.456.789-01',
    RG: '',
    UFRG: '',
    ORGAOEMISSORRG: '',
    SITUACAO: 'FERIAS',
    SEXO: '1',
    PIS: '',
    CTPS: '',
    SERIECTPS: '',
    ESTADOCIVIL: '',
    TIPOCONTATACAO: '',
    DATA_NASCIMENTO: '',
    DATA_ADMISSAO: '',
    DATA_DEMISSAO: '',
    ENDERECO: '',
    NUMERO_ENDERECO: '',
    BAIRRO: '',
    CIDADE: '',
    UF: '',
    CEP: '',
    TELEFONERESIDENCIAL: '',
    TELEFONECELULAR: '',
    EMAIL: '',
    DEFICIENTE: '',
    DEFICIENCIA: '',
    NM_MAE_FUNCIONARIO: '',
    DATAULTALTERACAO: '',
    MATRICULARH: 'RH123',
    COR: '',
    ESCOLARIDADE: '',
    NATURALIDADE: '',
    RAMAL: '',
    REGIMEREVEZAMENTO: '',
    REGIMETRABALHO: '',
    TELCOMERCIAL: '',
    TURNOTRABALHO: '',
    RHUNIDADE: '',
    RHSETOR: '',
    RHCARGO: '',
    RHCCENTROCUSTOUNIDADE: '',
  };
}

describe('WsFuncionarioModelo2', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      SOC_WEBSERVICE_USER: 'usuario',
      SOC_WEBSERVICE_PASS: 'senha',
      SOC_WEBSERVICE_EMPRESA_PRINCIPAL: '1',
      SOC_WEBSERVICE_CODIGO_RESPONSAVEL: '2',
      SOC_WEBSERVICE_CODIGO_USUARIO: '3',
    };
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => `
        <FuncionarioRetorno>
          <encontrouErro>false</encontrouErro>
          <atualizouFuncionario>true</atualizouFuncionario>
          <codigoFuncionario>12345</codigoFuncionario>
        </FuncionarioRetorno>
      `,
    })) as any;
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('builds FuncionarioModelo2 XML using CPF lookup and preserving FERIAS', async () => {
    const result = await WsFuncionarioModelo2(baseEmployee(), {
      lookupKey: 'CPF',
      overwriteSituacao: 'FERIAS',
      auditObservation: 'Atualizado via teste SFTP',
    });

    expect(result.xml).toContain(
      '<chaveProcuraFuncionario>CPF</chaveProcuraFuncionario>',
    );
    expect(result.xml).toContain('<situacao>FERIAS</situacao>');
    expect(result.xml).toContain('<cpf>12345678901</cpf>');
    expect(result.xml).toContain('<matricula>RH123</matricula>');
    expect(result.xml).toContain(
      '<observacaoFuncionario>Atualizado via teste SFTP</observacaoFuncionario>',
    );
    expect(result.data).toMatchObject({
      success: true,
      encontrouErro: false,
      atualizouFuncionario: true,
      codigoFuncionario: '12345',
    });
  });

  it('formats ISO employee dates before sending FuncionarioModelo2 XML', async () => {
    const employee = {
      ...baseEmployee(),
      DATA_NASCIMENTO: '1982-02-15',
      DATA_ADMISSAO: '2023-09-18',
      DATA_DEMISSAO: '2026-04-24',
    };

    const result = await WsFuncionarioModelo2(employee, {
      lookupKey: 'CPF',
      overwriteSituacao: 'FERIAS',
    });

    expect(result.xml).toContain('<dataNascimento>15/02/1982</dataNascimento>');
    expect(result.xml).toContain('<dataAdmissao>18/09/2023</dataAdmissao>');
    expect(result.xml).toContain('<dataDemissao>24/04/2026</dataDemissao>');
  });
});
