export interface TermoFacialInput {
  requestId: string;
  versaoTermo: string;
  validadeDias: 365;
  validadeAte: string;

  funcionario: {
    nome: string;
    cpfMascarado?: string;
    codigo?: string;
    email?: string;
  };

  empresa: {
    nome: string;
    cnpj?: string;
  };

  clinica: {
    nome: string;
    cnpj?: string;
    endereco?: string;
    contatoDpo?: string;
    cnae?: string;
    site?: string;
    telefone?: string;
    enderecoCompleto?: string;
  };

  atendimento: {
    schedulingId?: string;
    prontuarioId?: string;
    unidade: string;
    dataHora: string;
  };

  facial: {
    provider: 'BRY_SIGN';
    sessionId?: string;
    transactionId?: string;
    relatorioEvidenciasUrl?: string;
    relatorioEvidenciasHash?: string;
  };

  lgpd: {
    baseLegalCode:
      | 'OBRIGACAO_LEGAL_REGULATORIA'
      | 'PROTECAO_DA_SAUDE'
      | 'EXERCICIO_REGULAR_DE_DIREITOS'
      | 'OUTRA';
    baseLegalTexto: string;
    finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL';
    cienciaRegistradaEm: string;
    cienciaRegistradaPor: string;
    alternativaDisponivel: boolean;
    dpoIdentificacao?: string;
    armazenamentoRegiao?: string;
    armazenamentoNuvem?: string;
    retencaoDocumentalAnos?: number;
    retencaoLogsAnos?: number;
  };

  operador: {
    codigo?: string;
    nome?: string;
  };
}

export interface TermoFacialOutput {
  buffer: Buffer;
  contentType: 'application/pdf';
  filename: string;
  documentHash: string;
}

export interface TermoFacialOutputWithUpload {
  url: string;
  blobPath: string;
  documentHash: string;
  relatorioEvidenciasUrl?: string;
  relatorioEvidenciasHash?: string;
}
