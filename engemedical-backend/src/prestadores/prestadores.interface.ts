export interface IPrestadorResponse {
  id: string;
  nome: string;
  unidade: string;
  endereco: string | null;
  horario: string | null;
  referencia: string | null;
  grupos: string[];
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IPrestadorCreate {
  nome: string;
  unidade: string;
  endereco?: string | null;
  horario?: string | null;
  referencia?: string | null;
  grupos?: string[];
}

export interface IPrestadorUpdate {
  nome?: string;
  unidade?: string;
  endereco?: string | null;
  horario?: string | null;
  referencia?: string | null;
  grupos?: string[];
  ativo?: boolean;
}
