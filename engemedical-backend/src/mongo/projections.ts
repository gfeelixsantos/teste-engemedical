export const PROJECTIONS = {
  SCHEDULINGS_WITH_FILTERS: {
    migrationDate: 0,
    CODIGOEMPRESA: 0,
    SUBGRUPOEMPRESA: 0,
    MATRICULAFUNCIONARIO: 0,
    CODIGOUNIDADE: 0,
    CODIGOSETOR: 0,
    CODIGOCARGO: 0,
    ASOSTATUS: 0,
    CODIGOINTERNOEMPRESA: 0,
    SITUACAO: 0,
    DATAAGENDAMENTO_DATE: 0,

    'ANEXOS.Content': 0,
    'ANEXOS.Origin': 0,
    'ANEXOS.Size': 0,
    'ANEXOS.UploadedAt': 0,

    'EXAMES.preparacao': 0,
    'EXAMES.formulario': 0,

    TICKET: 0,
    TERM: 0,
    CLIENT: 0,
  },

  GET_REPORT_DATA: {
    // EXCLUSÕES PARA PERFORMANCE (campos pesados que não são usados na tabela):
    migrationDate: 0,
    CLIENT: 0, // Objeto grande com dados do cliente
    TICKET: 0, // Dados de ticket não usados na listagem
    ANEXOS: 0, // Array de anexos - muito pesado
    EXAMES: 0, // Array complexo de exames - será carregado por outra rota
    RISCOSASO: 0, // Dados de risco ASO
    BIOMETRIA: 0, // Dados biométricos
    OBSERVACOES: 0, // Observações textuais
    ANOTACOES: 0, // Anotações
    RECOMENDACAOMEDICA: 0, // Recomendações médicas
    PARECERMEDICO: 0, // Parecer médico
    MEDICO: 0, // Nome do médico
    TERM: 0, // Termo
    CREATED: 0, // Data de criação
    TELEFONE: 0, // Telefone
    NOMEUNIDADE: 0, // Usamos UNIDADEATENDIMENTO
    NOMESETOR: 0, // Não exibido na tabela

    // Campos de código que não são exibidos:
    CODIGOEMPRESA: 0,
    CNPJEMPRESA: 0,
    CPFEMPRESA: 0,
    SUBGRUPOEMPRESA: 0,
    CODIGOINTERNOEMPRESA: 0,
    CODIGO: 0,
    CODIGOUNIDADE: 0,
    CODIGOSETOR: 0,
    CODIGOCARGO: 0,
    SITUACAO: 0,
    DATANASCIMENTO: 0,
    TIPOEXAME: 0, // Código numérico, usamos TIPOEXAMENOME
    ASOSTATUS: 0,
    PRONTUARIOSVINCULADOS: 0,
  },

  MODAL_PROJECTION: {
    // Campos que serão EXCLUÍDOS (0) - conforme definido
    migrationDate: 0,
    BIOMETRIA: 0,
    TERM: 0,
    CREATED: 0,
    // TELEFONE: 0,

    // Campos de código não utilizados:
    // CODIGOEMPRESA: 0,
    CPFEMPRESA: 0,
    SUBGRUPOEMPRESA: 0,
    // CODIGO: 0,
    CODIGOUNIDADE: 0,
    CODIGOSETOR: 0,
    CODIGOCARGO: 0,
    SITUACAO: 0,
    TIPOEXAME: 0,
    ASOSTATUS: 0,
    PRONTUARIOSVINCULADOS: 0,
  },

  SCHEDULINGS_TODAY: {
    // Exclusões de campos top-level grandes/inúteis na lista
    migrationDate: 0,
    RISCOSASO: 0,
    SUBGRUPOEMPRESA: 0,
    BIOMETRIA: 0,
    CODIGOUNIDADE: 0,
    CODIGOSETOR: 0,
    CODIGOCARGO: 0,
    MATRICULAFUNCIONARIO: 0,
    SITUACAO: 0,
    TERM: 0,
    CLIENT: 0,
    'ANEXOS.Content': 0,
    'ANEXOS.Origin': 0,
    'ANEXOS.Size': 0,
    'ANEXOS.UploadedAt': 0,
    'EXAMES.formulario': 0,
    'EXAMES.sequencialResultadoExame': 0,
    'TICKET.type': 0,
  },
};
