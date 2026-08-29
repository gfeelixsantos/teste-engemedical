"use client";

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Slider,
  Spinner,
} from "@heroui/react";
import {
  Camera,
  CameraOff,
  Copy,
  Link2,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  Video,
  Volume2,
} from "lucide-react";
import { addToast } from "@heroui/react";

import {
  emitEvent,
  EventType,
  onEvent,
  TeleatendimentoCallStatusPayload,
  TeleatendimentoChatPayload,
  TeleatendimentoSessionSyncPayload,
  TeleatendimentoSignalPayload,
} from "@/lib/websocket/events/events";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import {
  NEST_FACIAL_SESSION,
  NEST_FACIAL_STATUS,
  NEST_FACIAL_FINALIZE,
  NEST_TELEATENDIMENTO_INVITE,
  NEST_TELEATENDIMENTO_SESSION,
  resolveTeleatendimentoWsUrl,
} from "@/config/constants";
import { TeleatendimentoWebRtcClient } from "@/lib/teleatendimento/webrtc-client";
import { getCurrentUser } from "@/lib/utils";
import {
  TeleatendimentoChatMessage,
  listChatMessages,
  saveChatMessage,
} from "@/lib/teleatendimento/chat-storage";

type Props = {
  role: "PROFESSIONAL" | "EMPLOYEE";
  sessionId?: string;
  inviteToken?: string;
  layout?: "full" | "pip";
  headerNote?: string;
  unidade?: string;
  sala?: string;
  exame?: string;
  onEndSession?: () => void;
};

type SessionView = TeleatendimentoSessionSyncPayload & {
  schedulingId: string;
  unidade?: string;
  sala?: string;
  exame?: string;
  inviteUrl?: string;
  professionalUrl?: string;
  employee: TeleatendimentoSessionSyncPayload["employee"] & {
    id?: string;
    companyCode?: string;
    prontuarioCode?: string;
    examType?: string;
  };
  professional: TeleatendimentoSessionSyncPayload["professional"] & {
    id?: string;
  };
};

const describeMediaError = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === "NotSupportedError") {
      return error.message;
    }
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Camera ou microfone sem permissao. Libere o acesso no navegador e tente novamente.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Nenhuma camera ou microfone compativel foi encontrado neste dispositivo.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Nao foi possivel preparar camera e microfone.";
};

export type TeleatendimentoPanelHandle = {
  endSession: () => Promise<void>;
};

const TeleatendimentoPanel = forwardRef<TeleatendimentoPanelHandle, Props>(function TeleatendimentoPanel(
  { role,
  sessionId,
  inviteToken,
  layout = "full",
  headerNote,
  unidade,
  sala,
  exame,
  onEndSession }: Props,
  ref,
) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const isIdle = !sessionId && !inviteToken && !session;
  const [statusMessage, setStatusMessage] = useState("Aguardando inicio da chamada.");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<TeleatendimentoChatMessage[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [remoteVolume, setRemoteVolume] = useState(80);
  const [inviteUrl, setInviteUrl] = useState("");
  const [facialLink, setFacialLink] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const queueSocketRef = useRef<any>(null);

  // Máquina de estados da assinatura facial
  const [facialState, setFacialState] = useState<"idle" | "requesting" | "waiting" | "finalizing" | "completed" | "error">("idle");
  const [facialRequestId, setFacialRequestId] = useState<string | null>(null);
  const [facialNonce, setFacialNonce] = useState<string | null>(null);
  const [facialEvidenceUrl, setFacialEvidenceUrl] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const webRtcRef = useRef<TeleatendimentoWebRtcClient | null>(null);
  const idleStreamRef = useRef<MediaStream | null>(null);
  const offerStartedRef = useRef(false);

  const title = useMemo(
    () => role === "PROFESSIONAL" ? "Sala do Profissional" : "Entrada do Funcionario",
    [role],
  );

  const chatMessages = useMemo(
    () => [...messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    [messages],
  );
  const isFacialBusy = facialState === "requesting" || facialState === "waiting" || facialState === "finalizing";
  const facialActionLabel =
    facialState === "requesting"
      ? "Solicitando..."
      : facialState === "waiting"
        ? "Aguardando assinatura..."
        : facialState === "finalizing"
          ? "Finalizando..."
          : facialState === "completed"
            ? "Facial autenticada"
            : facialState === "error"
              ? "Tentar novamente"
              : "Solicitar assinatura";
  const facialHelperText =
    facialState === "waiting"
      ? "O link foi gerado e a conclusão será detectada automaticamente."
      : facialState === "finalizing"
        ? "Processando a confirmação da assinatura facial."
        : facialState === "completed"
          ? "A captura foi concluída e as evidências estão disponíveis."
          : facialState === "error"
            ? "Houve um problema na captura. Tente novamente."
            : "Use a captura facial quando o funcionário estiver pronto.";
  const facialActionDisabled = role !== "PROFESSIONAL" || !session || isFacialBusy;
  const formatMessageTime = (sentAt: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(sentAt));

  const renderMessageText = (text: string, isMe?: boolean) => {
    if (text.startsWith("[CAPTURA_FACIAL]:")) {
      const link = text.replace("[CAPTURA_FACIAL]:", "").trim();
      return (
        <div className={`mt-1 p-2.5 rounded-lg border space-y-1 font-normal ${
          isMe 
            ? "border-emerald-500 bg-emerald-700 text-white" 
            : "border-sky-250 bg-sky-50 text-sky-950 shadow-sm"
        }`}>
          <div className="flex items-center gap-1.5 font-semibold text-xs">
            <ShieldCheck className={`h-4 w-4 flex-shrink-0 ${isMe ? "text-white" : "text-sky-600"}`} />
            <span>Autenticação Facial Solicitada</span>
          </div>
          <p className={`text-[10px] leading-tight ${isMe ? "text-emerald-100" : "text-sky-700"}`}>
            Clique no botão para realizar a captura e autenticação facial para este atendimento.
          </p>
          <div className="flex gap-1.5 pt-1">
            <Button
              color="primary"
              size="sm"
              className={`text-[10px] font-medium px-2.5 py-1 h-auto min-h-0 rounded shadow-sm ${
                isMe ? "bg-white text-emerald-800" : "bg-sky-600 text-white"
              }`}
              onPress={() => window.open(link, "_blank", "noopener,noreferrer")}
            >
              Iniciar Captura
            </Button>
            <Button
              color="primary"
              variant="flat"
              size="sm"
              className={`text-[10px] px-2.5 py-1 h-auto min-h-0 rounded ${
                isMe ? "bg-emerald-800/50 text-white border border-emerald-500" : ""
              }`}
              onPress={() => {
                navigator.clipboard.writeText(link);
                addToast({ title: "Copiado", description: "Link copiado.", severity: "success", color: "foreground", variant: "flat" });
              }}
            >
              Copiar Link
            </Button>
          </div>
        </div>
      );
    }
    return <span className="break-all whitespace-pre-wrap">{text}</span>;
  };



  const employeeExamLabel = session?.exame || session?.employee.examType || "Teleatendimento";
  const employeeMetaLabel = [
    session?.employee.prontuarioCode ? `Prontuario ${session.employee.prontuarioCode}` : "",
    session?.employee.companyCode ? `Empresa ${session.employee.companyCode}` : "",
  ].filter(Boolean).join(" • ");

  const canSendChat = Boolean(socketRef.current && socketConnected && session);
  const socketUrl = useMemo(() => resolveTeleatendimentoWsUrl(), []);
  const joinButtonLabel = socketConnected ? "Conectado" : joinLoading ? "Entrando..." : "Entrar na Chamada";
  const joinHint = socketConnected
    ? "Áudio, vídeo e chat liberados nesta sessão."
    : "Permita o uso da câmera e do microfone para entrar na chamada e liberar o chat.";

  // --- Session loader ---
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isIdle) {
        setLoading(false);
        setStatusMessage("Teleatendimento ativado. Aguardando paciente...");
        try {
          if (idleStreamRef.current) {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = idleStreamRef.current;
            }
            return;
          }
          if (!navigator.mediaDevices?.getUserMedia) {
            console.warn("[Idle] Camera preview unavailable: insecure context (HTTP on non-localhost).");
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          idleStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.warn("Could not preview camera in idle mode:", error);
        }
        return;
      }

      try {
        setLoading(true);
        const url =
          role === "PROFESSIONAL" || (role === "EMPLOYEE" && sessionId && !inviteToken)
            ? `${NEST_TELEATENDIMENTO_SESSION}/${sessionId}`
            : `${NEST_TELEATENDIMENTO_INVITE}${inviteToken}`;
        const response = await fetch(url, { credentials: "same-origin" });
        if (!response.ok) throw new Error("Nao foi possivel carregar a sessao de teleatendimento.");
        const data = await response.json();
        if (!cancelled) {
          setSession(data);
          setInviteUrl(
            normalizeShareableUrl(
              role === "PROFESSIONAL" ? data?.inviteUrl || "" : window.location.href,
            ),
          );
        }
        if (!cancelled && data?.sessionId) {
          const stored = await listChatMessages(data.sessionId);
          setMessages(stored);
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error instanceof Error ? error.message : "Erro ao abrir a videochamada.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  // NOTE: unidade/sala/exame are intentionally excluded — they only affect the queue socket
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken, role, sessionId]);

  // --- Queue socket (profissional idle) ---
  useEffect(() => {
    if (isIdle && role === "PROFESSIONAL" && unidade && sala) {
      const currentUser = getCurrentUser();
      const socket = io(resolveTeleatendimentoWsUrl(), {
        auth: {
          unidade,
          sala,
          nome: currentUser?.nome || 'Profissional',
          type: WebsocketType.TELEATENDIMENTO,
        },
        transports: ["websocket"],
        upgrade: false,
        forceNew: true,
      });

      queueSocketRef.current = socket;

      socket.on("connect", () => {
        setSocketConnected(true);
        emitEvent(socket as any, EventType.TELEATENDIMENTO_SUBSCRIBE_QUEUE, { unidade, sala, exame });
      });

      socket.on("connect_error", (err) => {
        console.error("[QUEUE] connect_error:", err.message);
      });

      onEvent(socket as any, EventType.TELEATENDIMENTO_QUEUE_UPDATE, ((payload: unknown) => {
        const p = payload as { queue: any[] };
        setQueue(p.queue || []);
      }) as any);

      onEvent(socket as any, EventType.TELEATENDIMENTO_SESSION_SYNC, ((payload: TeleatendimentoSessionSyncPayload) => {
        setSession((prev) => prev ? { ...prev, ...payload } : (payload as SessionView));
      }) as any);

      socket.on("disconnect", () => {
        setSocketConnected(false);
      });

      return () => {
        socket.disconnect();
        queueSocketRef.current = null;
        setSocketConnected(false);
      };
    }
  }, [isIdle, role, unidade, sala, exame]);

  // --- Remote volume ---
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.volume = remoteVolume / 100;
  }, [remoteVolume]);

  // --- Facial signature status polling ---
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    if (
      facialState === "waiting" &&
      facialRequestId &&
      session?.schedulingId &&
      facialNonce
    ) {
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(`${NEST_FACIAL_STATUS}${facialRequestId}`, { credentials: "same-origin" });
          if (!res.ok) return;
          const statusData = await res.json();
          if (statusData.isComplete) {
            if (pollingInterval) clearInterval(pollingInterval);
            setFacialState("finalizing");

            const finalizeRes = await fetch(NEST_FACIAL_FINALIZE, {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                schedulingId: session.schedulingId,
                requestId: facialRequestId,
                documentNonce: facialNonce,
              }),
            });
            if (finalizeRes.ok) {
              const finalizeData = await finalizeRes.json();
              setFacialEvidenceUrl(finalizeData.relatorioEvidenciasUrl || null);
              setFacialState("completed");
              addToast({
                title: "Facial autenticada",
                description: "O termo facial foi assinado com sucesso.",
                severity: "success",
                color: "foreground",
                variant: "flat",
              });
            } else {
              setFacialState("error");
              addToast({
                title: "Erro na finalização",
                description: "Não foi possível finalizar a autenticação.",
                severity: "danger",
                color: "foreground",
                variant: "flat",
              });
            }
          }
        } catch (err) {
          console.error("Erro no polling da assinatura facial:", err);
        }
      }, 4000);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [facialState, facialRequestId, session?.schedulingId, facialNonce]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      console.log("[VC] cleanup on unmount - disconnecting socket and destroying WebRTC");
      socketRef.current?.disconnect();
      webRtcRef.current?.destroy();
      if (idleStreamRef.current) idleStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // --- Auto-connect on session load ---
  useEffect(() => {
    if (session && !socketRef.current && !joinLoading) {
      void connectCall();
    }
  }, [session, joinLoading]);

  const appendMessage = async (message: TeleatendimentoChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.messageId === message.messageId)) return prev;
      return [...prev, message].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    });
    await saveChatMessage(message);
  };

  const connectCall = async () => {
    if (!session) return;
    if (socketRef.current) return;
    console.log("[VC] connectCall: role:", role, "sessionId:", session.sessionId, "hasIdleStream:", !!idleStreamRef.current);
    setJoinLoading(true);

    // Helper: creates and sets up socket listeners (used in both the happy path and the media-failure fallback)
    const setupSocket = (
      webRtc: import("@/lib/teleatendimento/webrtc-client").TeleatendimentoWebRtcClient | null,
      sessionSnap: SessionView,
    ) => {
      const socket = io(socketUrl, {
        auth: {
          unidade: sessionSnap.unidade || "",
          sala: sessionSnap.sala || "",
          nome: role === "PROFESSIONAL" ? sessionSnap.professional.name : sessionSnap.employee.name,
          type: WebsocketType.TELEATENDIMENTO,
        },
        transports: ["websocket"],
        upgrade: false,
        forceNew: true,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setSocketConnected(true);
        setStatusMessage(role === "PROFESSIONAL" ? "Sala pronta. Aguardando o funcionário entrar." : "Sala pronta. Aguardando o profissional entrar.");
        emitEvent(socket as any, EventType.TELEATENDIMENTO_JOIN, {
          role,
          sessionId: sessionSnap.sessionId,
          inviteToken: role === "EMPLOYEE" ? inviteToken : undefined,
        });
      });

      socket.on("connect_error", (error) => {
        console.error("[VC] socket connect_error:", error.message);
        setSocketConnected(false);
        setStatusMessage(error instanceof Error ? error.message : "Não foi possível conectar ao sistema de videochamada.");
        socket.disconnect();
        socketRef.current = null;
        webRtcRef.current?.destroy();
        webRtcRef.current = null;
      });

      socket.on("disconnect", () => setSocketConnected(false));

      onEvent(socket as any, EventType.TELEATENDIMENTO_SESSION_SYNC, async (payload: TeleatendimentoSessionSyncPayload) => {
        console.log("[VC] session_sync: professional.connected:", payload.professional.connected, "employee.connected:", payload.employee.connected, "offerStartedRef:", offerStartedRef.current, "hasWebRtc:", !!webRtc);
        setSession((prev) => prev ? { ...prev, ...payload } : (payload as SessionView));
        if (
          webRtc &&
          role === "PROFESSIONAL" &&
          payload.professional.connected &&
          payload.employee.connected &&
          !offerStartedRef.current
        ) {
          console.log("[VC] session_sync: BOTH connected, calling createOffer()");
          offerStartedRef.current = true;
          await webRtc.createOffer();
        }
      });

      const handleCallEnded = () => {
        console.log("[VC] handleCallEnded: role:", role);
        offerStartedRef.current = false;
        if (role === "PROFESSIONAL") {
          addToast({
            title: "Sessão encerrada pelo funcionário",
            description: "O funcionário encerrou ou saiu da videochamada. Você voltará para a fila de atendimento.",
            severity: "warning",
            color: "foreground",
            variant: "flat",
          });
          socket.disconnect();
          socketRef.current = null;
          webRtcRef.current?.destroy(false);
          webRtcRef.current = null;
          setSocketConnected(false);
          setSession(null);
          setStatusMessage("Sessão encerrada pelo funcionário.");
          setMicEnabled(false);
          setCameraEnabled(false);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
          
          // Reset facial signature states
          setFacialState("idle");
          setFacialRequestId(null);
          setFacialNonce(null);
          setFacialLink("");
          setFacialEvidenceUrl(null);

          if (unidade && sala && queueSocketRef.current) {
            emitEvent(queueSocketRef.current, EventType.TELEATENDIMENTO_SUBSCRIBE_QUEUE, { unidade, sala, exame });
          }
          onEndSession?.();
        } else {
          addToast({
            title: "Chamada encerrada",
            description: "A chamada de teleatendimento foi encerrada.",
            severity: "warning",
            color: "foreground",
            variant: "flat",
          });
          socket.disconnect();
          socketRef.current = null;
          webRtcRef.current?.destroy(true); // Stop tracks for employee
          webRtcRef.current = null;
          setSocketConnected(false);
          setSession(null);
          setStatusMessage("Chamada encerrada.");
          onEndSession?.();
        }
      };

      onEvent(socket as any, EventType.TELEATENDIMENTO_CALL_STATUS, (payload: TeleatendimentoCallStatusPayload) => {
        console.log("[VC] call_status:", payload.status, "message:", payload.message, "role:", payload.role);
        setStatusMessage(payload.message);
        if (
          payload.status === "ended" ||
          payload.status === "expired" ||
          (payload.status === "left" && payload.role === (role === "PROFESSIONAL" ? "EMPLOYEE" : "PROFESSIONAL"))
        ) {
          handleCallEnded();
        }
      });

      if (webRtc) {
        onEvent(socket as any, EventType.TELEATENDIMENTO_OFFER, async (payload: TeleatendimentoSignalPayload) => {
          console.log("[VC] signal: OFFER received");
          await webRtc.handleOffer(payload.payload);
        });
        onEvent(socket as any, EventType.TELEATENDIMENTO_ANSWER, async (payload: TeleatendimentoSignalPayload) => {
          console.log("[VC] signal: ANSWER received");
          await webRtc.handleAnswer(payload.payload);
        });
        onEvent(socket as any, EventType.TELEATENDIMENTO_ICE_CANDIDATE, async (payload: TeleatendimentoSignalPayload) => {
          console.log("[VC] signal: ICE_CANDIDATE received");
          await webRtc.handleIceCandidate(payload.payload);
        });
      }

      onEvent(socket as any, EventType.TELEATENDIMENTO_CHAT_MESSAGE, async (payload: TeleatendimentoChatPayload) => {
        await appendMessage(payload);
      });
    };

    try {
      const webRtc = new TeleatendimentoWebRtcClient(
        {
          onRemoteStream: (stream) => {
            console.log("[VC] onRemoteStream: videoTracks:", stream.getVideoTracks().length, "audioTracks:", stream.getAudioTracks().length, "active:", stream.active);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
          },
          onConnectionStateChange: (state) => {
            console.log("[VC] connectionState:", state);
            const stateLabels: Record<string, string> = {
              new: "Iniciando",
              connecting: "Conectando",
              connected: "Conectado",
              disconnected: "Desconectado",
              failed: "Falhou",
              closed: "Fechado"
            };
            setStatusMessage(`Estado da conexão: ${stateLabels[state] || state}`);
          },
          onIceConnectionStateChange: (state) => {
            console.log("[VC] iceConnectionState:", state);
            if (state === "connected") setStatusMessage("Chamada de vídeo conectada com sucesso.");
          },
        },
        (payload) => emitEvent(socketRef.current as any, EventType.TELEATENDIMENTO_OFFER, { sessionId: session.sessionId, payload }),
        (payload) => emitEvent(socketRef.current as any, EventType.TELEATENDIMENTO_ANSWER, { sessionId: session.sessionId, payload }),
        (payload) => emitEvent(socketRef.current as any, EventType.TELEATENDIMENTO_ICE_CANDIDATE, { sessionId: session.sessionId, payload }),
        idleStreamRef.current, // Pass pre-existing stream
      );

      // Try to get camera/mic — failure is non-fatal, chat will still work
      let mediaOk = true;
      try {
        const stream = await webRtc.ensureLocalStream();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (mediaError) {
        mediaOk = false;
        const mediaMessage = describeMediaError(mediaError);
        console.warn("[VC] ensureLocalStream FAILED:", mediaError);
        addToast({
          title: "Câmera/microfone indisponíveis",
          description: `${mediaMessage} O chat ainda está disponível.`,
          severity: "warning",
          color: "foreground",
          variant: "flat",
        });
        setStatusMessage(`Aviso: ${mediaMessage} O chat ainda está disponível.`);
        webRtc.destroy(false); // Do not stop tracks on failure, might be using idleStream
      }

      webRtcRef.current = mediaOk ? webRtc : null;
      setupSocket(mediaOk ? webRtc : null, session);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel iniciar a videochamada.";
      setSocketConnected(false);
      setStatusMessage(message);
    } finally {
      setJoinLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !socketRef.current || !socketConnected || !session) {
      setStatusMessage("O chat só fica disponível quando a chamada estiver ativa.");
      return;
    }
    const message: TeleatendimentoChatMessage = {
      sessionId: session.sessionId,
      messageId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      authorRole: role,
      authorName: role === "PROFESSIONAL" ? session.professional.name : session.employee.name,
      text: chatInput.trim(),
      sentAt: new Date().toISOString(),
    };
    await appendMessage(message);
    emitEvent(socketRef.current as any, EventType.TELEATENDIMENTO_CHAT_MESSAGE, message);
    setChatInput("");
  };

  const chamarPaciente = (schedulingId: string) => {
    // queueSocketRef is always connected while idle; prefer it over the call socket
    const sock = queueSocketRef.current || socketRef.current;
    if (sock && role === "PROFESSIONAL" && unidade && sala) {
      emitEvent(sock as any, EventType.TELEATENDIMENTO_CALL_FROM_QUEUE, {
        schedulingId,
        professionalName: "Profissional",
        unidade,
        sala,
        exame,
      });
    }
  };

  const toggleMic = () => {
    const next = !micEnabled;
    console.log("[VC] toggleMic:", next);
    setMicEnabled(next);
    webRtcRef.current?.setAudioEnabled(next);
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    console.log("[VC] toggleCamera:", next);
    setCameraEnabled(next);
    webRtcRef.current?.setVideoEnabled(next);
  };

  const normalizeShareableUrl = (value: string) => {
    if (!value) return value;

    try {
      return new URL(value, window.location.origin).toString();
    } catch {
      try {
        return encodeURI(value);
      } catch {
        return value;
      }
    }
  };

  const copyValue = async (value: string, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(normalizeShareableUrl(value));
    addToast({ title: "Copiado", description: `${label} copiado para a área de transferência.`, severity: "success", color: "foreground", variant: "flat" });
  };

  const requestFacial = async () => {
    if (role !== "PROFESSIONAL" || !session) return;
    try {
      setFacialState("requesting");
      const response = await fetch(NEST_FACIAL_SESSION, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulingId: session.schedulingId, funcionarioId: session.employee.id, signerName: session.employee.name }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sessão expirada. Recarregue a página e faça o login novamente.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Não foi possível iniciar a autenticação facial.");
      }
      const data = await response.json();
      const link = data.signatureLink || "";
      const reqId = data.requestId || "";
      const nonce = data.documentNonce || "";

      setFacialRequestId(reqId);
      setFacialNonce(nonce);
      setFacialLink(link);
      setFacialState("waiting");

      addToast({ title: "Link de captura gerado", description: "Compartilhe o link com o funcionário.", severity: "success", color: "foreground", variant: "flat" });

      if (link && socketRef.current && socketConnected) {
        const message: TeleatendimentoChatMessage = {
          sessionId: session.sessionId,
          messageId: `facial_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          authorRole: "PROFESSIONAL",
          authorName: session.professional.name,
          text: `[CAPTURA_FACIAL]:${link}`,
          sentAt: new Date().toISOString(),
        };
        await appendMessage(message);
        emitEvent(socketRef.current as any, EventType.TELEATENDIMENTO_CHAT_MESSAGE, message);
      }
    } catch (error) {
      setFacialState("error");
      addToast({ title: "Falha ao gerar link facial", description: error instanceof Error ? error.message : "Erro.", severity: "danger", color: "foreground", variant: "flat" });
    }
  };

  const endSession = async () => {
    console.log("[VC] endSession: role:", role, "sessionId:", session?.sessionId);
    if (socketRef.current && session?.sessionId) {
      emitEvent(socketRef.current as any, EventType.TELEATENDIMENTO_END, { sessionId: session.sessionId });
    }
    if (session?.sessionId) {
      try {
        await fetch(`${NEST_TELEATENDIMENTO_SESSION}/${session.sessionId}/end`, { method: "POST", credentials: "same-origin" });
      } catch {}
    }
    // Delay disconnect slightly to ensure events flush to TCP socket
    const s = socketRef.current;
    setTimeout(() => {
      s?.disconnect();
    }, 150);

    socketRef.current = null;
    webRtcRef.current?.destroy(role === "EMPLOYEE");
    webRtcRef.current = null;
    offerStartedRef.current = false;
    setSocketConnected(false);
    setSession(null);
    setStatusMessage("Sessão encerrada.");
    setMicEnabled(false);
    setCameraEnabled(false);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // Reset facial signature states
    setFacialState("idle");
    setFacialRequestId(null);
    setFacialNonce(null);
    setFacialLink("");
    setFacialEvidenceUrl(null);

    // Re-subscribe queue for professional
    if (role === "PROFESSIONAL" && unidade && sala && queueSocketRef.current) {
      emitEvent(queueSocketRef.current, EventType.TELEATENDIMENTO_SUBSCRIBE_QUEUE, { unidade, sala, exame });
    }
    onEndSession?.();
  };

  useImperativeHandle(ref, () => ({ endSession }), [endSession]);

  const renderActionPanel = (className = "") => (
    <div className={`rounded-xl border border-emerald-100 bg-white p-3 space-y-3 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#114e34]">Ações da chamada</p>
        <p className="text-[11px] text-gray-500 truncate">{facialHelperText}</p>
      </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {role === "PROFESSIONAL" && !isIdle && (
          <Button
            color="success"
            size="sm"
            startContent={<ShieldCheck className="h-4 w-4" />}
            variant={facialState === "completed" ? "solid" : "flat"}
            isLoading={facialState === "requesting"}
            isDisabled={facialActionDisabled}
            onPress={requestFacial}
          >
            {facialActionLabel}
          </Button>
        )}
        {role === "PROFESSIONAL" && (
          <Button
            color="danger"
            size="sm"
            startContent={<PhoneOff className="h-4 w-4" />}
            variant="flat"
            onPress={endSession}
          >
            Encerrar
          </Button>
        )}
      </div>

      {facialState === "completed" && facialEvidenceUrl && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-900 space-y-1">
          <div className="font-medium">Evidências geradas</div>
          <div className="flex flex-wrap gap-2">
            <Button color="success" size="sm" startContent={<Link2 className="h-3 w-3" />} variant="flat" onPress={() => window.open(facialEvidenceUrl, "_blank", "noopener,noreferrer")}>
              Ver evidências
            </Button>
            <Button color="success" size="sm" startContent={<Copy className="h-3 w-3" />} variant="flat" onPress={() => copyValue(facialEvidenceUrl, "Link de evidências")}>
              Copiar link
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // --- Loading screen ---
  if (loading) {
    return (
      <div className={`${layout === "full" ? "min-h-screen" : "h-full"} bg-[#f4faf6] flex items-center justify-center`}>
        <Spinner color="success" size="lg" />
      </div>
    );
  }

  if (!session && !isIdle) {
    return (
      <div className={`${layout === "full" ? "min-h-screen p-8" : "h-full p-2"} bg-[#f4faf6] flex items-center justify-center`}>
        <Card className="max-w-xl w-full border border-rose-200">
          <CardBody className="p-4 text-center text-rose-700 text-sm">{statusMessage}</CardBody>
        </Card>
      </div>
    );
  }

  /* ─── PIP layout (compacto — dentro do painel de atendimento) ─── */
  if (layout === "pip") {
    return (
      <div className="flex flex-col h-full bg-[#f4faf6] overflow-hidden">

        {/* Barra de ação superior */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-100 bg-white gap-2 flex-shrink-0">
          <div className="flex-1 min-w-0">
            {isIdle ? (
              <span className="text-xs text-emerald-700 font-medium">
                {socketConnected ? `● Fila conectada — ${queue.length} aguardando` : "● Conectando à fila..."}
              </span>
            ) : (
              <span className="text-xs text-gray-600 truncate">
                {session?.employee.name || statusMessage}
              </span>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {isIdle && (
              <Button
                color="success"
                size="sm"
                startContent={<Link2 className="h-3 w-3" />}
                variant="flat"
                onPress={() => {
                  const params = new URLSearchParams();
                  if (unidade) params.set("unidade", unidade);
                  if (sala) params.set("sala", sala);
                  if (exame) params.set("exame", exame);
                  const url = `${window.location.origin}/teleatendimento/totem${params.toString() ? `?${params.toString()}` : ""}`;
                  copyValue(normalizeShareableUrl(url), "Link da Sala de Espera");
                }}
              >
                Copiar Link
              </Button>
            )}
            {!isIdle && role === "PROFESSIONAL" && inviteUrl && (
              <Button color="success" size="sm" startContent={<Copy className="h-3 w-3" />} variant="flat" onPress={() => copyValue(inviteUrl, "Link do funcionario")}>
                Copiar link
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo principal */}
        {isIdle ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Preview câmera local */}
            <div className="rounded-xl overflow-hidden bg-black aspect-video w-full relative">
              <video ref={localVideoRef} autoPlay className="h-full w-full object-cover" muted playsInline />
              <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">Sua câmera</span>
            </div>

            {/* Fila */}
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#114e34]">Fila Virtual</span>
                <span className="text-[10px] text-gray-400">{queue.length} paciente(s)</span>
              </div>
              {queue.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Nenhum paciente aguardando no momento.</p>
              ) : (
                <div className="space-y-2">
                  {queue.map((item) => (
                    <div key={item.cpf} className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50 border border-gray-100">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-700 truncate">{item.nomeFuncionario || "Paciente"}</div>
                        <div className="text-[10px] text-gray-400">
                          Aguardando desde {new Date(item.joinedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <Button color="success" size="sm" variant="solid" className="ml-2 flex-shrink-0 text-xs" onPress={() => chamarPaciente(item.schedulingId)}>
                        INICIAR
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Em chamada */
          <div className="flex-1 flex flex-col overflow-hidden p-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
                <video ref={localVideoRef} autoPlay className="h-full w-full object-cover" muted playsInline />
                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-white">Você</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
                <video ref={remoteVideoRef} autoPlay className="h-full w-full object-cover" playsInline />
                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  {session?.employee.name || "Paciente"}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {statusMessage}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button color={micEnabled ? "success" : "danger"} isIconOnly size="sm" title={micEnabled ? "Desligar microfone" : "Ligar microfone"} variant="flat" onPress={toggleMic}>
                {micEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
              </Button>
              <Button color={cameraEnabled ? "success" : "danger"} isIconOnly size="sm" title={cameraEnabled ? "Desligar câmera" : "Ligar câmera"} variant="flat" onPress={toggleCamera}>
                {cameraEnabled ? <Camera className="h-3 w-3" /> : <CameraOff className="h-3 w-3" />}
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                <Volume2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <Slider aria-label="Volume do áudio" className="flex-1" color="success" maxValue={100} minValue={0} value={remoteVolume} onChange={(value) => setRemoteVolume(Number(value))} />
              </div>
              {!socketConnected && (
                <Button color="success" isLoading={joinLoading} size="sm" startContent={!joinLoading ? <Video className="h-3 w-3" /> : null} variant="solid" onPress={connectCall}>
                  Entrar
                </Button>
              )}
            </div>

            {renderActionPanel()}

            <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 space-y-1">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">Nenhuma mensagem ainda.</p>
              ) : (
                chatMessages.map((message) => (
                  <div key={message.messageId} className={`flex ${message.authorRole === role ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl border px-2.5 py-2 text-xs shadow-sm ${message.authorRole === role ? "bg-emerald-600 border-emerald-500 text-white rounded-br-sm" : "bg-gray-50 border-gray-200 text-gray-800 rounded-bl-sm"}`}>
                      <div className={`mb-1 flex items-center justify-between gap-2 text-[10px] ${message.authorRole === role ? "text-emerald-50/90" : "text-gray-500"}`}>
                        <span className="font-semibold truncate">{message.authorName}</span>
                        <span className="flex-shrink-0">{formatMessageTime(message.sentAt)}</span>
                      </div>
                      <div className={message.authorRole === role ? "text-white" : ""}>
                        {renderMessageText(message.text, message.authorRole === role)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-1">
              <Input
                isDisabled={!canSendChat}
                placeholder="Digite uma mensagem..."
                size="sm"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void sendChat(); } }}
              />
              <Button color="success" isDisabled={!canSendChat} size="sm" onPress={() => void sendChat()}>↑</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── FULL layout (tela do funcionário / rota /teleatendimento) ─── */
  return (
    <div className="min-h-screen p-3 bg-[#f4faf6] overflow-hidden">
      <div className="mx-auto max-w-7xl h-[calc(100vh-1.5rem)] flex flex-col gap-3">
        {/* Header */}
        <Card className="border border-emerald-100 shadow-sm">
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-[#114e34]">{title}</h1>
              {headerNote && !isIdle && (
                <p className="text-xs font-medium text-emerald-700">{headerNote}</p>
              )}
              {!isIdle && session && (
                <p className="text-sm text-gray-500">
                  {session.employee.name} • {employeeExamLabel}
                  {employeeMetaLabel ? ` • ${employeeMetaLabel}` : ""}
                  {role === "EMPLOYEE" && session.professional.name ? ` • Profissional: ${session.professional.name}` : ""}
                </p>
              )}
              {!isIdle && (
                <div className="flex gap-3 text-xs">
                  <span className={session?.professional.connected ? "text-emerald-600" : "text-gray-400"}>
                    ● Profissional {session?.professional.connected ? "conectado" : "aguardando"}
                  </span>
                  <span className={session?.employee.connected ? "text-emerald-600" : "text-gray-400"}>
                    ● Funcionário {session?.employee.connected ? "conectado" : "aguardando"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {role === "PROFESSIONAL" && inviteUrl && (
                <Button color="success" size="sm" startContent={<Copy className="h-4 w-4" />} variant="flat" onPress={() => copyValue(inviteUrl, "Link do funcionario")}>
                  Copiar link
                </Button>
              )}
              {!isIdle && role === "EMPLOYEE" && (
                <Button color="danger" size="sm" startContent={<PhoneOff className="h-4 w-4" />} variant="flat" onPress={endSession}>
                  Encerrar Chamada
                </Button>
              )}
              {isIdle && (
                <Button
                  color="success"
                  size="sm"
                  startContent={<Link2 className="h-4 w-4" />}
                  variant="flat"
                  onPress={() => {
                    const params = new URLSearchParams();
                    if (unidade) params.set("unidade", unidade);
                    if (sala) params.set("sala", sala);
                    if (exame) params.set("exame", exame);
                    const url = `${window.location.origin}/teleatendimento/totem${params.toString() ? `?${params.toString()}` : ""}`;
                    copyValue(normalizeShareableUrl(url), "Link da Sala de Espera");
                  }}
                >
                  Copiar Link da Sala
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid flex-1 min-h-0 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          {/* Coluna principal — vídeo + controles */}
          <Card className="border border-emerald-100 shadow-sm h-full min-h-0">
            <CardBody className="p-3 space-y-3 h-full min-h-0 flex flex-col">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
                  <video ref={localVideoRef} autoPlay className="h-full w-full object-cover" muted playsInline />
                  <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">Seu vídeo</span>
                </div>
                <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
                  <video ref={remoteVideoRef} autoPlay className="h-full w-full object-cover" playsInline />
                  <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                    {role === "PROFESSIONAL" ? "Funcionário" : "Profissional"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button color={micEnabled ? "success" : "danger"} size="sm" startContent={micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} variant="flat" onPress={toggleMic}>
                  {micEnabled ? "Microfone ligado" : "Microfone desligado"}
                </Button>
                <Button color={cameraEnabled ? "success" : "danger"} size="sm" startContent={cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />} variant="flat" onPress={toggleCamera}>
                  {cameraEnabled ? "Câmera ligada" : "Câmera desligada"}
                </Button>
                <div className="min-w-[240px] flex items-center gap-3">
                  <Volume2 className="h-4 w-4 text-gray-500" />
                  <Slider aria-label="Volume do áudio" className="max-w-xs" color="success" maxValue={100} minValue={0} value={remoteVolume} onChange={(value) => setRemoteVolume(Number(value))} />
                </div>
                <div className="flex flex-col gap-1">
                  {!socketConnected ? (
                    <Button color="success" isLoading={joinLoading} size="md" startContent={!joinLoading ? <Video className="h-4 w-4" /> : null} variant="solid" onPress={connectCall}>
                      {joinButtonLabel}
                    </Button>
                  ) : (
                    <Button color="success" size="md" variant="flat">{joinButtonLabel}</Button>
                  )}
                  <span className="text-xs text-gray-500">{joinHint}</span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {statusMessage}
              </div>

              {renderActionPanel()}
            </CardBody>
          </Card>

          {/* Coluna lateral — fila ou chat */}
          <Card className="border border-emerald-100 shadow-sm h-full min-h-0">
            {isIdle ? (
              <CardBody className="p-3 space-y-3 h-full min-h-0 flex flex-col">
                <div>
                  <h2 className="text-base font-semibold text-[#114e34]">Fila Virtual</h2>
                  <p className="text-xs text-gray-500">Pacientes aguardando no Totem para esta sala.</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                  {queue.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum paciente na fila virtual no momento.</p>
                  ) : (
                    queue.map((item) => (
                      <div key={item.cpf} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm bg-gray-50 border border-gray-200">
                        <div>
                          <div className="font-medium text-gray-700">{item.nomeFuncionario || "Paciente"}</div>
                          <div className="mt-1 text-[11px] text-gray-400">
                            Entrou às {new Date(item.joinedAt).toLocaleTimeString("pt-BR")}
                          </div>
                        </div>
                        <Button color="success" size="sm" variant="solid" onPress={() => chamarPaciente(item.schedulingId)}>
                          INICIAR
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            ) : (
              <CardBody className="p-3 space-y-3 h-full min-h-0 flex flex-col">
                <div>
                  <h2 className="text-base font-semibold text-[#114e34]">Chat</h2>
                  <p className="text-xs text-gray-500">Histórico local desta sessão.</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhuma mensagem enviada ainda.</p>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.messageId} className={`flex ${message.authorRole === role ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${message.authorRole === role ? "bg-emerald-600 border-emerald-500 text-white rounded-br-sm" : "bg-gray-50 border-gray-200 text-gray-800 rounded-bl-sm"}`}>
                          <div className={`mb-1 flex items-center justify-between gap-2 text-[11px] ${message.authorRole === role ? "text-emerald-50/90" : "text-gray-500"}`}>
                            <div className="font-semibold truncate">{message.authorName}</div>
                            <div className="flex-shrink-0">{formatMessageTime(message.sentAt)}</div>
                          </div>
                          <div className={message.authorRole === role ? "text-white" : ""}>
                            {renderMessageText(message.text, message.authorRole === role)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    isDisabled={!canSendChat}
                    placeholder="Digite uma mensagem"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void sendChat(); } }}
                  />
                  <Button color="success" isDisabled={!canSendChat} onPress={() => void sendChat()}>Enviar</Button>
                </div>
                {!canSendChat && (
                  <p className="text-xs text-amber-700">
                    O chat será liberado assim que você entrar na chamada.
                  </p>
                )}
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
});

export default TeleatendimentoPanel;
