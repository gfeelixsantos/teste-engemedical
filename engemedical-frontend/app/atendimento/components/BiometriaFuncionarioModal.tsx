"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
} from "@heroui/react";
import { Fingerprint, UserX, UserCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { Socket } from "socket.io-client";

type BiometriaCadastroResumo = {
  dedo: string;
  cadastradoEm?: string;
  unidade?: string;
  operador?: {
    id?: string;
    nome?: string;
    perfil?: string;
  };
  agentMachineName?: string;
  agentIpLocal?: string;
  templateVersion?: string;
  status?: string;
};

export type FuncionarioStatus =
  | "LOADING"
  | "SEM_CADASTRO_ATIVO"
  | "CADASTRO_ATIVO"
  | "CADASTRO_PENDENTE_TEMPLATE"
  | "IDENTIDADE_INSUFICIENTE"
  | "ERRO";

interface BiometriaFuncionarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  funcionario: {
    id: string;
    nome: string;
    cpf?: string;
    dataNascimento?: string;
    schedulingId?: string;
  } | null;
  socket: Socket | null;
  unidade: string;
  ipLocal?: string;
  operador?: {
    id: string;
    nome: string;
    perfil: string;
  };
  onAction: (
    action: "CADASTRAR" | "VALIDAR" | "REACADASTRAR" | "NOVO_CADASTRO",
    payload?: { dedo?: string },
  ) => void;
}

const BiometriaFuncionarioModal: React.FC<BiometriaFuncionarioModalProps> = ({
  isOpen,
  onClose,
  funcionario,
  socket,
  unidade,
  ipLocal = "",
  operador,
  onAction,
}) => {
  const [status, setStatus] = useState<FuncionarioStatus>("LOADING");
  const [mensagemErro, setMensagemErro] = useState<string>("");
  const [dedoCadastrado, setDedoCadastrado] = useState<string>("");
  const [cadastros, setCadastros] = useState<BiometriaCadastroResumo[]>([]);
  const [dedoSelecionado, setDedoSelecionado] = useState<string>("");

  const formatDataHora = (value?: string) => {
    if (!value) return "Não informado";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const formatDedoLabel = (value?: string) => {
    if (!value) return "Não informado";
    return value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  useEffect(() => {
    if (isOpen && socket && funcionario) {
      setStatus("LOADING");
      setCadastros([]);
      setDedoSelecionado("");
      setDedoCadastrado("");
      const requestId = `status_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const handleResponse = (payload: any) => {
        if (payload.requestId === requestId) {
          let mappedStatus = payload.status || "ERRO";
          if (mappedStatus === "CADASTRO_PENDENTE_TEMPLATE_ENGINE") {
            mappedStatus = "CADASTRO_PENDENTE_TEMPLATE";
          } else if (mappedStatus === "ERRO_IDENTIDADE_INSUFICIENTE") {
            mappedStatus = "IDENTIDADE_INSUFICIENTE";
          }
          setStatus(mappedStatus);
          if (payload.mensagem) setMensagemErro(payload.mensagem);
          const cadastrosResposta = Array.isArray(payload.cadastros) ? payload.cadastros as BiometriaCadastroResumo[] : [];
          setCadastros(cadastrosResposta);
          
          // Use dedoPadrao or dedo if available
          const dedo = payload.dedoPadrao || payload.dedo || "";
          if (dedo) setDedoCadastrado(dedo);
          if (cadastrosResposta.length > 0) {
            setDedoSelecionado(cadastrosResposta[0].dedo || dedo || "");
          } else {
            setDedoSelecionado(dedo || "");
          }
        }
      };

      socket.on("biometria:status_funcionario_result", handleResponse);

      socket.emit("biometria:status_funcionario_request", {
        requestId,
        schedulingId: funcionario.schedulingId || funcionario.id,
        operador: operador
          ? { id: operador.id, nome: operador.nome, perfil: operador.perfil }
          : undefined,
        funcionario: {
          nome: funcionario.nome,
        },
        unidade,
        ipLocal,
        origem: "recepcao",
      });

      // Timeout safety
      const timer = setTimeout(() => {
        setStatus((prev) => (prev === "LOADING" ? "ERRO" : prev));
        setMensagemErro("Tempo esgotado ao consultar status.");
      }, 10000);

      return () => {
        socket.off("biometria:status_funcionario_result", handleResponse);
        clearTimeout(timer);
      };
    }
  }, [isOpen, socket, funcionario, unidade, ipLocal, operador]);

  const renderContent = () => {
    if (status === "LOADING") {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Spinner size="lg" color="success" />
          <p className="text-gray-500 font-medium">Consultando status biométrico...</p>
        </div>
      );
    }

    if (status === "SEM_CADASTRO_ATIVO") {
      return (
        <div className="flex flex-col items-center text-center py-4 gap-3">
          <UserX className="h-14 w-14 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800">Sem Cadastro Biométrico</h3>
          <p className="text-sm text-gray-500">
            Funcionário sem cadastro biométrico
          </p>
          <Button
            color="success"
            className="w-full mt-4 font-bold text-white bg-[#44735e]"
            onPress={() => onAction("CADASTRAR")}
          >
            Cadastrar biometria
          </Button>
        </div>
      );
    }

    if (status === "CADASTRO_ATIVO") {
      return (
        <div className="flex flex-col items-center text-center py-4 gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Biometria Cadastrada</h3>
          {cadastros.length > 0 && (
            <div className="w-full text-left space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Cadastros
              </p>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {cadastros.map((cadastro, index) => {
                  const isSelected = (dedoSelecionado || dedoCadastrado) === cadastro.dedo;
                  return (
                    <button
                      key={`${cadastro.dedo}-${cadastro.cadastradoEm || index}`}
                      type="button"
                      className={[
                        "w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors",
                        isSelected
                          ? "border-[#44735e] bg-[#44735e]/5"
                          : "border-gray-200 bg-white hover:border-[#44735e]/40",
                      ].join(" ")}
                      onClick={() => setDedoSelecionado(cadastro.dedo)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatDedoLabel(cadastro.dedo)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDataHora(cadastro.cadastradoEm)}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#44735e]/10 px-2.5 py-1 text-xs font-semibold text-[#44735e]">
                          {isSelected ? "Selecionado" : "Selecionar"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 w-full">
            <p className="text-sm text-green-700">
              Dedo: <span className="font-bold">{formatDedoLabel(dedoSelecionado || dedoCadastrado) || "Não informado"}</span>
            </p>
          </div>
          <Button
            color="success"
            className="w-full mt-4 font-bold text-white bg-[#44735e]"
            onPress={() => onAction("VALIDAR", { dedo: dedoSelecionado || dedoCadastrado || undefined })}
          >
            Validar identidade
          </Button>
          <Button
            variant="light"
            className="w-full text-sm text-gray-500"
            onPress={() => onAction("NOVO_CADASTRO")}
          >
            Novo cadastro
          </Button>
        </div>
      );
    }

    if (status === "CADASTRO_PENDENTE_TEMPLATE") {
      return (
        <div className="flex flex-col items-center text-center py-4 gap-3">
          <ShieldAlert className="h-14 w-14 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-800">Cadastro Pendente</h3>
          <p className="text-sm text-gray-500">
            Cadastro biométrico pendente, obsoleto ou inválido.
          </p>
          <Button
            color="warning"
            className="w-full mt-4 font-bold text-white"
            onPress={() => onAction("REACADASTRAR")}
          >
            Recadastrar biometria
          </Button>
        </div>
      );
    }

    if (status === "IDENTIDADE_INSUFICIENTE") {
      return (
        <div className="flex flex-col items-center text-center py-4 gap-3">
          <AlertTriangle className="h-14 w-14 text-red-500" />
          <h3 className="text-lg font-semibold text-red-800">Identidade Insuficiente</h3>
          <p className="text-sm text-gray-500">
            CPF ou data de nascimento ausente/inválido. Não é possível usar biometria.
          </p>
        </div>
      );
    }

    // ERRO
    return (
      <div className="flex flex-col items-center text-center py-4 gap-3">
        <AlertTriangle className="h-14 w-14 text-red-500" />
        <h3 className="text-lg font-semibold text-red-800">Erro na Consulta</h3>
        <p className="text-sm text-gray-500">
          {mensagemErro || "Não foi possível verificar o status biométrico do funcionário."}
        </p>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent className="border border-[#44735e]/20">
        <ModalHeader className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">Biometria do Funcionário</span>
          </div>
          {funcionario && (
            <div className="flex items-center gap-4 text-xs text-white/80 font-normal">
              <span>{funcionario.nome}</span>
              {funcionario.cpf && <span>CPF: {funcionario.cpf}</span>}
            </div>
          )}
        </ModalHeader>
        <ModalBody className="py-6 px-6">
          {renderContent()}
        </ModalBody>
        <ModalFooter className="border-t border-gray-100">
          <Button variant="light" color="danger" onPress={onClose} className="w-full">
            Fechar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BiometriaFuncionarioModal;

