export enum ApiMessages {
  // 🔄 Integração com SOC (sistema externo)
  SOC_ED_CADASTRO_PESSOAS_NULL = "Não foi possível a comunicação com SOC para integração de cadastro",
  // → Retornado quando a API do SOC não responde ou não retorna dados válidos

  SOC_CADASTRO_PESSOA_NOT_FOUND = "Cadastro de usuário não integrado ao SOC",
  // → Retornado quando o CPF/Código informado não é encontrado na base do SOC

  // 👤 Registro de usuários
  USER_REGISTERED_SUCCESSFULLY = "Usuário registrado com sucesso",
  // → Fluxo de registro concluído com sucesso (Supabase + SOC integrados)

  USER_REGISTER_FAILED = "Falha ao registrar usuário",
  // → Erro inesperado ao tentar salvar dados no Supabase

  USER_ALREADY_EXISTS = "Este usuário já possui cadastro",
  // → Retornado quando o CPF já está cadastrado no Supabase (conflito de duplicidade)

  USER_INPUT_INVALID = "CPF ou senha inválidos",
  // → Erro de autenticação: CPF não cadastrado ou senha incorreta

  USER_INACTIVE = "Acesso bloqueado. Entre em contato com o administrador.",
  // → Retornado quando o usuário está inativo no sistema local

  // 🔑 Login de usuários
  USER_LOGGED_IN_SUCCESSFULLY = "Usuário logado com sucesso.",
  // → Login validado, token JWT gerado e retornado ao cliente

  // ⚠️ Erros genéricos
  INTERNAL_ERROR = "Internal error (generic)",
  // → Erro genérico usado como fallback quando não há tratamento específico
}
