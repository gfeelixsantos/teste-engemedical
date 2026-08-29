export interface IUnitResponse {
  id: string;
  nome: string;
  nome_exibicao?: string;
  ativo: boolean;
  ordem: number;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  whatsapp?: string;
  email?: string;
  horario_funcionamento?: string;
  qrcode_path?: string;
  salas: {
    recepcao: string[];
    exames: string[];
  };
  created_at?: string;
  updated_at?: string;
}

export interface IUnitCreate {
  nome: string;
  nome_exibicao?: string;
  ordem?: number;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  whatsapp?: string;
  email?: string;
  horario_funcionamento?: string;
  qrcode_path?: string;
  salas?: {
    recepcao?: string[];
    exames?: string[];
  };
}

export interface IUnitUpdate {
  nome?: string;
  nome_exibicao?: string;
  ativo?: boolean;
  ordem?: number;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  whatsapp?: string;
  email?: string;
  horario_funcionamento?: string;
  qrcode_path?: string;
  salas?: {
    recepcao?: string[];
    exames?: string[];
  };
}
