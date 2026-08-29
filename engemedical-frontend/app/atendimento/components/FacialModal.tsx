"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  Spinner,
} from "@heroui/react";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  RefreshCcw,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  NEST_FACIAL_FINALIZE,
  NEST_FACIAL_SESSION,
  NEST_FACIAL_STATUS,
} from "@/config/constants";

export type FacialStatus =
  | "idle"
  | "initializing"
  | "waiting_capture"
  | "capturing"
  | "verifying"
  | "finalizing"
  | "success"
  | "error"
  | "timeout"
  | "cancelled";

export interface FacialContext {
  funcionarioNome: string;
  funcionarioId: string;
  funcionarioCpf: string;
  funcionarioEmail?: string;
  schedulingId: string;
  user: {
    codigo: string;
    nome: string;
  };
}

interface FacialModalProps {
  isOpen: boolean;
  context: FacialContext | null;
  onClose: (success?: boolean) => void;
}

const STEPS_FACIAL: {
  label: string;
  reached: (status: FacialStatus) => boolean;
  active: (status: FacialStatus) => boolean;
}[] = [
  {
    label: "Sessao iniciada",
    reached: (status) => status !== "idle",
    active: (status) => status === "initializing",
  },
  {
    label: "Aguardando captura",
    reached: (status) =>
      ["waiting_capture", "finalizing", "success"].includes(status),
    active: (status) => status === "waiting_capture",
  },
  {
    label: "Validando evidencias",
    reached: (status) => ["finalizing", "success"].includes(status),
    active: (status) => status === "finalizing",
  },
  {
    label: "Concluido",
    reached: (status) => status === "success",
    active: (status) => status === "success",
  },
];

const FacialModal: React.FC<FacialModalProps> = ({
  isOpen,
  context,
  onClose,
}) => {
  const [status, setStatus] = useState<FacialStatus>("idle");
  const [mensagem, setMensagem] = useState("");
  const [signatureLink, setSignatureLink] = useState("");
  const [requestId, setRequestId] = useState("");
  const [documentNonce, setDocumentNonce] = useState("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = async () => {
    if (!context) return;

    setStatus("initializing");
    setMensagem("Iniciando sessao facial...");

    try {
      const response = await fetch(NEST_FACIAL_SESSION, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedulingId: context.schedulingId,
          funcionarioId: context.funcionarioId,
          signerName: context.funcionarioNome,
          signerEmail:
            context.funcionarioEmail || "esocial@cmsocupacional.com.br",
          cpf: context.funcionarioCpf,
        }),
      });

      if (!response.ok) {
        let message = "Falha ao iniciar sessao facial.";

        try {
          const errorData = await response.json();
          message = errorData?.message || errorData?.detail || message;
        } catch {
          try {
            const errorText = await response.text();
            if (errorText) {
              message = errorText;
            }
          } catch {
            // keep default message
          }
        }

        throw new Error(message);
      }

      const data = await response.json();

      setRequestId(data.requestId);
      setSignatureLink(data.signatureLink);
      setDocumentNonce(data.documentNonce);
      setStatus("waiting_capture");
      setMensagem("Aguardando captura facial...");
    } catch (err) {
      console.error("Erro ao iniciar sessao facial:", err);
      setStatus("error");
      setMensagem(
        err instanceof Error && err.message
          ? err.message
          : "Erro ao iniciar sessao facial.",
      );
    }
  };

  const checkStatus = async () => {
    if (!requestId) return;

    try {
      const response = await fetch(`${NEST_FACIAL_STATUS}${requestId}`, { credentials: "same-origin" });
      if (!response.ok) return;

      const data = await response.json();
      if (data.isComplete) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        finalizeSession();
      }
    } catch (err) {
      console.error("Erro ao verificar status facial:", err);
    }
  };

  const finalizeSession = async () => {
    if (!context || !requestId || !documentNonce) return;

    setStatus("finalizing");
    setMensagem("Finalizando e salvando evidencias...");

    try {
      const response = await fetch(NEST_FACIAL_FINALIZE, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedulingId: context.schedulingId,
          requestId,
          documentNonce,
        }),
      });

      if (!response.ok) throw new Error("Falha ao finalizar");

      setStatus("success");
      setMensagem("Autenticacao facial concluida!");
    } catch (err) {
      console.error("Erro ao finalizar sessao facial:", err);
      setStatus("error");
      setMensagem("Erro ao finalizar autenticacao facial.");
    }
  };

  useEffect(() => {
    if (isOpen && context && status === "idle") {
      startSession();
    }

    if (!isOpen) {
      setStatus("idle");
      setMensagem("");
      setSignatureLink("");
      setRequestId("");
      setDocumentNonce("");

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [isOpen, context]);

  useEffect(() => {
    if (status === "waiting_capture" && requestId) {
      pollingIntervalRef.current = setInterval(checkStatus, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [status, requestId]);

  const isTerminal =
    status === "success" || status === "error" || status === "timeout";
  const inProgress = !isTerminal && status !== "idle";

  const ContextStrip = () => {
    if (!context) return null;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <span className="text-[#44735e]">
            <User className="h-3.5 w-3.5 shrink-0" />
          </span>
          <span className="truncate">{context.funcionarioNome}</span>
        </div>
      </div>
    );
  };

  const StepList = () => (
    <ol className="relative border-l border-gray-200 ml-2 space-y-4">
      {STEPS_FACIAL.map((step, index) => {
        const reached = step.reached(status);
        const active = step.active(status);

        return (
          <li key={index} className="ml-6">
            <span
              className={[
                "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                active
                  ? "bg-blue-500"
                  : reached
                    ? "bg-emerald-600"
                    : "bg-gray-200",
              ].join(" ")}
            >
              {active ? (
                <Spinner color="white" size="sm" />
              ) : reached ? (
                <CheckCircle className="h-4 w-4 text-white" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-gray-400" />
              )}
            </span>
            <p
              className={[
                "text-sm leading-tight pl-1",
                reached || active
                  ? "font-semibold text-gray-900"
                  : "text-gray-400",
              ].join(" ")}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );

  return (
    <Modal
      disableAnimation={false}
      hideCloseButton={inProgress}
      isDismissable={isTerminal}
      isOpen={isOpen}
      size="lg"
      onClose={() => onClose(status === "success")}
    >
      <ModalContent className="border border-[#44735e]/20">
        <ModalHeader className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">Autenticacao Facial</span>
            </div>
            {context && (
              <div className="flex items-center gap-4 text-xs text-white/80">
                <span>{context.funcionarioNome}</span>
                {context.funcionarioCpf && <span>CPF: {context.funcionarioCpf}</span>}
              </div>
            )}
          </ModalHeader>

        <ModalBody className="py-5 px-5 min-h-[450px]">
          {status === "waiting_capture" && signatureLink ? (
            <div className="flex flex-col h-full gap-4">
              <iframe
                src={signatureLink}
                allow="camera"
                className="w-full flex-grow border rounded-lg shadow-inner bg-gray-50"
                style={{ minHeight: "450px" }}
              />
            </div>
          ) : (
            <div className="flex flex-col justify-center h-full py-6 gap-4">
              {status === "success" ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <CheckCircle className="h-16 w-16 text-emerald-500" />
                  <p className="text-xl font-bold text-emerald-900">Sucesso</p>
                  <p className="text-gray-600">{mensagem}</p>
                </div>
              ) : status === "error" ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <XCircle className="h-16 w-16 text-red-500" />
                  <p className="text-xl font-bold text-red-900">Falha</p>
                  <p className="text-gray-600">{mensagem}</p>
                  <Button
                    className="mt-2 bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                    onPress={startSession}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-sm text-gray-500">
                    {mensagem || "Preparando sessao facial."}
                  </p>
                  <StepList />
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="px-5 pb-4 border-t border-gray-100 flex items-center justify-between">
          {isTerminal ? (
            <Button
              className="w-full bg-emerald-600 text-white font-bold h-11 shadow-md hover:bg-emerald-700 transition-colors"
              size="lg"
              onPress={() => onClose(status === "success")}
            >
              {status === "success" ? "Finalizar" : "Fechar"}
            </Button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <Button
                className="h-auto p-0 min-w-0 text-gray-400 hover:text-red-500 font-medium text-xs transition-colors"
                variant="light"
                onPress={() => onClose(false)}
              >
                Cancelar
              </Button>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {status === "waiting_capture"
                    ? "Aguardando captura facial..."
                    : "Processando..."}
                </span>
              </div>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FacialModal;
