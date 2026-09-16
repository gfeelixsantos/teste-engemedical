export interface SocAcaoPgr {
  NOME_EMPRESA?: string;
  CODIGO_EMPRESA?: string;
  NOME_ACAO?: string;
  DESCRICAO?: string;
  ANEXO?: string;
  SITUACAO?: string;
  DATA_CONCLUSAO?: string;
  PRIORIDADE?: string;
  DATA_LIMITE?: string;
  PERIODO?: string;
  LEMBRETE?: string;
  RESPONSAVEL?: string;
  TIPO_RESPONSAVEL?: string;
  RESPONSAVEL_AVULSO?: string;
  EMAIL?: string;
  UNIDADE?: string;
  SETOR?: string;
  CARGO?: string;
  FUNCIONARIO?: string;
  PERIGOS_FATORES_DE_RISCO?: string;
  CATEGORIA?: string;
  CARACTERISTICA_DO_RISCO_ATUALIZADA?: string;
  VERSAO_ANTERIOR?: string;
  VERSAO_NOVA?: string;
  COMO?: string;
  QUANTO?: string;
}

export interface AcaoPgr {
  empresa: string;
  unidade: string;
  acao: string;
  descricao: string;
  anexos: string;
  situacao: string;
  categoria: string;
  prioridade: string;
  periodo: string;
  responsavel: string;
  perigosRiscos: string;
  dataConclusao: string;
  dataLimite: string;
  tipoResponsavel: string;
  responsavelAvulso: string;
  email: string;
  setor: string;
  cargo: string;
  funcionario: string;
  lembrete: string;
  caracteristicaRiscoAtualizada: string;
  versaoAnterior: string;
  versaoNova: string;
  como: string;
  quanto: string;
}

export interface AcoesPgrSectionData {
  totalAcoes: number;
  porSituacao: { situacao: string; qtd: number }[];
  porNomeAcao: { acao: string; qtd: number }[];
  prioridades: { imediata: number; alta: number; media: number; baixa: number };
  porCategoria: { categoria: string; qtd: number }[];
  porResponsavel: { responsavel: string; qtd: number }[];
  porEmpresa: { empresa: string; qtd: number }[];
  porUnidade: { unidade: string; qtd: number }[];
  lista: AcaoPgr[];
}

const value = (input?: string): string => input?.trim() || '-';

const formatSocDate = (date: Date): string => [
  String(date.getDate()).padStart(2, '0'),
  String(date.getMonth() + 1).padStart(2, '0'),
  date.getFullYear(),
].join('/');

export const getDefaultPgrPeriod = (today = new Date()) => {
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  return {
    dataInicio: formatSocDate(oneYearAgo),
    dataFim: formatSocDate(today),
  };
};

export const getPgrCompanyCodes = (
  rows: Array<{ codigoEmpresa?: string; tipoDocumento?: string }>,
): string[] => [...new Set(
  rows
    .filter((row) => row.tipoDocumento === 'PGR' && row.codigoEmpresa?.trim())
    .map((row) => row.codigoEmpresa!.trim()),
)];

const countBy = <T>(rows: AcaoPgr[], getKey: (row: AcaoPgr) => string, keyName: string) => {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(getKey(row), (counts.get(getKey(row)) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([key, qtd]) => ({ [keyName]: key, qtd })) as T[];
};

export const mapAcoesPgr = (rows: SocAcaoPgr[]): AcaoPgr[] => rows
  .filter((row) => row.NOME_EMPRESA || row.NOME_ACAO)
  .map((row) => ({
    empresa: value(row.NOME_EMPRESA),
    unidade: value(row.UNIDADE),
    acao: value(row.NOME_ACAO),
    descricao: value(row.DESCRICAO),
    anexos: value(row.ANEXO),
    situacao: value(row.SITUACAO),
    categoria: value(row.CATEGORIA),
    prioridade: value(row.PRIORIDADE),
    periodo: value(row.PERIODO),
    responsavel: value(row.RESPONSAVEL || row.RESPONSAVEL_AVULSO),
    perigosRiscos: value(row.PERIGOS_FATORES_DE_RISCO),
    dataConclusao: value(row.DATA_CONCLUSAO),
    dataLimite: value(row.DATA_LIMITE),
    tipoResponsavel: value(row.TIPO_RESPONSAVEL),
    responsavelAvulso: value(row.RESPONSAVEL_AVULSO),
    email: value(row.EMAIL),
    setor: value(row.SETOR),
    cargo: value(row.CARGO),
    funcionario: value(row.FUNCIONARIO),
    lembrete: value(row.LEMBRETE),
    caracteristicaRiscoAtualizada: value(row.CARACTERISTICA_DO_RISCO_ATUALIZADA),
    versaoAnterior: value(row.VERSAO_ANTERIOR),
    versaoNova: value(row.VERSAO_NOVA),
    como: value(row.COMO),
    quanto: value(row.QUANTO),
  }));

export const buildAcoesPgrSection = (lista: AcaoPgr[]): AcoesPgrSectionData => {
  const priorities = { imediata: 0, alta: 0, media: 0, baixa: 0 };
  for (const row of lista) {
    const priority = row.prioridade.toLowerCase();
    if (priority.includes('imediata')) priorities.imediata++;
    else if (priority.includes('alta')) priorities.alta++;
    else if (priority.includes('média') || priority.includes('media')) priorities.media++;
    else if (priority.includes('baixa')) priorities.baixa++;
  }

  return {
    totalAcoes: lista.length,
    porSituacao: countBy<{ situacao: string; qtd: number }>(lista, (row) => row.situacao, 'situacao'),
    porNomeAcao: countBy<{ acao: string; qtd: number }>(lista, (row) => row.acao, 'acao'),
    prioridades: priorities,
    porCategoria: countBy<{ categoria: string; qtd: number }>(lista, (row) => row.categoria, 'categoria'),
    porResponsavel: countBy<{ responsavel: string; qtd: number }>(lista, (row) => row.responsavel, 'responsavel'),
    porEmpresa: countBy<{ empresa: string; qtd: number }>(lista, (row) => row.empresa, 'empresa'),
    porUnidade: countBy<{ unidade: string; qtd: number }>(lista, (row) => row.unidade, 'unidade'),
    lista,
  };
};
