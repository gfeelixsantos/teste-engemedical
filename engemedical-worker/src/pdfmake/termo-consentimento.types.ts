export type TipoAutenticacao = 'FACIAL' | 'BIOMETRIA';

export interface TermoConsentimentoInput {
  tipo: TipoAutenticacao;
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

  relatorioEvidenciasUrl?: string;
  relatorioEvidenciasHash?: string;
  /** URL externa usada apenas para baixar o PDF de evidencias (ex.: BRy). */
  relatorioEvidenciasProviderUrl?: string;
  /**
   * Força a resposta inline sem upload em blob.
   * Usado como fallback quando o backend detecta que o blob esperado ainda não existe.
   */
  forceInline?: boolean;

  facial?: {
    provider: 'BRY_SIGN';
    sessionId?: string;
    transactionId?: string;
  };

  biometria?: {
    dedo: string;
    digitalDocumentalUrl?: string;
    digitalDocumentalBlobPath?: string;
    digitalDocumentalPreviewBase64?: string;
    digitalDocumentalFinalidade?: 'COMPOSICAO_DOCUMENTAL';
    digitalDocumentalOrigem?: 'IMAGEM_DERIVADA_NAO_RAW';
    templateVersion: 'futronic-ansi-v1';
    templateStorage: 'ENCRYPTED_AES_256_GCM';
  };
}

export interface TermoConsentimentoOutput {
  buffer: Buffer;
  contentType: 'application/pdf';
  filename: string;
  documentHash: string;
}

export interface TermoConsentimentoOutputWithUpload {
  url: string;
  blobPath: string;
  documentHash: string;
  relatorioEvidenciasUrl?: string;
  relatorioEvidenciasHash?: string;
}

export function buildValidationBlobPath(prontuario: string): string {
  return `autenticacao/${prontuario}/relatorio-evidencias.pdf`;
}

export function formatDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
  } catch {
    return iso;
  }
}
