"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";

import { getCurrentUser } from "@/lib/utils";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import { useSocket } from "@/lib/websocket/hooks/useSocket";
import { GedBatchStatusPayload } from "@/lib/websocket/events/events";
import { addNotification, clearAllNotifications } from "@/lib/notification-store";
import { sendLocalNotification } from "@/lib/notifications";
import { CustomEventMap } from "@/lib/websocket/events/events";

interface GedBatchSocketContextValue {
  registerHandlers: (handlers: Partial<CustomEventMap>) => (() => void) | undefined;
}

const GedBatchSocketContext = createContext<GedBatchSocketContextValue>({
  registerHandlers: () => undefined,
});

export const useGedBatchSocket = () => useContext(GedBatchSocketContext);

export function GedBatchSocketProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUserInfo | null>(null);
  const { connect, disconnect, registerHandlers } = useSocket({
    showLifecycleToasts: false,
  });

  // Detecta login/logout (sessionStorage não emite eventos na mesma aba)
  useEffect(() => {
    const check = () => {
      const current = getCurrentUser();
      setUser((prev) => {
        if (prev === null && current === null) return prev;
        if (prev !== null && current !== null && prev.codigo === current.codigo)
          return prev;
        return current;
      });
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const isFirstMount = useRef(true);

  // Conecta/desconecta socket quando usuário muda
  useEffect(() => {
    if (!user) {
      disconnect();
      // Só limpa notificações em logout explícito, não no mount inicial
      if (!isFirstMount.current) {
        clearAllNotifications();
      }
      isFirstMount.current = false;
      return;
    }
    isFirstMount.current = false;
    connect({
      type: WebsocketType.GED_BATCH,
      nome: user.nome,
      id: user.codigo,
    });
  }, [user, connect, disconnect]);

  /**
   * Handler de notificação In-App global — permanece ativo em qualquer página.
   * Registra no sininho/avatar independente de qual componente está montado.
   */
  const handleBatchNotification = useCallback(
    (payload: GedBatchStatusPayload) => {
      const dedupeKey = `ged-batch:${payload.jobId}:${payload.status}`;

      if (payload.status === "completed") {
        addNotification({
          title: "✅ Lote concluído",
          message: "O download em lote foi processado com sucesso.",
          type: "success",
          source: "GED Batch",
          category: "ged-batch",
          dedupeKey,
          actionUrl: payload.result?.zipUrl,
          actionLabel: "Baixar ZIP",
        });
        sendLocalNotification("✅ Lote de Arquivos Pronto", {
          body: "Os arquivos foram processados. Clique para abrir os documentos.",
          onClickUrl: payload.result?.zipUrl || "/servicos",
        });
      } else if (payload.status === "partial") {
        addNotification({
          title: "⚠️ Lote concluído com pendências",
          message: `${payload.succeededFuncionarios} de ${payload.totalFuncionarios} prontuário(s) gerados.`,
          type: "warning",
          source: "GED Batch",
          category: "ged-batch",
          dedupeKey,
          actionUrl: payload.result?.zipUrl,
          actionLabel: "Baixar ZIP",
        });
        sendLocalNotification("⚠️ Lote Finalizado com Pendências", {
          body: `${payload.succeededFuncionarios} de ${payload.totalFuncionarios} prontuário(s) gerados.`,
          onClickUrl: payload.result?.zipUrl || "/servicos",
        });
      } else if (payload.status === "failed") {
        addNotification({
          title: "❌ Lote falhou",
          message: "Nenhum prontuário pôde ser gerado.",
          type: "error",
          source: "GED Batch",
          category: "ged-batch",
          dedupeKey,
        });
        sendLocalNotification("❌ Falha no Lote", {
          body: "Nenhum prontuário pôde ser gerado.",
        });
      }
    },
    []
  );

  /**
   * Registra o handler de notificação global no slot do socket.
   * Fica ativo enquanto nenhum filho (FileExplorer) estiver montado.
   */
  useEffect(() => {
    const unsub = registerHandlers({
      "ged-batch:status": handleBatchNotification as never,
    });
    return unsub;
  }, [registerHandlers, handleBatchNotification]);

  /**
   * registerHandlers encapsulado exposto via Context.
   *
   * Problema do useSocket original: registerHandlers tem slot único.
   * Quando FileExplorer chama registerHandlers, SOBRESCREVE o handler do Provider.
   * Quando FileExplorer desmonta, zera o handlersRef → nenhum handler ativo.
   *
   * Solução: sempre injetar handleBatchNotification JUNTO com o handler do filho.
   * No cleanup do filho, re-registrar apenas o handler de notificação global.
   */
  const wrappedRegisterHandlers = useCallback(
    (handlers: Partial<CustomEventMap>) => {
      // Combina: handler do filho + handler global de notificação
      const combined: Partial<CustomEventMap> = {
        ...handlers,
        "ged-batch:status": ((payload: GedBatchStatusPayload) => {
          // Dispara notificação global (sempre)
          handleBatchNotification(payload);
          // Dispara handler do filho se existir (atualiza UI de progresso)
          (handlers["ged-batch:status"] as ((p: GedBatchStatusPayload) => void) | undefined)?.(payload);
        }) as never,
      };

      const childCleanup = registerHandlers(combined);

      return () => {
        // Remove o handler combinado do socket
        childCleanup?.();
        // Re-registra apenas o handler de notificação global
        // para que o sininho continue funcionando após o filho desmontar
        registerHandlers({
          "ged-batch:status": handleBatchNotification as never,
        });
      };
    },
    [registerHandlers, handleBatchNotification]
  );

  return (
    <GedBatchSocketContext.Provider value={{ registerHandlers: wrappedRegisterHandlers }}>
      {children}
    </GedBatchSocketContext.Provider>
  );
}
