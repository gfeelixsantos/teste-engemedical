import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";

export interface IUserInfo {
  codigo: string;
  nome: string;
  cpf?: string;
  email?: string;
  conselho?: string;
  ufconselho?: string;
  perfil: string;
  tipoUsuario?: "interno" | "cliente";
  registrationCode?: string;
  empresas?: CadastroEmpresa[];
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IUserRegister {
  nome: string;
  email: string;
  password: string;
  codigo: string;
  cpf?: string;
  tipoUsuario?: "interno" | "cliente";
  registrationCode?: string;
}

export interface IUserReauth {
  email?: string;
  cpf?: string;
  password: string;
}

export interface IPscAuthStatus {
  status: "NOT_AUTHENTICATED" | "ACTIVE" | "EXPIRED" | "ERROR";
  isActive: boolean;
  expiresAt: string | null;
  pscName: string | null;
}

export interface IUserInfoSettings {
  userCodigo: string;
  assinaturaImagemUrl?: string;
  assinaDigitalmente: boolean;
  pscPadrao?: string | null;
  // Compatibilidade com payloads legados do frontend
  provedorPadrao?: string | null;

  // Novos campos para BRy Cloud
  assinaturaProvider?: "PSC" | "BRYKMS" | null;
  uuidCert?: string | null;
  pin?: string | null; // Não retornado do backend por segurança
}

export interface IUserSettingsResponse {
  user: IUserInfo;
  settings: IUserInfoSettings | null;
  pscAuthStatus: IPscAuthStatus;
}

export interface IUserWebsocket {
  unidade?: string;
  exame?: string;
  sala?: string;
  id?: string;
  nome: string;
  type: WebsocketType;
}
