/**
 * Enum que centraliza os códigos de status HTTP utilizados no projeto.
 *
 * 🔹 Categorias:
 * - 2xx → Sucesso
 * - 4xx → Erros do cliente
 * - 5xx → Erros do servidor
 */
export enum HttpCodes {
  // ✅ Sucesso (2xx)

  /**
   * 200 - Requisição bem-sucedida.
   * Usado quando a operação ocorreu normalmente e há dados de retorno.
   */
  OK = 200,

  /**
   * 201 - Recurso criado com sucesso.
   * Ex: cadastro de usuário concluído.
   */
  CREATED = 201,

  /**
   * 202 - Requisição aceita para processamento assíncrono.
   * Ex: envio de e-mail que será processado depois.
   */
  ACCEPTED = 202,

  /**
   * 204 - Sucesso sem retorno de conteúdo.
   * Ex: exclusão bem-sucedida de um recurso.
   */
  NO_CONTENT = 204,

  // ⚠️ Erros do cliente (4xx)

  /**
   * 400 - Requisição inválida ou malformada.
   * Ex: JSON inválido, parâmetros faltando ou incorretos.
   */
  BAD_REQUEST = 400,

  /**
   * 401 - Usuário não autenticado.
   * Ex: token JWT ausente ou inválido.
   */
  UNAUTHORIZED = 401,

  /**
   * 403 - Acesso proibido.
   * Usuário autenticado, mas sem permissão para a ação.
   */
  FORBIDDEN = 403,

  /**
   * 404 - Recurso não encontrado.
   * Ex: endpoint inexistente ou ID não localizado no banco.
   */
  NOT_FOUND = 404,

  /**
   * 405 - Método HTTP não permitido.
   * Ex: tentativa de usar POST em um endpoint que só aceita GET.
   */
  METHOD_NOT_ALLOWED = 405,

  /**
   * 409 - Conflito de estado.
   * Ex: tentativa de criar um usuário já existente.
   */
  CONFLICT = 409,

  /**
   * 422 - Dados inválidos.
   * A requisição foi entendida, mas não processada.
   * Ex: falha de validação nos campos do formulário.
   */
  UNPROCESSABLE_ENTITY = 422,

  // 🔥 Erros do servidor (5xx)

  /**
   * 500 - Erro interno inesperado no servidor.
   * Geralmente indica falhas não tratadas.
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * 501 - Funcionalidade não implementada.
   * Ex: endpoint definido, mas sem lógica implementada ainda.
   */
  NOT_IMPLEMENTED = 501,

  /**
   * 502 - Erro de gateway.
   * O servidor recebeu uma resposta inválida de um serviço externo.
   */
  BAD_GATEWAY = 502,

  /**
   * 503 - Serviço indisponível.
   * Ex: servidor fora do ar, manutenção ou sobrecarga.
   */
  SERVICE_UNAVAILABLE = 503,

  /**
   * 504 - Tempo limite excedido.
   * Ex: timeout em comunicação com outro serviço.
   */
  GATEWAY_TIMEOUT = 504,
}
