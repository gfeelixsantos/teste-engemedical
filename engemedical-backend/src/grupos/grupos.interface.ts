export interface IGrupoResponse {
  id: string;
  nome: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IGrupoCreate {
  nome: string;
}

export interface IGrupoUpdate {
  nome?: string;
  ativo?: boolean;
}
