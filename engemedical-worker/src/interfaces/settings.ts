export interface IUserSettings {
  id?: string;
  user_codigo: string;
  assinatura_imagem_url?: string | null;
  assina_digitalmente: boolean;
  psc_padrao?: string | null;

  assinatura_provider?: 'PSC' | 'BRYKMS' | null;

  // Legacy BRYKMS fields
  bry_cloud_user?: string | null;
  bry_cloud_pin?: string | null;
  bry_cloud_token?: string | null;

  // Current backend BRYKMS fields
  uuid_cert?: string | null;
  pin?: string | null;
  token?: string | null;
  bry_user?: string | null;
  provider?: 'PSC' | 'BRYKMS' | null;

  created_at?: string;
  updated_at?: string;
}
