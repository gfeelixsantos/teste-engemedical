export interface IOrientacaoConfigResponse {
  id: string;
  categoria: string;
  texto_tela: string;
  texto_email: string;
  libera_cliente: boolean;
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
}

export interface IOrientacaoConfigCreate {
  categoria: string;
  texto_tela: string;
  texto_email: string;
  libera_cliente?: boolean;
  ordem?: number;
}

export interface IOrientacaoConfigUpdate {
  categoria?: string;
  texto_tela?: string;
  texto_email?: string;
  libera_cliente?: boolean;
  ativo?: boolean;
  ordem?: number;
}
