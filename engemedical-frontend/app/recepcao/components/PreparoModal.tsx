"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Autocomplete,
  AutocompleteItem,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { FileClock } from "lucide-react";
import { Socket } from "socket.io-client";

import { IndexDb } from "@/lib/indexDb/indexdb";
import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import { Ticket, PreparationRequest } from "@/lib/ticket/ticket";
import { formatBrithdayDate, formatCPF, getCurrentUser } from "@/lib/utils";
import { TIPOS_EXAME } from "@/config/constants";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { emitEvent, EventType } from "@/lib/websocket/events/events";
import { PreparationRequestTypes } from "@/lib/websocket/enums/websocket.enum";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";

// ---------- Memoized Inputs ----------
const NomeInput = React.memo(
  ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <Input
      classNames={{ input: "uppercase" }}
      label="Nome"
      size="sm"
      value={value}
      onChange={onChange}
    />
  ),
);

const CpfInput = React.memo(
  ({ value, onChange, isInvalid, errorMessage }: any) => (
    <Input
      errorMessage={errorMessage}
      isInvalid={isInvalid}
      label="CPF"
      placeholder="000.000.000-00"
      size="sm"
      value={value}
      onChange={onChange}
    />
  ),
);

const DataNascimentoInput = React.memo(({ value, onChange }: any) => (
  <Input
    label="Data Nasc."
    placeholder="DD/MM/AAAA"
    size="sm"
    value={value}
    onChange={onChange}
  />
));

// ---------- Main Component ----------
interface EmPreparacaoModalProps {
  isOpen: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  ticket: Ticket | null;
  unidadeSelecionada: string;
  socket: Socket;
  salaSelecionada: string;
  funcionario?: Scheduling;
}

export default function EmPreparacaoModal({
  isOpen,
  onOpenChange,
  ticket,
  unidadeSelecionada,
  socket,
  salaSelecionada,
  funcionario,
}: EmPreparacaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [currentUser, setCurrentUser] = useState<IUserInfo>();
  const [empresasSoc, setEmpresasSoc] = useState<CadastroEmpresa[]>([]);
  const [solicitacao, setSolicitacao] = useState<PreparationRequest>({
    empresa: "",
    nome: "",
    dataNascimento: "",
    cpf: "",
    tipoExame: "",
    informacoes: "",
    ticketId: undefined,
    unidade: unidadeSelecionada,
    atendente: "",
    sala: "",
  });
  const [showConfirm, setShowConfirm] = useState(false);

  // ---------- Memoized Values ----------
  const tiposExames = useMemo(() => Object.values(TIPOS_EXAME), []);
  const isCpfValid = useMemo(
    () => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(solicitacao.cpf),
    [solicitacao.cpf],
  );
  const isFormValid = useMemo(
    () =>
      isCpfValid &&
      solicitacao.tipoExame &&
      solicitacao.dataNascimento &&
      solicitacao.empresa &&
      solicitacao.nome,
    [isCpfValid, solicitacao],
  );

  const empresaItems = useMemo(
    () =>
      empresasSoc.map((item) => (
        <AutocompleteItem key={item.CODIGO} textValue={item.RAZAOSOCIAL}>
          {item.RAZAOSOCIAL}
        </AutocompleteItem>
      )),
    [empresasSoc],
  );

  const exameItems = useMemo(
    () => tiposExames.map((tipo) => <SelectItem key={tipo}>{tipo}</SelectItem>),
    [tiposExames],
  );

  // ---------- Effects ----------
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    setLoadingData(true);

    const loadInitialData = async () => {
      try {
        const [companies, user] = await Promise.all([
          IndexDb.getCompanies(),
          getCurrentUser(),
        ]);

        if (!active) return;
        setEmpresasSoc(companies);
        if (user) setCurrentUser(user);

        // Preenche ou reseta o formulário
        setSolicitacao({
          empresa: funcionario?.CODIGOEMPRESA ?? "",
          nome: funcionario?.NOME ?? "",
          dataNascimento: funcionario ? funcionario.DATAAGENDAMENTO : "",
          cpf: funcionario ? formatCPF(funcionario.CPFFUNCIONARIO) : "",
          tipoExame: funcionario ? TIPOS_EXAME[funcionario.TIPOEXAMENOME] : "",
          informacoes: funcionario?.OBSERVACOES ?? "",
          ticketId: ticket?.id,
          unidade: unidadeSelecionada,
          atendente: user?.nome ?? "",
          sala: salaSelecionada,
        });
      } finally {
        if (active) setLoadingData(false);
      }
    };

    loadInitialData();

    return () => {
      active = false;
    };
  }, [isOpen, funcionario, ticket?.id, unidadeSelecionada, salaSelecionada]);

  // ---------- Handlers ----------
  const handleFieldChange = useCallback(
    (field: keyof PreparationRequest, value: string) => {
      setSolicitacao((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleNomeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      handleFieldChange("nome", e.target.value.toUpperCase()),
    [handleFieldChange],
  );

  const handleCpfChange = useCallback((value: string) => {
    const numeric = value.replace(/\D/g, "").slice(0, 11);
    let formatted = numeric;

    if (numeric.length > 9)
      formatted = `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${numeric.slice(9)}`;
    else if (numeric.length > 6)
      formatted = `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6)}`;
    else if (numeric.length > 3)
      formatted = `${numeric.slice(0, 3)}.${numeric.slice(3)}`;
    setSolicitacao((prev) => ({ ...prev, cpf: formatted }));
  }, []);

  const handleDataNascimentoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatBrithdayDate(e.target.value);

      setSolicitacao((prev) => ({ ...prev, dataNascimento: formatted }));
    },
    [],
  );

  const handleFinalizarSolicitacao = useCallback(() => {
    if (!socket?.connected) {
      addToast({
        title: "Erro de conexão",
        description: "Sem conexão com o servidor. Tente novamente mais tarde.",
        severity: "danger",
        color: "danger",
        variant: "flat",
      });

      return;
    }

    setShowConfirm(true);
  }, [socket]);

  const handleConfirmEnvio = useCallback(async () => {
    setShowConfirm(false);
    setLoading(true);
    const requestData: PreparationRequest = {
      ...solicitacao,
      ticketId: ticket?.id,
      atendente: currentUser?.nome ?? "",
      sala: salaSelecionada,
      unidade: unidadeSelecionada,
    };

    try {
      emitEvent(socket, EventType.PREPARATION_REQUEST, {
        type: PreparationRequestTypes.CREATE,
        request: requestData,
      });
      // Delay para sincronizar com resposta do servidor
      await new Promise((resolve) => setTimeout(resolve, 1500));
      addToast({
        title: "Solicitação enviada",
        description: "A solicitação de documentação foi enviada com sucesso.",
        severity: "success",
        color: "foreground",
        variant: "flat",
      });
    } catch (err) {
      console.error("Erro ao enviar solicitação:", err);
      addToast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a solicitação de documentação.",
        color: "danger",
        variant: "solid",
      });
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  }, [
    solicitacao,
    ticket?.id,
    socket,
    currentUser,
    salaSelecionada,
    unidadeSelecionada,
    onOpenChange,
  ]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false);
  }, []);

  // ---------- Render ----------
  return (
    <>
      <Modal
        disableAnimation
        backdrop="blur"
        classNames={{
          base: "rounded-xl shadow-xl bg-white border border-[#44735e]/20",
          header: "border-b border-[#44735e]/15 px-5 py-3",
          body: "px-5 py-4",
          footer: "border-t border-[#44735e]/15 px-5 py-3",
        }}
        isOpen={isOpen}
        size="md"
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                  <FileClock className="text-[#44735e]" size={20} />
                  <span className="text-lg font-semibold text-gray-800">
                    Solicitar Documentação
                  </span>
                </div>
                <button
                  aria-label="Fechar"
                  className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1"
                  onClick={onClose}
                />
              </ModalHeader>

              <ModalBody className="space-y-4">
                {loadingData ? (
                  <div className="flex justify-center py-10">Carregando...</div>
                ) : (
                  <>
                    <Autocomplete
                      label="Empresa"
                      placeholder="Selecione a empresa"
                      selectedKey={solicitacao.empresa}
                      size="sm"
                      onSelectionChange={(key) =>
                        handleFieldChange("empresa", key as string)
                      }
                    >
                      {empresaItems}
                    </Autocomplete>

                    <NomeInput
                      value={solicitacao.nome}
                      onChange={handleNomeChange}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <CpfInput
                        errorMessage={
                          solicitacao.cpf.length > 0 && !isCpfValid
                            ? "CPF inválido"
                            : ""
                        }
                        isInvalid={solicitacao.cpf.length > 0 && !isCpfValid}
                        value={solicitacao.cpf}
                        onChange={(e: any) => handleCpfChange(e.target.value)}
                      />
                      <DataNascimentoInput
                        value={solicitacao.dataNascimento}
                        onChange={handleDataNascimentoChange}
                      />
                    </div>

                    <Select
                      label="Tipo de Exame"
                      selectedKeys={
                        solicitacao.tipoExame ? [solicitacao.tipoExame] : []
                      }
                      size="sm"
                      onChange={(e) =>
                        handleFieldChange("tipoExame", e.target.value)
                      }
                    >
                      {exameItems}
                    </Select>

                    <Textarea
                      label="Informações Adicionais"
                      maxRows={4}
                      minRows={2}
                      size="sm"
                      value={solicitacao.informacoes}
                      onChange={(e) =>
                        handleFieldChange("informacoes", e.target.value)
                      }
                    />
                  </>
                )}
              </ModalBody>

              <ModalFooter className="flex justify-end gap-2">
                <Button
                  className="text-[#2a4a3a] hover:bg-[#e8f4e3] px-4"
                  size="sm"
                  variant="light"
                  onPress={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white font-medium shadow-sm hover:opacity-90 px-4 focus-visible:ring-2 focus-visible:ring-[#44735e]/40"
                  isDisabled={!isFormValid}
                  isLoading={loading}
                  size="sm"
                  onPress={handleFinalizarSolicitacao}
                >
                  {loading ? "Enviando..." : "Enviar"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de confirmação - substitui window.confirm */}
      <Modal
        disableAnimation
        isDismissable={false}
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
      >
        <ModalContent className="border border-[#44735e]/20">
          <ModalHeader className="text-[#2a4a3a]">Confirmar</ModalHeader>
          <ModalBody>
            <p className="text-gray-700">
              Finalizar solicitação de documentação?
            </p>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button
              className="text-[#2a4a3a] hover:bg-[#e8f4e3]"
              color="default"
              size="sm"
              variant="flat"
              onPress={handleCancelConfirm}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white focus-visible:ring-2 focus-visible:ring-[#44735e]/40"
              size="sm"
              onPress={handleConfirmEnvio}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
