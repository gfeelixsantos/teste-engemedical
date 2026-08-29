"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Spinner, addToast } from "@heroui/react";
import { User, Video, Laptop, PhoneCall, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSocket } from "@/lib/websocket/hooks/useSocket";
import { EventType } from "@/lib/websocket/events/events";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import TeleatendimentoPanel from "@/app/teleatendimento/components/TeleatendimentoPanel";

// Funções de validação e formatação de CPF
const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .slice(0, 14);
};

const validateCPF = (cpf: string) => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11))) return false;

  return true;
};

// Componente de Input unificado com o design do login
interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  startIcon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  startIcon,
  disabled,
  required,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="relative">
      {startIcon && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
          {startIcon}
        </span>
      )}

      <input
        aria-label={label}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl
        focus:ring-2 focus:ring-[#104e35] focus:border-[#104e35] focus:outline-none
        disabled:bg-gray-100 disabled:cursor-not-allowed
        transition-all duration-200 text-lg tracking-wider"
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
);

// Ícone de seta para o botão
const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M14 5l7 7m0 0l-7 7m7-7H3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

function TotemContent() {
  const [cpf, setCpf] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "waiting" | "in_call">("idle");
  const [waitingMessage, setWaitingMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const { socket, connected, connect, disconnect, registerHandlers } = useSocket();
  const socketRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const unidade = searchParams.get("unidade");
  const sala = searchParams.get("sala");
  const exame = searchParams.get("exame");

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    const unregister = registerHandlers({
      [EventType.TELEATENDIMENTO_VIRTUAL_WAITING_ROOM_STATUS]: (payload: { status: string; message: string; schedulingId?: string }) => {
        if (payload.status === "waiting") {
          setStatus("waiting");
          setWaitingMessage(payload.message || "Aguardando profissional...");
          addToast({
            title: "Sala de Espera Virtual",
            description: payload.message,
            severity: "success",
            color: "foreground",
            variant: "flat",
          });
        } else if (payload.status === "error") {
          setStatus("idle");
          addToast({
            title: "Erro",
            description: payload.message || "Não foi possível entrar na sala de espera.",
            severity: "danger",
            color: "foreground",
            variant: "flat",
          });
          disconnect();
        }
      },
      [EventType.TELEATENDIMENTO_PULL_TO_CALL]: (payload: { sessionId: string; inviteToken?: string }) => {
        if (payload.sessionId) {
          setSessionId(payload.sessionId);
          if (payload.inviteToken) {
            setInviteToken(payload.inviteToken);
          }
          setStatus("in_call");
          addToast({
            title: "Chamada Iniciada",
            description: "O profissional iniciou a videochamada.",
            severity: "success",
            color: "foreground",
            variant: "flat",
          });
        }
      },
    } as any);

    return () => unregister();
  }, [registerHandlers, disconnect]);

  // Quando conectar ao websocket, enviamos a solicitação para entrar na fila
  useEffect(() => {
    if (connected && status === "connecting" && socketRef.current) {
      const cpfDigits = cpf.replace(/\D/g, "");
      socketRef.current.emit(EventType.TELEATENDIMENTO_JOIN_VIRTUAL_WAITING_ROOM, { 
        cpf: cpfDigits,
        unidade: unidade || undefined,
        sala: sala || undefined,
        exame: exame || undefined
      });
    }
  }, [connected, status, cpf, unidade, sala, exame]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCPF(cpf)) {
      addToast({
        title: "CPF Inválido",
        description: "Verifique o número digitado e tente novamente.",
        severity: "warning",
        color: "foreground",
        variant: "flat",
      });
      return;
    }

    setStatus("connecting");
    connect({
      unidade: unidade || "",
      sala: sala || "",
      exame: exame || "",
      nome: `Totem_${cpf.replace(/\D/g, "")}`,
      type: WebsocketType.TELEATENDIMENTO,
    });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  if (status === "in_call" && sessionId) {
    return (
      <TeleatendimentoPanel
        role="EMPLOYEE"
        layout="full"
        sessionId={sessionId}
        inviteToken={inviteToken || undefined}
        onEndSession={() => {
          disconnect();
          setStatus("idle");
          setSessionId(null);
          setInviteToken(null);
          setCpf("");
        }}
      />
    );
  }

  const renderTitle = () => {
    if (status === "connecting") {
      return {
        title: "Conectando ao Atendimento",
        subtitle: "Aguarde enquanto preparamos seu acesso...",
      };
    }
    if (status === "waiting") {
      return {
        title: "Sala de Espera Virtual",
        subtitle: "Você está na fila de atendimento",
      };
    }
    return {
      title: "Telemedicina",
      subtitle: "Acesso ao atendimento online",
    };
  };

  const { title, subtitle } = renderTitle();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row rounded-2xl shadow-xl overflow-hidden bg-white border border-gray-200">
        
        {/* COL ESQUERDA - INSTRUÇÕES DE ATENDIMENTO */}
        <div className="md:w-2/5 bg-gradient-to-b from-[#104e35]/5 to-transparent p-8 flex flex-col justify-between border-r border-gray-200">
          <div className="space-y-8">
            {/* Logo */}
            <div className="text-center md:text-left">
              <Image
                priority
                alt="CMSO 360 - Telemedicina"
                className="w-auto mx-auto md:mx-0"
                height={50}
                src="/images/logo.png"
                width={150}
              />
            </div>

            {/* Título do Atendimento */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#104e35]">
                Seu Atendimento Online
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Siga as orientações abaixo para realizar a sua consulta médica de forma rápida e segura:
              </p>
            </div>

            {/* Passos do Processo */}
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#104e35]/10 flex items-center justify-center text-[#104e35] flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">Identificação</h4>
                  <p className="text-[11px] text-gray-500">Digite seu CPF e entre na sala de espera virtual.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#104e35]/10 flex items-center justify-center text-[#104e35] flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">Sala de Espera</h4>
                  <p className="text-[11px] text-gray-500">Aguarde na tela. O médico iniciará a chamada automaticamente.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#104e35]/10 flex items-center justify-center text-[#104e35] flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">Permissões de Mídia</h4>
                  <p className="text-[11px] text-gray-500">Quando solicitado, permita o acesso à câmera e ao microfone.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#104e35]/10 flex items-center justify-center text-[#104e35] flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">4</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">Assinatura Facial</h4>
                  <p className="text-[11px] text-gray-500">Ao final da consulta, assine o termo de ciência através da captura facial.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dica no rodapé */}
          <div className="mt-8 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100/50 text-[11px] text-emerald-800 leading-relaxed">
            <strong className="text-emerald-900 block mb-0.5">Dica importante:</strong>
            Para uma boa consulta, procure um ambiente silencioso, bem iluminado e tenha um documento com foto em mãos.
          </div>
        </div>

        {/* COL DIREITA - FORM E STATUS */}
        <div className="md:w-3/5 p-8 flex flex-col justify-center min-h-[460px]">
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.5 }}
          >
            {/* Título */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
              <p className="text-gray-600 mt-2">{subtitle}</p>
              
              {/* Informações da Sala (se presentes) */}
              {status === "idle" && exame && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-250 px-3 py-1 rounded-full text-emerald-800 text-xs font-semibold">
                    <span className="opacity-70">Exame:</span>
                    <span>{exame}</span>
                  </div>
                </div>
              )}
            </div>

            {/* FORMULÁRIO DE IDENTIFICAÇÃO (STATUS: IDLE) */}
            {status === "idle" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <InputField
                  required
                  disabled={false}
                  label="CPF do Funcionário"
                  placeholder="000.000.000-00"
                  startIcon={<User className="h-5 w-5" />}
                  value={cpf}
                  onChange={handleCpfChange}
                />

                <button
                  className="w-full py-3 px-4 bg-[#104e35] text-white font-semibold rounded-xl
                  hover:bg-[#0d3d29] focus:ring-2 focus:ring-[#104e35] focus:outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
                  disabled={cpf.replace(/\D/g, "").length !== 11}
                  type="submit"
                >
                  Entrar na Sala de Espera
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            )}

            {/* CONECTANDO (STATUS: CONNECTING) */}
            {status === "connecting" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Spinner color="success" size="lg" />
                <p className="text-emerald-800 font-medium animate-pulse">
                  Conectando e localizando agendamento...
                </p>
              </div>
            )}

            {/* ESPERANDO NA FILA (STATUS: WAITING) */}
            {status === "waiting" && (
              <div className="flex flex-col items-center justify-center py-4 space-y-6 text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
                    <User className="w-10 h-10 text-emerald-600" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-5 h-5 bg-yellow-400 border-2 border-white rounded-full animate-pulse"></span>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-emerald-900 mb-1">Você está na fila virtual</h3>
                  <p className="text-emerald-700 text-sm">{waitingMessage}</p>
                </div>

                <div className="w-full max-w-sm bg-emerald-50/70 p-4 rounded-xl border border-emerald-250/50">
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Por favor, permaneça nesta tela com seus dispositivos de áudio e vídeo conectados. O médico iniciará a chamada em instantes.
                  </p>
                </div>

                <Button
                  variant="light"
                  color="danger"
                  className="font-medium hover:bg-rose-50"
                  onPress={() => {
                    disconnect();
                    setStatus("idle");
                    setCpf("");
                  }}
                >
                  Cancelar Espera e Sair
                </Button>
              </div>
            )}

            {/* FOOTER */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
              Centro Médico de Saúde Ocupacional &copy; {new Date().getFullYear()}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

export default function TotemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center"><Spinner color="success" size="lg" /></div>}>
      <TotemContent />
    </Suspense>
  );
}
