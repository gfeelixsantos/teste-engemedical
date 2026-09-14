import { WebsocketType } from 'src/websocket/enum/websocket.enum';

export type IUserWebsocket = {
  unidade: string;
  exame?: string;
  sala: string;
  id?: string;
  nome: string;
  type: WebsocketType;
};

export interface IUserInfo {
  nome: string;
  email?: string;
  cpf: string;
  perfil: string;
  codigo: string;
  conselho: string;
  ufconselho: string;
}
