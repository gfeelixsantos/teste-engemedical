// lib/websocket/websocket.client.ts
import { io, Socket } from "socket.io-client";

import { EventType } from "../events/events";

import { IUserWebsocket } from "@/lib/user/interfaces/IUser";
import { Ticket } from "@/lib/ticket/ticket";

export class WebSocketClient {
  private socket: Socket | null = null;

  async connect(user: IUserWebsocket): Promise<boolean> {
    if (this.socket && this.socket.connected) {
      console.log("⚠️ Já existe uma conexão ativa");

      return true;
    }

    return new Promise((resolve) => {
      this.socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
        transports: ["websocket"],
        auth: { user },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
      });

      this.socket.on("connect", () => {
        console.log("🟢 Conectado ao servidor WS:", this.socket?.id);
        resolve(true);
      });

      this.socket.on("connect_error", (err) => {
        console.error("❌ Erro ao conectar WS:", err.message);
        resolve(false);
      });

      this.socket.on("disconnect", () => {
        console.log("🔴 Desconectado do servidor");
      });

      this.socket.on(EventType.TICKET_EMITED, (msg: Ticket) => {
        console.log("📥 Mensagem recebida:", msg);
      });
    });
  }

  async disconnect(): Promise<boolean> {
    if (this.socket) {
      return new Promise((resolve) => {
        this.socket?.once("disconnect", () => {
          console.log("🔌 Conexão encerrada manualmente");
          this.socket = null;
          resolve(true);
        });
        this.socket?.disconnect();
      });
    }
    console.log("⚠️ Nenhuma conexão ativa para encerrar");

    return false;
  }
}
