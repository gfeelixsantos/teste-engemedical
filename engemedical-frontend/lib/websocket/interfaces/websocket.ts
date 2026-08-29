import { WebsocketType } from "../enums/websocket.enum";

import { IUserWebsocket } from "@/lib/user/interfaces/IUser";

export interface IWebsocketHandshake {
  type: WebsocketType;
  unidade?: string;
  data?: IUserWebsocket;
}
