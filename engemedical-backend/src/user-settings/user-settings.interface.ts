export interface IUserSettings {
  id?: string;
  user_codigo: string;
  assinatura_imagem_url?: string | null;
  assina_digitalmente: boolean;
  psc_padrao?: string | null;
  assinatura_provider?: 'PSC' | 'BRYKMS' | null;
  uuid_cert?: string | null;
  pin?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IUserSettingsResponse {
  userCodigo: string;
  assinaturaImagemUrl?: string | null;
  assinaDigitalmente: boolean;
  pscPadrao?: string | null;
  assinaturaProvider?: 'PSC' | 'BRYKMS' | null;
  uuidCert?: string | null;
  // PIN não é retornado por segurança
}

export interface IUserSettingsRequest extends IUserSettingsResponse {
  pin?: string | null; // PIN enviado pelo frontend (já em base64)
}

export interface IPscAuthStatus {
  status: 'NOT_AUTHENTICATED' | 'ACTIVE' | 'EXPIRED' | 'ERROR';
  isActive: boolean;
  expiresAt: string | null;
  pscName: string | null;
}

export interface IUserSettingsFullResponse {
  user: {
    codigo: string;
    nome: string;
    cpf: string;
    conselho?: string;
    ufconselho?: string;
    perfil: string;
  };
  settings: IUserSettingsResponse | null;
  pscAuthStatus: IPscAuthStatus;
}
