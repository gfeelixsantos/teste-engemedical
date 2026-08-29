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
  Fingerprint,
  User,
  RefreshCcw,
} from "lucide-react";
import React, { useEffect, useRef } from "react";

export type BiometriaStatus =
  | "idle"
  | "routing"
  | "started"
  | "agent_resolving"
  | "agent_found"
  | "agent_not_found"
  | "reader_unavailable"
  | "command_sent"
  | "ready"
  | "waiting_finger"
  | "finger_detected"
  | "capturing"
  | "success"
  | "error"
  | "timeout"
  | "cancelled";

export interface BiometriaContext {
  operadorNome?: string;
  unidade?: string;
  sala?: string;
  funcionarioNome?: string;
  funcionarioId?: string;
  funcionarioCpf?: string;
  funcionarioDataNascimento?: string;
  atendimentoId?: string;
  estacaoId?: string;
  ticketId?: string;
  exame?: string;
}

export interface BiometriaModalState {
  isOpen: boolean;
  status: BiometriaStatus;
  mensagem?: string;
  requestId?: string;
  context?: BiometriaContext;
}

interface BiometriaModalProps {
  state: BiometriaModalState;
  onClose: () => void;
  onRetry?: () => void;
}

const STEPS_CAPTURA_SIMPLES: { label: string; reached: (s: BiometriaStatus) => boolean; active: (s: BiometriaStatus) => boolean }[] = [
  {
    label: "Localizando agent",
    reached: (s) => s !== "idle",
    active: (s) => s === "routing" || s === "started" || s === "agent_resolving",
  },
  {
    label: "Agent encontrado",
    reached: (s) => !["idle", "routing", "agent_resolving", "agent_not_found"].includes(s),
    active: (s) => s === "agent_found",
  },
  {
    label: "Aguardando dedo",
    reached: (s) => ["waiting_finger", "finger_detected", "capturing", "success"].includes(s),
    active: (s) => s === "waiting_finger" || s === "ready" || s === "command_sent",
  },
  {
    label: "Dedo detectado",
    reached: (s) => ["finger_detected", "capturing", "success"].includes(s),
    active: (s) => s === "finger_detected",
  },
  {
    label: "Capturando",
    reached: (s) => ["capturing", "success"].includes(s),
    active: (s) => s === "capturing",
  },
  {
    label: "Concluído",
    reached: (s) => s === "success",
    active: (s) => s === "success",
  },
];

const BiometriaModal: React.FC<BiometriaModalProps> = ({ state, onClose, onRetry }) => {
  const { isOpen, status, mensagem, context } = state;

  const isTerminal = status === "success" || status === "error" || status === "timeout";
  const isError = status === "error" || status === "timeout";
  const inProgress = !isTerminal && status !== "idle";

  const ContextStrip = () => {
    return null;
  };

  const ResultIcon = () => {
    if (status === "success") return <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />;
    if (isError) return <XCircle className="h-12 w-12 text-red-500 mx-auto" />;
    return null;
  };

  const StepList = () => (
    <ol className="relative border-l border-gray-200 ml-2 space-y-4">
      {STEPS_CAPTURA_SIMPLES.map((step, i) => {
        const reached = step.reached(status);
        const active = step.active(status);
        return (
          <li key={i} className="ml-6">
            <span
              className={[
                "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                reached ? "bg-emerald-600" : active ? "bg-blue-500" : "bg-gray-200",
              ].join(" ")}
            >
              {reached && !active ? (
                <CheckCircle className="h-4 w-4 text-white" />
              ) : active ? (
                <Spinner color="white" size="sm" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-gray-400" />
              )}
            </span>
            <p
              className={[
                "text-sm leading-tight pl-1",
                reached || active ? "font-semibold text-gray-900" : "text-gray-400",
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
      size="sm"
      onClose={isTerminal ? onClose : undefined}
    >
      <ModalContent className="border border-[#44735e]/20">
        <ModalHeader className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">Captura Biométrica</span>
          </div>
          {context && (
            <div className="flex items-center gap-4 text-xs text-white/80 font-normal">
              <span>{context.funcionarioNome}</span>
              {context.funcionarioCpf && <span>CPF: {context.funcionarioCpf}</span>}
            </div>
          )}
        </ModalHeader>

        <ModalBody className="py-5 px-5">
          <ContextStrip />

          {isError ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <ResultIcon />
              <p className="font-semibold text-gray-800 text-base">
                {status === "timeout" ? "Tempo esgotado" : "Falha na captura"}
              </p>
              <p className="text-sm text-gray-500">
                {mensagem ||
                  (status === "timeout"
                    ? "O leitor biométrico não respondeu no tempo limite."
                    : "Ocorreu um erro durante a captura.")}
              </p>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <ResultIcon />
              <p className="font-semibold text-emerald-800 text-base">
                Captura concluída com sucesso!
              </p>
              <p className="text-xs text-gray-400">Clique em "Finalizar" para concluir.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Siga as instruções do leitor biométrico.
              </p>
              <StepList />
              {mensagem && (
                <p className="text-xs text-gray-400 italic">{mensagem}</p>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="px-5 pb-4 border-t border-gray-100 flex items-center justify-between">
          {isTerminal ? (
            <div className="flex flex-col w-full gap-3">
              {isError && onRetry && (
                <Button
                  className="w-full bg-emerald-600 text-white font-bold h-11 shadow-md hover:bg-emerald-700 transition-colors"
                  size="lg"
                  onPress={onRetry}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              )}
              <Button
                className="w-full bg-emerald-600 text-white font-bold h-11 shadow-md hover:bg-emerald-700 transition-colors"
                size="lg"
                onPress={onClose}
              >
                {isError ? "Cancelar e fechar" : "Finalizar"}
              </Button>
            </div>
          ) : (
            <>
              <Button
                className="h-auto p-0 min-w-0 text-gray-400 hover:text-red-500 font-medium text-xs transition-colors"
                variant="light"
                onPress={onClose}
              >
                Cancelar
              </Button>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Aguardando resposta do leitor...</span>
              </div>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BiometriaModal;
