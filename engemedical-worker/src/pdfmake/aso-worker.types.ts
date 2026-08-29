export type WorkerAsoInput = {
  origem: 'BIOMETRIA' | 'FACIAL';
  requestId: string;

  funcionario: {
    nome: string;
    codigo: string;
    cpfMascarado?: string;
    dataNascimento?: string;
    sexo?: string;
    cargo?: string;
    setor?: string;
  };

  empresa: {
    codigo: string;
    nome: string;
    cnpj?: string;
    endereco?: string;
    numeroEndereco?: string;
    complementoEndereco?: string;
    bairro?: string;
    cidade?: string;
    cep?: string;
    uf?: string;
  };

  unidade: {
    codigo?: string;
    nome?: string;
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string;
    cep?: string;
    uf?: string | null;
  };
  unidadeAtendimento?: string;

  atendimento: {
    schedulingId: string;
    prontuarioId?: string;
    dataAgendamento?: string;
    tipoExame?: string;
    tipoExameNome?: string;
    horario?: string;
    ticket?: {
      prefixo?: string;
      numero?: string;
    };
  };

  medicoCoordenador: {
    nome: string;
    crm: string;
    uf: string;
    cidade?: string | null;
    endereco?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
  };

  medicoExaminador?: {
    nome?: string;
    codigo?: string;
    cpf?: string;
    conselho?: string;
    ufconselho?: string;
    signatureStatus?: string;
  } | null;

  parecer?: {
    opinionType?: string | null;
    details?: string | null;
    alturaParecer?: string | null;
    confinadoParecer?: string | null;
    isProgrammed?: boolean | null;
    orientacoes?: string[] | null;
  } | null;

  riscos?: Array<{
    codigo?: string;
    risco?: string;
    grupo?: string;
  }>;

  exames?: Array<{
    codigoExame: string;
    nomeExame: string;
    grupo?: string;
    status?: string;
    dataExame?: string | null;
    sala?: string;
  }>;

  autenticacaoAtendimento: {
    metodo: 'BIOMETRIA' | 'FACIAL';
    status?: 'PENDENTE' | 'VALIDADO' | 'FALHA';
    requestId?: string | null;
    validadoEm?: string | null;
    validadoPor?: string | null;
    evidencias?: {
      termoCienciaUrl?: string | null;
      termoCienciaHash?: string | null;
      relatorioEvidenciasUrl?: string | null;
      relatorioEvidenciasHash?: string | null;
    } | null;
    biometria?: {
      cadastroId?: string | null;
      dedo?: string | null;
      templateVersion?: string | null;
      digitalDocumentalBlobPath?: string | null;
      /** Base64 da imagem baixada do blob pelo worker */
      imageBase64?: string | null;
    } | null;
    facial?: {
      provider?: 'BRY_SIGN' | null;
      sessionId?: string | null;
      transactionId?: string | null;
    } | null;
  };
};
