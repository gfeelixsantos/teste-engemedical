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
  ShieldCheck,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export type ValidacaoStatus =
  | "idle"
  | "routing"
  | "buscando_cadastro"
  | "cadastro_encontrado"
  | "agent_resolving"
  | "agent_found"
  | "agent_not_found"
  | "reader_unavailable"
  | "command_sent"
  | "waiting_finger"
  | "capturing"
  | "extracting_template"
  | "comparing_templates"
  | "aprovado"
  | "reprovado"
  | "error"
  | "timeout"
  | "cancelled";

export interface ValidacaoModalState {
  isOpen: boolean;
  status: ValidacaoStatus;
  mensagem?: string;
  requestId?: string;
  score?: number | null;
  threshold?: number | null;
  context?: {
    funcionarioNome?: string;
    funcionarioCpf?: string;
    unidade?: string;
  };
}

interface BiometriaValidacaoModalProps {
  state: ValidacaoModalState;
  onClose: () => void;
  onRetry?: () => void;
}

const getStepIndex = (s: ValidacaoStatus): number => {
  const steps: ValidacaoStatus[] = [
    "idle",
    "routing",
    "buscando_cadastro",
    "cadastro_encontrado",
    "agent_resolving",
    "agent_found",
    "command_sent",
    "waiting_finger",
    "capturing",
    "extracting_template",
    "comparing_templates",
    "aprovado",
    "reprovado",
  ];
  return steps.indexOf(s);
};

const STEPS_VALIDACAO: { label: string; reached: (s: ValidacaoStatus) => boolean; active: (s: ValidacaoStatus) => boolean }[] = [
  {
    label: "Buscando cadastro",
    reached: (s) => getStepIndex(s) >= getStepIndex("buscando_cadastro"),
    active: (s) => s === "buscando_cadastro",
  },
  {
    label: "Cadastro ok",
    reached: (s) => getStepIndex(s) >= getStepIndex("cadastro_encontrado"),
    active: (s) => s === "cadastro_encontrado",
  },
  {
    label: "Agente localizado",
    reached: (s) => getStepIndex(s) >= getStepIndex("agent_found"),
    active: (s) => s === "agent_resolving" || s === "agent_found",
  },
  {
    label: "Aguardando dedo",
    reached: (s) => getStepIndex(s) >= getStepIndex("waiting_finger"),
    active: (s) => s === "command_sent" || s === "waiting_finger",
  },
  {
    label: "Capturando digital",
    reached: (s) => getStepIndex(s) >= getStepIndex("capturing"),
    active: (s) => s === "capturing",
  },
  {
    label: "Processando digital",
    reached: (s) => getStepIndex(s) >= getStepIndex("extracting_template"),
    active: (s) => s === "extracting_template",
  },
  {
    label: "Comparando digitais",
    reached: (s) => getStepIndex(s) >= getStepIndex("comparing_templates"),
    active: (s) => s === "comparing_templates",
  },
  {
    label: "Resultado",
    reached: (s) => s === "aprovado" || s === "reprovado",
    active: (s) => s === "aprovado" || s === "reprovado",
  },
];

const ORDERED_STATUSES: ValidacaoStatus[] = [
  "idle",
  "routing",
  "buscando_cadastro",
  "cadastro_encontrado",
  "agent_resolving",
  "agent_found",
  "command_sent",
  "waiting_finger",
  "capturing",
  "extracting_template",
  "comparing_templates",
  "aprovado",
];

// ── Status group helpers ────────────────────────────────────
const EARLY_STATUSES: ValidacaoStatus[] = ["idle", "buscando_cadastro", "routing"];
const INFRA_ERROR_STATUSES: ValidacaoStatus[] = ["agent_not_found", "reader_unavailable"];
const GENERIC_ERROR_STATUSES: ValidacaoStatus[] = ["error", "timeout", "cancelled"];
const TERMINAL_STATUSES: ValidacaoStatus[] = [
  "aprovado", "reprovado", "error", "timeout", "agent_not_found", "reader_unavailable",
];

const BiometriaValidacaoModal: React.FC<BiometriaValidacaoModalProps> = ({ state, onClose, onRetry }) => {
  const { isOpen, status, mensagem, context, score, threshold } = state;

  const [visualStatus, setVisualStatus] = useState<ValidacaoStatus>("idle");
  const queueRef = useRef<ValidacaoStatus[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    queueRef.current = [];
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setVisualStatus("idle");
    } else {
      cleanup();
      // routing é alias visual de buscando_cadastro
      setVisualStatus(status === "routing" ? "buscando_cadastro" : status);
    }
  }, [isOpen]);


  useEffect(() => {
    if (!isOpen) return;

    if (EARLY_STATUSES.includes(status)) {
      cleanup();
      setVisualStatus(status === "routing" ? "buscando_cadastro" : status);
      return;
    }

    const currentIdx = ORDERED_STATUSES.indexOf(visualStatus);

    let finalTarget: ValidacaoStatus = status;
    let mainSequenceTarget: ValidacaoStatus = status;

    if (INFRA_ERROR_STATUSES.includes(status)) {
      // Para erros de infra mostramos até "agent_resolving" e então pulamos para o estado de erro
      mainSequenceTarget = "agent_resolving";
    } else if (GENERIC_ERROR_STATUSES.includes(status)) {
      // Para erros genéricos exibimos todos os steps até o fim
      mainSequenceTarget = "comparing_templates";
    }

    const targetIdx = ORDERED_STATUSES.indexOf(mainSequenceTarget);

    if (targetIdx < 0 || targetIdx < currentIdx) {
      cleanup();
      setVisualStatus(status);
      return;
    }

    const newSteps: ValidacaoStatus[] = [];
    for (let i = currentIdx + 1; i <= targetIdx; i++) {
      newSteps.push(ORDERED_STATUSES[i]);
    }

    if (finalTarget !== mainSequenceTarget) {
      newSteps.push(finalTarget);
    }

    if (newSteps.length > 0) {
      queueRef.current = [...queueRef.current, ...newSteps];
      if (!timerRef.current) {
        processQueue();
      }
    }
  }, [status, isOpen]);

  const processQueue = () => {
    if (queueRef.current.length === 0) {
      timerRef.current = null;
      return;
    }

    const nextStatus = queueRef.current.shift()!;
    setVisualStatus(nextStatus);

    timerRef.current = setTimeout(() => {
      processQueue();
    }, 450); // Delay de 450ms por step
  };

  const isTerminal = TERMINAL_STATUSES.includes(visualStatus);
  const isAprovado = visualStatus === "aprovado";
  const isReprovado = visualStatus === "reprovado";
  const isError = visualStatus === "error" || visualStatus === "timeout";
  const inProgress = !isTerminal && visualStatus !== "idle";

  const ContextStrip = () => {
    return null;
  };

  const ResultIcon = () => {
    if (isAprovado) return <ShieldCheck className="h-14 w-14 text-emerald-600 mx-auto" />;
    if (isReprovado) return <XCircle className="h-14 w-14 text-red-500 mx-auto" />;
    if (isError) return <XCircle className="h-12 w-12 text-red-500 mx-auto" />;
    return null;
  };

  const StepList = () => (
    <ol className="relative border-l border-gray-200 ml-2 space-y-4">
      {STEPS_VALIDACAO.map((step, i) => {
        const reached = step.reached(visualStatus);
        const active = step.active(visualStatus);
        return (
          <li key={i} className="ml-6">
            <span
              className={[
                "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                reached && !isError ? "bg-emerald-600" : active ? "bg-blue-500" : "bg-gray-200",
              ].join(" ")}
            >
              {reached && !active && !isError ? (
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
            <span className="text-base font-semibold">Validação Biométrica</span>
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

          {visualStatus === "agent_not_found" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <XCircle className="h-14 w-14 text-red-500 mx-auto" />
              <p className="font-semibold text-red-800 text-base">Agente não encontrado</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Nenhum agente online para {context?.unidade || "esta unidade"}. Verifique se o aplicativo CMSO360 Biometria está aberto.
              </p>
            </div>
          ) : visualStatus === "reader_unavailable" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <XCircle className="h-14 w-14 text-amber-500 mx-auto" />
              <p className="font-semibold text-amber-800 text-base">Leitor indisponível</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Agente conectado mas leitor não encontrado. Verifique o cabo USB e tente novamente
              </p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <ResultIcon />
              <p className="font-semibold text-gray-800 text-base">
                {visualStatus === "timeout" ? "Tempo esgotado" : "Falha na validação"}
              </p>
              <p className="text-sm text-gray-500">
                {mensagem || "Ocorreu um erro durante a validação biométrica."}
              </p>
            </div>
          ) : isAprovado ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <ResultIcon />
              <p className="font-semibold text-emerald-800 text-base">Identidade validada</p>
              {score != null && threshold != null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 w-full">
                  <p className="text-xs text-emerald-700">
                    Confiança: <span className="font-bold">{Math.min(100, (score / threshold * 100)).toFixed(0)}%</span>
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400">Funcionário identificado</p>
            </div>
          ) : isReprovado ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <ResultIcon />
              <p className="font-semibold text-red-800 text-base">Identidade não validada</p>
              {score != null && threshold != null && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 w-full">
                  <p className="text-xs text-red-700">
                    Confiança: <span className="font-bold">{Math.min(100, (score / threshold * 100)).toFixed(0)}%</span>
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                {mensagem || "Digital não confere"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Posicione o dedo no leitor
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
              {(isError || isReprovado || INFRA_ERROR_STATUSES.includes(visualStatus)) && onRetry && (
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
                {isError || isReprovado || INFRA_ERROR_STATUSES.includes(visualStatus) ? "Cancelar e fechar" : "Fechar"}
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

export default BiometriaValidacaoModal;
