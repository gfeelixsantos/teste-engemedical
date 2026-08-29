"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { addToast } from "@heroui/react";

import { IUserWebsocket } from "@/lib/user/interfaces/IUser";
import { CustomEventMap } from "@/lib/websocket/events/events";
import { getDynamicNestUrl } from "@/config/constants";

type SocketState = "disconnected" | "connecting" | "connected" | "reconnecting";

interface UseSocketOptions {
  showLifecycleToasts?: boolean;
}

export function useSocket(options?: UseSocketOptions) {
  const showToasts = options?.showLifecycleToasts ?? true;
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<SocketState>("disconnected");
  const stateRef = useRef<SocketState>("disconnected");
  const wasEverConnectedRef = useRef(false);
  const reconnectToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<Partial<CustomEventMap>>({});
  const hasRegisteredSocketHandlersRef = useRef(false);

  const connected = state === "connected";
  const isReconnecting = state === "reconnecting";

  const updateState = useCallback((newState: SocketState) => {
    stateRef.current = newState;
    setState(newState);
  }, []);

  const registerSocketHandlers = useCallback((s: Socket) => {
    if (hasRegisteredSocketHandlersRef.current) return;

    s.on("connect", () => {
      const prevState = stateRef.current;

      if (prevState === "reconnecting") {
        updateState("connected");
      } else {
        updateState("connected");

        if (showToasts && !wasEverConnectedRef.current) {
          wasEverConnectedRef.current = true;
          addToast({
            title: "Conectado",
            description: "Conexão estabelecida com o servidor.",
            severity: "success",
            color: "foreground",
            variant: "flat",
          });
        }
      }

      if (reconnectToastTimerRef.current) {
        clearTimeout(reconnectToastTimerRef.current);
        reconnectToastTimerRef.current = null;
      }
    });

    s.on("disconnect", (reason: string) => {
      if (reason === "io client disconnect") {
        updateState("disconnected");
        wasEverConnectedRef.current = false;
        return;
      }

      if (stateRef.current === "connected") {
        updateState("reconnecting");

        if (showToasts) {
          reconnectToastTimerRef.current = setTimeout(() => {
            if (stateRef.current === "reconnecting") {
              addToast({
                title: "Reconectando...",
                description: "Tentando restabelecer conexão",
                severity: "warning",
                color: "foreground",
                variant: "flat",
              });
            }
          }, 2000);
        }
      }
    });

    s.on("connect_error", () => {
      if (stateRef.current === "connecting") {
        updateState("disconnected");

        if (showToasts) {
          addToast({
            title: "Erro de conexão",
            description: "Não foi possível conectar ao servidor",
            severity: "danger",
            color: "foreground",
            variant: "flat",
          });
        }
      }
    });

    s.on("reconnect_failed", () => {
      updateState("disconnected");
      wasEverConnectedRef.current = false;

      if (reconnectToastTimerRef.current) {
        clearTimeout(reconnectToastTimerRef.current);
        reconnectToastTimerRef.current = null;
      }

      if (showToasts) {
        addToast({
          title: "Falha na reconexão",
          description:
            "Não foi possível restabelecer a conexão após múltiplas tentativas.",
          severity: "danger",
          color: "foreground",
          variant: "flat",
        });
      }
    });

    hasRegisteredSocketHandlersRef.current = true;
  }, [updateState]);

  // Ref que armazena os wrappers estáveis (um por evento) para re-anexar após reconexão
  const stableWrappersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());
  // Ref que guarda o último auth para comparação de idempotência
  const lastAuthRef = useRef<IUserWebsocket | null>(null);

  const connect = useCallback(
    (auth: IUserWebsocket) => {
      // Guard de idempotência: evita criar nova conexão se já está conectado
      // com os mesmos parâmetros (unidade + sala + nome)
      if (
        socketRef.current?.connected &&
        stateRef.current === "connected" &&
        lastAuthRef.current?.unidade === auth.unidade &&
        lastAuthRef.current?.sala === auth.sala &&
        lastAuthRef.current?.nome === auth.nome
      ) {
        console.debug("[useSocket] Já conectado com o mesmo contexto, ignorando chamada duplicada.");
        return;
      }

      lastAuthRef.current = auth;

      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } catch {}
        socketRef.current = null;
      }

      hasRegisteredSocketHandlersRef.current = false;
      wasEverConnectedRef.current = false;
      updateState("connecting");

      const s = io(getDynamicNestUrl(), {
        auth,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
        upgrade: false,
        rememberUpgrade: true,
      });

      socketRef.current = s;

      registerSocketHandlers(s);

      // Re-anexa os wrappers estáveis ao novo socket (sem recriar closures)
      if (stableWrappersRef.current.size > 0) {
        stableWrappersRef.current.forEach((wrapper, event) => {
          s.off(event as any);
          s.on(event as any, wrapper as any);
        });
      }
    },
    [registerSocketHandlers, updateState],
  );

  const disconnect = useCallback(() => {
    if (reconnectToastTimerRef.current) {
      clearTimeout(reconnectToastTimerRef.current);
      reconnectToastTimerRef.current = null;
    }

    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    hasRegisteredSocketHandlersRef.current = false;
    wasEverConnectedRef.current = false;
    updateState("disconnected");
  }, [updateState]);

  const registerHandlers = useCallback(
    (handlers: Partial<CustomEventMap>) => {
      // Atualiza a ref com os handlers mais recentes (closures atualizados)
      handlersRef.current = { ...handlers };

      if (socketRef.current) {
        Object.entries(handlers).forEach(([event]) => {
          // Cria um wrapper estável apenas uma vez por evento.
          // O wrapper sempre lê o handler atual via handlersRef, garantindo
          // que closures nunca fiquem "congelados" após re-renders.
          if (!stableWrappersRef.current.has(event)) {
            const wrapper = (...args: any[]) => {
              const currentFn = handlersRef.current[event as keyof CustomEventMap];
              if (currentFn) (currentFn as any)(...args);
            };
            stableWrappersRef.current.set(event, wrapper);
          }

          const wrapper = stableWrappersRef.current.get(event)!;
          socketRef.current!.off(event as any);
          socketRef.current!.on(event as any, wrapper as any);
        });
      }

      return () => {
        // Não remove os wrappers do mapa — eles serão reutilizados na próxima reconexão.
        // Apenas limpa a ref de handlers para que o wrapper não chame funções obsoletas.
        handlersRef.current = {};
      };
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (reconnectToastTimerRef.current) {
        clearTimeout(reconnectToastTimerRef.current);
      }

      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } catch {}
        socketRef.current = null;
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    isReconnecting,
    connect,
    disconnect,
    registerHandlers,
  };
}
