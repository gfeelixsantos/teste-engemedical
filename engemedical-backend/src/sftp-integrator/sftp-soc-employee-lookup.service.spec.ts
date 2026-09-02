import { SftpSocEmployeeLookupService } from './sftp-soc-employee-lookup.service';

describe('SftpSocEmployeeLookupService', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      SOC_EXPORT_DATA_BASE_URL: 'https://soc.example.com/exporta',
      SOC_WEBSERVICE_EMPRESA_PRINCIPAL: '1153506',
      SOC_ED_CADASTRO_FUNCIONARIO_CPF_CODIGO: '217191',
      SOC_ED_CADASTRO_FUNCIONARIO_CPF_CHAVE: 'lookup-key',
    };
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('queries Cadastro de Funcionario por CPF and filters employees by configured SOC company code', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        new TextEncoder().encode(
          JSON.stringify([
            {
              CODIGOEMPRESA: '2182291',
              NOMEEMPRESA: 'GRUPO TORA',
              EMPRESASOCNET: 'Nao',
              CODIGO: '6716',
              NOME: 'CARLOS ANDRE ALVES NETO',
              CODIGOUNIDADE: '73',
              NOMEUNIDADE: 'FJX TRANSPORTES CONTAGEM/MG',
              CODIGOSETOR: '867',
              NOMESETOR: 'FROTA AGUA LIMPA',
              CODIGOCARGO: '704',
              NOMECARGO: 'MOTORISTA CARRETEIRO',
              CBOCARGO: '782510',
              MATRICULAFUNCIONARIO: '140189011920230915153717',
              MATRICULARHFUNCIONARIO: '890119',
              CPFFUNCIONARIO: '01645799581',
              SITUACAO: 'Ferias',
              DATA_NASCIMENTO: '1982-02-15',
              DATA_ADMISSAO: '2023-09-18',
              DATA_DEMISSAO: '',
              DATA_INATIVACAO: '',
              ENDERECO: '',
              NUMERO_ENDERECO: '0',
              BAIRRO: '',
              UF: '',
              EMAILCORPORATIVO: '',
              EMAILPESSOAL: '',
              TELEFONECELULAR: '',
              DATACADASTRO: '2023-09-06',
            },
            {
              CODIGOEMPRESA: '2079768',
              NOMEEMPRESA: 'ASO AVULSO - TORA TRANSPORTES',
              EMPRESASOCNET: 'Nao',
              CODIGO: '912',
              NOME: 'CARLOS ANDRE ALVES NETO',
              CODIGOUNIDADE: '56',
              NOMEUNIDADE: 'FJX TRANSPORTES S.A. 30.417.459/0003-18',
              CODIGOSETOR: '53',
              NOMESETOR: 'FROTA MATRIZ',
              CODIGOCARGO: '51',
              NOMECARGO: 'MOTORISTA CARRETEIRO',
              CBOCARGO: '7825.10',
              MATRICULAFUNCIONARIO: '',
              MATRICULARHFUNCIONARIO: '',
              CPFFUNCIONARIO: '01645799581',
              SITUACAO: 'Inativo',
              DATA_NASCIMENTO: '1982-02-15',
              DATA_ADMISSAO: '2026-03-06',
              DATA_DEMISSAO: '',
              DATA_INATIVACAO: '2026-04-24',
              ENDERECO: '',
              NUMERO_ENDERECO: '',
              BAIRRO: '',
              UF: '',
              EMAILCORPORATIVO: '',
              EMAILPESSOAL: '',
              TELEFONECELULAR: '',
              DATACADASTRO: '2026-03-05',
            },
          ]),
        ).buffer,
    } as any);
    const service = new SftpSocEmployeeLookupService();

    const result = await service.findByCpf('016.457.995-81', {
      companyCode: '2182291',
    });

    expect(result).toHaveLength(1);
    expect(result[0].source.DATACADASTRO).toBe('2023-09-06');
    expect(result[0].employee).toMatchObject({
      CODIGOEMPRESA: '2182291',
      NOMEEMPRESA: 'GRUPO TORA',
      CODIGO: '6716',
      NOME: 'CARLOS ANDRE ALVES NETO',
      CODIGOUNIDADE: '73',
      CODIGOSETOR: '867',
      CODIGOCARGO: '704',
      CBOCARGO: '782510',
      CPF: '01645799581',
      DATA_NASCIMENTO: '1982-02-15',
      DATA_ADMISSAO: '2023-09-18',
      DATA_DEMISSAO: '',
      TELEFONECELULAR: '',
    });

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    const parametro = JSON.parse(
      decodeURIComponent(requestedUrl.split('parametro=')[1]),
    );
    expect(parametro).toEqual({
      empresa: '1153506',
      codigo: '217191',
      chave: 'lookup-key',
      tipoSaida: 'json',
      cpf: '01645799581',
    });
  });

  it('returns an empty list when SOC returns no employee for the CPF', async () => {
    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode('[]').buffer,
    } as any);
    const service = new SftpSocEmployeeLookupService();

    await expect(service.findByCpf('00000000000')).resolves.toEqual([]);
  });

  it('returns an empty list when no employee belongs to the configured SOC company', async () => {
    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        new TextEncoder().encode(
          JSON.stringify([
            {
              CODIGOEMPRESA: '2079768',
              CODIGO: '912',
              NOME: 'Pessoa Teste',
              CPFFUNCIONARIO: '01645799581',
              DATACADASTRO: '2026-03-05',
            },
          ]),
        ).buffer,
    } as any);
    const service = new SftpSocEmployeeLookupService();

    await expect(
      service.findByCpf('01645799581', { companyCode: '2182291' }),
    ).resolves.toEqual([]);
  });
});
