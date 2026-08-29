"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  Spinner,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Fingerprint,
  User,
  Building2,
  MapPin,
  UserCheck,
  RefreshCcw,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  BiometriaCadastroStatusType,
  BiometriaCapturaDerivadaModel,
} from "@/lib/websocket/events/events";

export interface BiometriaCadastroContext {
  operadorNome?: string;
  operadorId?: string;
  unidade?: string;
  sala?: string;
  funcionarioNome?: string;
  funcionarioId?: string;
  funcionarioCpf?: string;
  funcionarioDataNascimento?: string;
  atendimentoId?: string;
  funcionarioProntuario?: string;
}

export type BiometriaCadastroFlowStatus =
  | "selecionando_dedo"
  | "agent_not_found"
  | "reader_unavailable"
  | BiometriaCadastroStatusType;

export interface BiometriaCadastroModalState {
  isOpen: boolean;
  status: BiometriaCadastroFlowStatus;
  mensagem?: string;
  requestId?: string;
  context?: BiometriaCadastroContext;
  capturas?: BiometriaCapturaDerivadaModel[];
}

interface CadastroBiometricoModalProps {
  state: BiometriaCadastroModalState;
  onClose: () => void;
  onStartCapture: (dedo: any) => void;
  onReset: () => void; // Para "Refazer"
}

const DEDOS_DISPONIVEIS = [
  { id: 1, nome: "Polegar", lado: "Direito" },
  { id: 2, nome: "Indicador", lado: "Direito" },
  { id: 3, nome: "Médio", lado: "Direito" },
  { id: 4, nome: "Anelar", lado: "Direito" },
  { id: 5, nome: "Mínimo", lado: "Direito" },
  { id: 6, nome: "Polegar", lado: "Esquerdo" },
  { id: 7, nome: "Indicador", lado: "Esquerdo" },
  { id: 8, nome: "Médio", lado: "Esquerdo" },
  { id: 9, nome: "Anelar", lado: "Esquerdo" },
  { id: 10, nome: "Mínimo", lado: "Esquerdo" },
];

const STATUS_LABELS: Record<string, string> = {
  selecionando_dedo: "Selecionando dedo",
  buscando_agent: "Buscando leitor...",
  agent_encontrado: "Leitor encontrado",
  agent_not_found: "Leitor não encontrado",
  reader_unavailable: "Leitor indisponível",
  aguardando_primeira_captura: "Coloque o dedo no leitor",
  primeira_captura_concluida: "Primeira leitura concluída",
  aguardando_segunda_captura: "Coloque o mesmo dedo novamente",
  segunda_captura_concluida: "Segunda leitura concluída",
  processando_template: "Processando a digital...",
  processando_imagens_derivadas: "Salvando biometria...",
  concluido: "Concluído",
  erro: "Erro",
  timeout: "Tempo esgotado",
};

const CadastroBiometricoModal: React.FC<CadastroBiometricoModalProps> = ({
  state,
  onClose,
  onStartCapture,
  onReset,
}) => {
  const { isOpen, status, mensagem, context, capturas } = state;
  const [dedoSelecionado, setDedoSelecionado] = useState<string>("2"); // Indicador Direito padrão

  const inProgress =
    status !== "selecionando_dedo" &&
    status !== "concluido" &&
    status !== "erro" &&
    status !== "timeout" &&
    status !== "agent_not_found" &&
    status !== "reader_unavailable";

  const isTerminal =
    status === "concluido" ||
    status === "erro" ||
    status === "timeout" ||
    status === "agent_not_found" ||
    status === "reader_unavailable";

  const FingerSelector = () => (
    <div className="grid grid-cols-5 gap-2">
      {DEDOS_DISPONIVEIS.map((d) => {
        const isSelected = dedoSelecionado === d.id.toString();
        return (
          <button
            key={d.id}
            onClick={() => setDedoSelecionado(d.id.toString())}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all group ${
              isSelected
                ? "border-emerald-500 bg-emerald-50 shadow-sm"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className={`p-1.5 rounded-full mb-1 transition-colors ${
              isSelected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
            }`}>
              <Fingerprint className="h-4 w-4" />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-tighter ${
              isSelected ? "text-emerald-700" : "text-gray-400"
            }`}>
              {d.nome}
            </span>
            <span className={`text-[8px] leading-none ${
              isSelected ? "text-emerald-600/70" : "text-gray-300"
            }`}>
              {d.lado === "Direito" ? "DIR" : "ESQ"}
            </span>
          </button>
        );
      })}
    </div>
  );

  const activeDedo = DEDOS_DISPONIVEIS.find(x => x.id.toString() === dedoSelecionado);

  // ── Context info strip ──────────────────────────────────────
  const ContextStrip = () => {
    return null;
  };

  const handleStart = () => {
    const d = DEDOS_DISPONIVEIS.find((x) => x.id.toString() === dedoSelecionado);
    if (!d) return;

    // Normaliza para INDICADOR_DIREITO
    const codigo = `${d.nome.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")}_${d.lado.toUpperCase()}`;

    onStartCapture({
      id: d.id,
      nome: d.nome,
      lado: d.lado,
      codigo: codigo,
      label: `${d.nome} ${d.lado}`,
      tipoCadastro: "Principal",
    });
  };

  // ── Step Map ────────────────────────────────────────────────
  const getStepIndex = (s: BiometriaCadastroFlowStatus) => {
    switch (s) {
      case "selecionando_dedo": return 0;
      case "aguardando_primeira_captura": return 1;
      case "primeira_captura_concluida": return 2;
      case "aguardando_segunda_captura": return 3;
      case "segunda_captura_concluida": return 4;
      case "processando_template": return 5;
      case "processando_imagens_derivadas": return 5;
      case "concluido": return 6;
      default: return -1;
    }
  };

  const currentStep = getStepIndex(status);

  return (
    <Modal
      disableAnimation={false}
      hideCloseButton={inProgress}
      isDismissable={!inProgress}
      isOpen={isOpen}
      size="md"
      onClose={inProgress ? undefined : onClose}
    >
      <ModalContent className="border border-[#44735e]/20">
        <ModalHeader className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white leading-tight">Cadastro Biométrico</span>
          </div>
          {context && (
            <div className="flex items-center gap-4 text-xs text-white/80 font-normal">
              <span>{context.funcionarioNome}</span>
              {context.funcionarioCpf && <span>CPF: {context.funcionarioCpf}</span>}
              {activeDedo && status !== "selecionando_dedo" && (
                <span>Dedo: {activeDedo.nome} ({activeDedo.lado === "Direito" ? "DIR" : "ESQ"})</span>
              )}
            </div>
          )}
        </ModalHeader>

        <ModalBody className="py-5 px-5">
          <ContextStrip />

          {status === "selecionando_dedo" ? (
            <div className="space-y-4">
              <div className="pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Toque para selecionar</p>
                <FingerSelector />
              </div>
            </div>
          ) : status === "agent_not_found" ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="bg-red-50 p-3 rounded-full">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-red-800">Agente não encontrado</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Nenhum agente biométrico online para {context?.unidade || "esta unidade"}. Verifique se o aplicativo CMSO360 Biometria está aberto e conectado na unidade correta.
              </p>
            </div>
          ) : status === "reader_unavailable" ? (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="bg-amber-50 p-3 rounded-full">
                <XCircle className="h-12 w-12 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-amber-800">Leitor indisponível</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Agente conectado mas leitor não encontrado. Verifique o cabo USB e tente novamente
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Progress Steps Indicator */}
              <div className="flex items-center justify-between px-2">
                {[1, 2, 3, 4, 5, 6].map((step) => {
                  const isActive = currentStep >= step;
                  const isCurrent = currentStep === step;
                  return (
                    <React.Fragment key={step}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                        isCurrent ? "bg-blue-600 text-white scale-110 shadow-md ring-2 ring-blue-200" : 
                        isActive ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {isActive && !isCurrent ? <CheckCircle className="h-4 w-4" /> : step}
                      </div>
                      {step < 6 && (
                        <div className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${currentStep > step ? "bg-emerald-500" : "bg-gray-200"}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 border rounded-xl shadow-inner min-h-[180px]">
                {!isTerminal && (
                   <div className="relative mb-5">
                     <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-30"></div>
                     <div className="relative bg-blue-50 rounded-full p-4 border border-blue-200 shadow-sm">
                       <RefreshCcw className="h-7 w-7 text-blue-600 animate-spin-slow" />
                     </div>
                   </div>
                )}
                
                <p className="text-sm font-extrabold text-[#114E34] mb-2 px-4 leading-tight">
                  {STATUS_LABELS[status] || status.replace(/_/g, " ").toUpperCase()}
                </p>
                <div className="bg-white/80 px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                   <p className="text-xs text-gray-600 leading-relaxed max-w-[260px]">
                    {mensagem || "Aguardando leitor..."}
                  </p>
                </div>

                {isTerminal && status !== "concluido" && (
                  <div className="mt-4 flex flex-col items-center animate-bounce-in">
                    <div className="bg-red-50 p-2 rounded-full mb-2">
                       <XCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <span className="text-xs font-bold text-red-600">FALHA NO CADASTRO</span>
                  </div>
                )}
                
                {status === "concluido" && (
                  <div className="mt-4 flex flex-col items-center animate-appearance-in">
                    <div className="bg-emerald-100 rounded-full p-3 mb-2 shadow-sm">
                       <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-emerald-700">Cadastro concluído</span>
                  </div>
                )}
              </div>

              {capturas && capturas.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Digital Cadastrada</p>
                  <div className="grid grid-cols-2 gap-4">
                    {capturas.map((cap, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm transition-all hover:border-emerald-200">
                        <div className="relative w-full h-[70px] max-w-[100px] rounded border border-emerald-100 bg-emerald-50/60 flex items-center justify-center">
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle className="h-3 w-3" />
                          </div>
                          <Fingerprint className="h-6 w-6 text-emerald-600/80" />
                        </div>
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] font-bold text-gray-500">CAPTURA {cap.indice}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="px-5 pb-5 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
          <Button 
            color="danger" 
            variant="light" 
            onPress={onClose} 
            isDisabled={inProgress}
            className="font-semibold text-xs"
          >
            {status === "concluido" ? "Fechar" : "Cancelar"}
          </Button>

          <div className="flex gap-2">
            {isTerminal && (
              <Button
                color="success"
                variant="flat"
                onPress={onReset}
                className="font-bold border border-emerald-200 shadow-sm"
                startContent={<RefreshCcw className="h-3 w-3" />}
                size="sm"
              >
                {status === "agent_not_found" || status === "reader_unavailable" ? "Tentar novamente" : "Refazer"}
              </Button>
            )}

            {status === "selecionando_dedo" && (
              <Button
                className="bg-[#114E34] text-white font-bold h-10 px-6 shadow-md hover:shadow-lg transition-all"
                onPress={handleStart}
                size="sm"
                startContent={<Fingerprint className="h-4 w-4" />}
              >
                Iniciar
              </Button>
            )}

            {status !== "selecionando_dedo" && status !== "agent_not_found" && status !== "reader_unavailable" && (
              <Button
                isDisabled={status !== "concluido"}
                className={status === "concluido" ? "bg-emerald-600 text-white font-bold shadow-md h-10 px-8 transition-all hover:bg-emerald-700" : "bg-gray-100 text-gray-400"}
                onPress={onClose}
                size="sm"
              >
                Concluir
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CadastroBiometricoModal;
