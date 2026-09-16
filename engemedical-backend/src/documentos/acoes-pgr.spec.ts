import { buildAcoesPgrSection, getDefaultPgrPeriod, getPgrCompanyCodes, mapAcoesPgr, type SocAcaoPgr } from './acoes-pgr';

const row = (overrides: Partial<SocAcaoPgr> = {}): SocAcaoPgr => ({
  NOME_EMPRESA: 'Empresa Alfa',
  CODIGO_EMPRESA: '1153506',
  NOME_ACAO: 'Treinamento',
  DESCRICAO: 'Capacitar equipe',
  ANEXO: 'Não',
  SITUACAO: 'Em Andamento',
  DATA_CONCLUSAO: '',
  PRIORIDADE: 'Alta',
  DATA_LIMITE: '30/09/2026',
  PERIODO: '01/09/2026 - 30/09/2026',
  LEMBRETE: '',
  RESPONSAVEL: 'Diretoria',
  TIPO_RESPONSAVEL: 'Interno',
  RESPONSAVEL_AVULSO: '',
  EMAIL: 'diretoria@example.com',
  UNIDADE: 'Matriz',
  SETOR: 'Operações',
  CARGO: 'Gestor',
  FUNCIONARIO: '',
  PERIGOS_FATORES_DE_RISCO: 'Ruído',
  CATEGORIA: 'Implementação',
  CARACTERISTICA_DO_RISCO_ATUALIZADA: 'Atualizada',
  VERSAO_ANTERIOR: '1',
  VERSAO_NOVA: '2',
  COMO: 'Treinamento presencial',
  QUANTO: 'R$ 100,00',
  ...overrides,
});

test('mapeia os campos do Exporta Dados 218764 para uma ação PGR', () => {
  const [action] = mapAcoesPgr([row()]);

  expect(action).toMatchObject({
    empresa: 'Empresa Alfa',
    unidade: 'Matriz',
    acao: 'Treinamento',
    descricao: 'Capacitar equipe',
    anexos: 'Não',
    situacao: 'Em Andamento',
    categoria: 'Implementação',
    prioridade: 'Alta',
    periodo: '01/09/2026 - 30/09/2026',
    responsavel: 'Diretoria',
    perigosRiscos: 'Ruído',
  });
});

test('agrega ações por situação, prioridade, categoria, responsável, empresa e unidade', () => {
  const section = buildAcoesPgrSection(mapAcoesPgr([
    row(),
    row({ SITUACAO: 'Concluída', PRIORIDADE: 'Imediata', NOME_ACAO: 'Inspeção', UNIDADE: 'Filial' }),
    row({ SITUACAO: 'Em Andamento', PRIORIDADE: 'Baixa', CATEGORIA: 'Monitoramento', RESPONSAVEL: 'RH' }),
  ]));

  expect(section.totalAcoes).toBe(3);
  expect(section.prioridades).toEqual({ imediata: 1, alta: 1, media: 0, baixa: 1 });
  expect(section.porSituacao).toEqual([
    { situacao: 'Em Andamento', qtd: 2 },
    { situacao: 'Concluída', qtd: 1 },
  ]);
  expect(section.porCategoria).toEqual([
    { categoria: 'Implementação', qtd: 2 },
    { categoria: 'Monitoramento', qtd: 1 },
  ]);
  expect(section.porResponsavel).toEqual([
    { responsavel: 'Diretoria', qtd: 2 },
    { responsavel: 'RH', qtd: 1 },
  ]);
});

test('calcula um período móvel de um ano até a data atual', () => {
  expect(getDefaultPgrPeriod(new Date(2026, 8, 15))).toEqual({
    dataInicio: '15/09/2025',
    dataFim: '15/09/2026',
  });
});

test('extrai códigos únicos das empresas que possuem PGR', () => {
  expect(getPgrCompanyCodes([
    { codigoEmpresa: '1153506', tipoDocumento: 'PGR' },
    { codigoEmpresa: '1153506', tipoDocumento: 'PGR' },
    { codigoEmpresa: '220488', tipoDocumento: 'PCMSO' },
    { codigoEmpresa: '220488', tipoDocumento: 'PGR' },
  ])).toEqual(['1153506', '220488']);
});
