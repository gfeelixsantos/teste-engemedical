export interface IUserResponse {
  codigo: string;
  cpf: string;
  nome: string;
  email?: string;
  telefone?: string;
  perfil: string;
  conselho?: string;
  uf_conselho?: string;
  registro_conselho?: string;
  ativo: boolean;
  deleted_at?: string;
  anonimizado_em?: string;
  criado_em?: string;
  atualizado_em?: string;
  ultimo_login?: string;
  criado_por?: string;
  atualizado_por?: string;
  consentimento_aceito?: boolean;
  consentimento_aceito_em?: string;
  consentimento_versao?: string;
}

export interface IConsentStatus {
  tipo: string;
  versao_atual: string;
  aceito: boolean;
  aceito_em: string | null;
}

export interface IConsentRequest {
  tipo: string;
  versao: string;
  aceito?: boolean;
}

export interface IUserCreate {
  codigo: string;
  cpf: string;
  nome: string;
  email?: string;
  telefone?: string;
  perfil?: string;
  conselho?: string;
  uf_conselho?: string;
  registro_conselho?: string;
  criado_por?: string;
}

export interface IUserSync {
  codigo: string;
  cpf: string;
  nome: string;
  perfil?: string;
  email?: string;
  telefone?: string;
  conselho?: string;
  uf_conselho?: string;
  registro_conselho?: string;
  ultimo_login?: string;
}

export interface IUserUpdate {
  nome?: string;
  email?: string;
  telefone?: string;
  perfil?: string;
  conselho?: string;
  uf_conselho?: string;
  registro_conselho?: string;
  ativo?: boolean;
  atualizado_por?: string;
}
