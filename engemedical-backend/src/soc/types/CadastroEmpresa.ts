export interface CadastroEmpresa {
  CODIGO: string;
  NOMEABREVIADO: string;
  RAZAOSOCIALINICIAL: string;
  RAZAOSOCIAL: string;
  ENDERECO: string;
  NUMEROENDERECO: string;
  COMPLEMENTOENDERECO: string;
  BAIRRO: string;
  CIDADE: string;
  CEP: string;
  UF: string;
  CNPJ: string;
  INSCRICAOESTADUAL: string;
  INSCRICAOMUNICIPAL: string;
  ATIVO: string;
  CODIGOCLIENTEINTEGRACAO: string;
  'CÓD. CLIENTE (INT.)': string;
  CNAE?: string;
  RAMO_ATIVIDADE?: string;
  GRAU_RISCO?: number;
  NUMERO_FUNCIONARIOS?: number;
  FONE_FAX?: string;
}
