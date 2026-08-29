// AtendimentoModalComplete.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Calendar,
  Search as IconSearch,
  Clock,
  Building2,
  X,
  Filter,
  Send,
  FilePlus,
  Info,
  UserRoundSearch,
  Copy,
  FileInput,
  PrinterCheck,
  Fingerprint,
  ChevronDown,
  Camera,
  Globe,
  ShieldCheck,
} from "lucide-react";
import {
  Input,
  Button,
  Chip,
  Textarea,
  Autocomplete,
  AutocompleteItem,
  Tooltip,
  Select,
  SelectItem,
  Switch,
  Checkbox,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Socket } from "socket.io-client";

import EmPreparacaoModal from "./PreparoModal";
import BiometriaModal, { BiometriaModalState, BiometriaStatus } from "@/app/atendimento/components/BiometriaModal";
import CadastroBiometricoModal, { BiometriaCadastroModalState } from "@/app/atendimento/components/CadastroBiometricoModal";
import BiometriaValidacaoModal, { ValidacaoModalState, ValidacaoStatus } from "@/app/atendimento/components/BiometriaValidacaoModal";
import BiometriaFuncionarioModal from "@/app/atendimento/components/BiometriaFuncionarioModal";
import FacialModal, { FacialContext } from "@/app/atendimento/components/FacialModal";

import {
  PreparationRequest,
  Ticket,
  TicketActionType,
  TicketEmitedDto,
  TicketGroups,
  TicketStatus,
} from "@/lib/ticket/ticket";
import { fetchExamesGrouped } from "@/lib/exames/utils/exames-helper";
import { fetchExames } from "@/lib/exames/services/exames.service";
import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import {
  NEST_SOC_RECORDS,
  NEST_SCHEDULINGS_UPDATE,
  NEST_SOC_PEDIDOEXAME,
  NEST_SOC_PEDIDOEXAME_OPTIONS,
  NEST_SOC_PEDIDOEXAME_CREDENCIADAS,
  NEST_TICKETS_URL,
  PREFERENCIAL_OPTIONS,
  TIPOS_EXAME,
  NEST_SOC_PEDIDOEXAME_VALIDADE,
} from "@/config/constants";
import {
  AsoStatus,
  AtendimentoStatus,
} from "@/lib/scheduling/enum/scheduling.enum";
import { FileUpload, Scheduling } from "@/lib/scheduling/interface/scheduling";
import {
  convertRespAso,
  convertTipoAsoNome,
  copyToClipboard,
  formatBrithdayDate,
  formatCPF,
  formatPhone,
  getStatusColor,
  normalizeId,
} from "@/lib/utils";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { AsoFuncionarioDto, AsoOption } from "@/lib/soc/interfaces/AsoFuncionario";
import { guiaAtendimento } from "@/lib/scheduling/report/guiaAtendimento";
import { fetchPrestadores, IPrestador } from "@/lib/prestadores/services/prestadores.service";

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDedoLabel(dedo: string): string {
  const mapa: Record<string, string> = {
    POLEGAR_DIREITO: 'Polegar Direito',
    INDICADOR_DIREITO: 'Indicador Direito',
    MEDIO_DIREITO: 'Médio Direito',
    ANELAR_DIREITO: 'Anelar Direito',
    MINIMO_DIREITO: 'Mínimo Direito',
    POLEGAR_ESQUERDO: 'Polegar Esquerdo',
    INDICADOR_ESQUERDO: 'Indicador Esquerdo',
    MEDIO_ESQUERDO: 'Médio Esquerdo',
    ANELAR_ESQUERDO: 'Anelar Esquerdo',
    MINIMO_ESQUERDO: 'Mínimo Esquerdo',
  };
  return mapa[dedo] || dedo;
}

function formatAtendimentoStatusLabel(status?: string): string {
  if (!status) return "";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

function resolveTipoExameRecepcao(paciente: Partial<Scheduling>): string {
  const tipoExameNome = String(paciente?.TIPOEXAMENOME || "").trim();
  const mappedByNome = TIPOS_EXAME[tipoExameNome as keyof typeof TIPOS_EXAME];
  if (mappedByNome) return mappedByNome;

  const tipoExameCodigo = String(paciente?.TIPOEXAME || "").trim();
  const mappedByCodigo: Record<string, string> = {
    "1": TIPOS_EXAME.ADMISSIONAL,
    "2": TIPOS_EXAME.PERIODICO,
    "3": TIPOS_EXAME["RETORNO TRABALHO"],
    "4": TIPOS_EXAME["MUDANCA FUNCAO"],
    "5": TIPOS_EXAME.DEMISSIONAL,
    "6": TIPOS_EXAME["MONITORACAO PONTUAL"],
  };

  return mappedByCodigo[tipoExameCodigo] || "";
}

function getBiometriaFuncionarioRef(funcionario: Partial<Scheduling>): string {
  return String(
    funcionario.CODIGOPRONTUARIO ||
      funcionario.CODIGO ||
      funcionario._id ||
      "",
  );
}

function getSchedulingMongoId(funcionario: Partial<Scheduling>): string {
  return String(funcionario._id || "");
}

type MetodoValidacao = "SOC" | "BIOMETRIA" | "FACIAL";

function getAuthMethodVisual(
  metodo: MetodoValidacao | string | undefined,
  status?: string,
) {
  if (metodo === "BIOMETRIA") {
    return {
      label: "Biometria",
      icon: <Fingerprint className="h-4 w-4" />,
      badge:
        status === "VALIDADO" ? (
          <span className="text-[10px] text-green-600 font-medium">✓ Registrada</span>
        ) : (
          <span className="text-[10px] text-amber-600">Pendente</span>
        ),
    };
  }

  if (metodo === "FACIAL") {
    return {
      label: "Facial",
      icon: <Camera className="h-4 w-4" />,
      badge:
        status === "VALIDADO" ? (
          <span className="text-[10px] text-green-600 font-medium">✓ Registrada</span>
        ) : (
          <span className="text-[10px] text-amber-600">Pendente</span>
        ),
    };
  }

  if (metodo === "SOC") {
    return {
      label: "SOC",
      icon: <Globe className="h-4 w-4" />,
      badge: <span className="text-[10px] text-blue-600 font-medium">Padrão</span>,
    };
  }

  return {
    label: "Não autenticado",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: <span className="text-[10px] text-amber-600">Pendente</span>,
  };
}

interface AtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamentos: Scheduling[];
  ticketSelecionado: Ticket | null;
  socCompanies: CadastroEmpresa[];
  unidadeSelecionada: string;
  salaSelecionada: string;
  user: IUserInfo;
  socket: Socket | null;
  onSetPreparacaoFinalizada: React.Dispatch<
    React.SetStateAction<PreparationRequest[]>
  >;
  onExecutarAcao: (
    ticketId: number,
    action: TicketActionType,
    unidade: string,
    socket: Socket,
    sala?: string,
    user?: string,
    mongoId?: string,
  ) => void;
  addOrUpdate: (ticket: Ticket) => void;
  setTicketSelecionado: (ticket: Ticket | null) => void;
}

function getAuthMethodVisualClean(
  metodo: MetodoValidacao | string | undefined,
  status?: string,
) {
  switch (metodo) {
    case "BIOMETRIA":
      return {
        label: "Biometria",
        icon: <Fingerprint className="h-4 w-4" />,
        badge:
          status === "VALIDADO" ? (
            <span className="text-[10px] text-green-600 font-medium">Registrada</span>
          ) : (
            <span className="text-[10px] text-amber-600">Pendente</span>
          ),
      };
    case "FACIAL":
      return {
        label: "Facial",
        icon: <Camera className="h-4 w-4" />,
        badge:
          status === "VALIDADO" ? (
            <span className="text-[10px] text-green-600 font-medium">Registrada</span>
          ) : (
            <span className="text-[10px] text-amber-600">Pendente</span>
          ),
      };
    case "SOC":
      return {
        label: "SOC",
        icon: <Globe className="h-4 w-4" />,
        badge: (
          <span className="text-[10px] text-blue-600 font-medium">Padrao</span>
        ),
      };
    default:
      return {
        label: "Nao autenticado",
        icon: <ShieldCheck className="h-4 w-4" />,
        badge: <span className="text-[10px] text-amber-600">Pendente</span>,
      };
  }
}

const AtendimentoModal: React.FC<AtendimentoModalProps> = ({
  isOpen,
  onClose,
  agendamentos,
  ticketSelecionado,
  socCompanies,
  unidadeSelecionada,
  salaSelecionada,
  user,
  socket,
  onSetPreparacaoFinalizada,
  onExecutarAcao,
  addOrUpdate,
  setTicketSelecionado,
}: AtendimentoModalProps) => {
  const [metodoValidacao, setMetodoValidacao] = useState<MetodoValidacao>("SOC");
  const [examesData, setExamesData] = useState<Record<string, { codigos: string[]; nome: string }[]> | null>(null);
  const examesDataRef = useRef(examesData);
  examesDataRef.current = examesData;
  const [prestadores, setPrestadores] = useState<IPrestador[]>([]);
  const [examesPreparacaoMap, setExamesPreparacaoMap] = useState<Record<string, string>>({});

  // Estados de Biometria
  const [biometriaStatus, setBiometriaStatus] = useState<BiometriaStatus>("idle");
  const [biometriaMessage, setBiometriaMessage] = useState<string>("");
  const [biometriaRequestId, setBiometriaRequestId] = useState<string | null>(
    null,
  );
  const [isCapturingBiometria, setIsCapturingBiometria] =
    useState<boolean>(false);
  const [biometriaSuccess, setBiometriaSuccess] = useState<boolean>(false);
  const [biometriaContextExtra, setBiometriaContextExtra] = useState<{
    cpf?: string;
    dataNascimento?: string;
  }>({});
  const [dedoCapturado, setDedoCapturado] = useState<string | null>(null);
  const biometriaRequestIdRef = useRef<string | null>(null);

  const [biometriaModal, setBiometriaModal] = useState<BiometriaModalState>({
    isOpen: false,
    status: "idle",
  });

  const [cadastroBiometricoModal, setCadastroBiometricoModal] = useState<BiometriaCadastroModalState>({
    isOpen: false,
    status: "selecionando_dedo",
  });

  const [validacaoModal, setValidacaoModal] = useState<ValidacaoModalState>({
    isOpen: false,
    status: "idle",
  });

  const [facialModalOpen, setFacialModalOpen] = useState(false);
  const [facialContext, setFacialContext] = useState<FacialContext | null>(null);
  const validacaoRequestIdRef = useRef<string | null>(null);

  const [biometriaStatusModalOpen, setBiometriaStatusModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingCard, setIsSyncingCard] = useState<boolean>(false);
  const [codigoFuncionario, setCodigoFuncionario] = useState<string>("");
  const [empresa, setEmpresa] = useState<string>("");
  const [nome, setNome] = useState<string>("");
  const [dataNascimento, setDataNascimento] = useState<string>("");
  const [cpf, setCpf] = useState<string>("");
  const [telefone, setTelefone] = useState<string>("");
  const [tipoExame, setTipoExame] = useState<string>(""); // ToggleGroup value
  const [codigoExames, setCodigoExames] = useState<string[]>([]);
  const [psicoPresencial, setPsicoPresencial] = useState<boolean>(false);
  const [laboratorialExames, setLaboratorioExames] = useState<string[]>();
  const [examesImagem, setExamesImagem] = useState<string[]>();
  const [preferencialTipo, setPreferencialTipo] = useState<string>(
    ticketSelecionado?.preferencialTipo || "",
  );
  const [observacoes, setObservacoes] = useState<string>("");
  const [anotacoes, setAnotacoes] = useState<string>("");
  const [anexos, setAnexos] = useState<FileUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBindServiceSelected, setIsBindServiceSelected] =
    useState<boolean>(false);
  const [filesUpload, setFilesUpload] = useState<File[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] =
    useState<Scheduling | null>(null);
  const [records, setRecords] = useState<AsoFuncionarioDto[]>();
  const [recordsCodes, setRecordsCodes] = useState<Set<string>>(new Set());
  const [isOpenPreparationModal, setIsOpenPreparationModal] = useState(false);
  const [somentePa, setSomentePa] = useState<boolean>(false);

  // Controls when error labels are shown
  const [showErrors, setShowErrors] = useState<boolean>(false);

  // Estados para modal de alerta
  const [modalAlert, setModalAlert] = useState<boolean>(false);
  const [modalText, setModalText] = useState<React.ReactNode>("");
  const [isSuccessModal, setIsSuccessModal] = useState<boolean>(false);
  const [reuseExistingPrompt, setReuseExistingPrompt] = useState<{
    empresa: string;
    codigoFuncionario: string;
  } | null>(null);

  // Controle de agendamento selecionado
  const [selectedSchedulingId, setSelectedSchedulingId] = useState<
    string | null
  >(null);

  // Estados para selecao de multiplas fichas (ASO)
  const [asoOptions, setAsoOptions] = useState<AsoOption[]>([]);
  const [isAsoSelectionOpen, setIsAsoSelectionOpen] = useState(false);
  const [pendingAsoSelection, setPendingAsoSelection] = useState<{
    empresa: string;
    codigoFuncionario: string;
  } | null>(null);

  const fecharBiometriaModal = useCallback(() => {
    setBiometriaModal((prev) => {
      if (prev.requestId && socket) {
        socket.emit("biometria:captura_cancel", {
          requestId: prev.requestId,
          unidade: prev.context?.unidade ?? unidadeSelecionada,
        });
      }
      return { ...prev, isOpen: false };
    });
    setIsCapturingBiometria(false);
  }, [socket, unidadeSelecionada]);

  const fecharCadastroBiometricoModal = useCallback(() => {
    setCadastroBiometricoModal((prev) => {
      if (prev.requestId && socket) {
        socket.emit("biometria:cadastro_cancel", {
          requestId: prev.requestId,
          unidade: prev.context?.unidade || unidadeSelecionada,
        });
      }
      return { ...prev, isOpen: false };
    });
  }, [socket, unidadeSelecionada]);

  const resetarCadastroBiometricoModal = useCallback(() => {
    setCadastroBiometricoModal((prev) => {
      const isTerminal = ["concluido", "erro", "timeout", "agent_not_found", "reader_unavailable"].includes(prev.status);
      if (!isTerminal && prev.requestId && socket) {
        socket.emit("biometria:cadastro_cancel", {
          requestId: prev.requestId,
          unidade: prev.context?.unidade || unidadeSelecionada,
        });
      }
      return {
        ...prev,
        status: "selecionando_dedo",
        capturas: undefined,
        mensagem: "",
        requestId: undefined,
      };
    });
  }, [socket, unidadeSelecionada]);

  const handleCadastroBiometrico = useCallback(() => {
    if (!funcionarioSelecionado) return;
    const funcionarioCpf =
      (typeof cpf === "string" ? cpf : "").trim() ||
      funcionarioSelecionado.CPFFUNCIONARIO ||
      "";
    const funcionarioDataNascimento =
      (typeof dataNascimento === "string" ? dataNascimento : "").trim() ||
      "";

    setCadastroBiometricoModal({
      isOpen: true,
      status: "selecionando_dedo",
      context: {
        unidade: unidadeSelecionada,
        sala: salaSelecionada,
        funcionarioNome: funcionarioSelecionado.NOME,
        funcionarioId: getBiometriaFuncionarioRef(funcionarioSelecionado),
        funcionarioProntuario: funcionarioSelecionado.CODIGOPRONTUARIO,
        atendimentoId: getSchedulingMongoId(funcionarioSelecionado),
        funcionarioCpf,
        funcionarioDataNascimento,
        operadorId: String(user.codigo || user.nome),
        operadorNome: user.nome,
      },
    });
  }, [funcionarioSelecionado, unidadeSelecionada, salaSelecionada, user, cpf, dataNascimento]);

  const handleAbrirBiometriaFuncionario = useCallback(() => {
    if (!funcionarioSelecionado) return;
    setBiometriaStatusModalOpen(true);
  }, [funcionarioSelecionado]);

  const handleBiometriaCadastroConcluido = useCallback(() => {
    setBiometriaStatusModalOpen(false);
  }, []);

  const handleConfirmarDedoCadastro = useCallback((dedo: any) => {
    if (!socket || !cadastroBiometricoModal.context) return;
    const ctx = cadastroBiometricoModal.context;

    const requestId = `reg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    console.log(`BIOMETRIA_CADASTRO_REQUEST_ENVIADO requestId=${requestId}`);

    socket.emit("biometria:cadastro_request", {
      requestId,
      unidade: ctx.unidade,
      sala: ctx.sala,
      operador: {
        id: ctx.operadorId,
        nome: ctx.operadorNome,
        perfil: "OPERADOR",
      },
      funcionario: {
        id: ctx.funcionarioId,
        nome: ctx.funcionarioNome,
        cpf: ctx.funcionarioCpf || undefined,
        dataNascimento: ctx.funcionarioDataNascimento || undefined,
        prontuario: ctx.funcionarioProntuario,
      },
      schedulingId: ctx.atendimentoId,
      atendimentoId: ctx.atendimentoId,
      dedo,
      origem: "RECEPCAO",
      solicitadoEm: new Date().toISOString(),
    });

    setCadastroBiometricoModal(prev => ({ ...prev, requestId }));
  }, [socket, cadastroBiometricoModal.context]);

  // referencia para o sidebar dos cards
  const listRef = useRef<any>(null);

  // Ref for containing element (for focus management if needed)
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------
  // Validation rules
  // ---------------------------------------------------------

  // Edicao e envio so permitidos quando AGENDADO
  const isAgendado =
    funcionarioSelecionado?.ATENDIMENTOSTATUS === AtendimentoStatus.AGENDADO;

  const validation = useMemo(() => {
    return {
      empresa: empresa.trim().length > 0,
      codigo: codigoFuncionario.trim().length > 0,
      nome: nome.trim().length > 0,
      tipoExame: tipoExame.trim().length > 0,
      exames: somentePa || codigoExames.length > 0,
      preferencial: ticketSelecionado?.preferencialTipo
        ? preferencialTipo.length > 0 ||
        ticketSelecionado.preferencialTipo?.length > 0
        : null,
      all:
        empresa.trim().length > 0 &&
        codigoFuncionario.trim().length > 0 &&
        nome.trim().length > 0 &&
        tipoExame.trim().length > 0 &&
        (somentePa || codigoExames.length > 0) &&
        (ticketSelecionado?.preferencialTipo
          ? preferencialTipo.length > 0 ||
          ticketSelecionado.preferencialTipo?.length > 0
          : true) &&
        funcionarioSelecionado?.ATENDIMENTOSTATUS ===
        AtendimentoStatus.AGENDADO,
    };
  }, [
    empresa,
    codigoFuncionario,
    nome,
    tipoExame,
    codigoExames,
    somentePa,
    preferencialTipo,
    ticketSelecionado?.preferencialTipo,
  ]);

  // ---------------------------------------------------------
  // Keyboard shortcuts: ESC close, Enter submit (if valid)
  // ---------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return; // Previne execucao quando fechado

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        const active = document.activeElement;
        const isTextarea =
          active &&
          (active.tagName === "TEXTAREA" ||
            (active as HTMLElement).getAttribute("role") === "textbox");

        if (!isTextarea && validation.all && !isSubmitting) {
          handleSubmit();
        }
      }
    },
    [isOpen, onClose, validation.all, isSubmitting],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // ---------------------------------------------------------
  // filtros de agendamentos: search + status (manha/tarde/all)
  // ---------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredAgendamentos = useMemo(() => {
    if (!agendamentos) return [];
    const term = normalizeString(searchTerm.trim());

    return agendamentos.filter((p) => {
      const matchesSearch =
        term === "" ||
        normalizeString(p.NOME).includes(term) ||
        normalizeString(p.NOMEEMPRESA).includes(term) ||
        p.CPFFUNCIONARIO?.toLowerCase().includes(term);

      // 1. Caso "all" (todos)
      if (statusFilter === "all") {
        return matchesSearch;
      }

      // 2. Trata o horario em branco ("") - Inclui em MANHA e TARDE
      if (p.HORARIO === "") {
        return matchesSearch; // Se nao tem horario, e incluido
      }

      const hora = parseInt(p.HORARIO.substring(0, 2), 10);

      if (statusFilter === "MANHA") {
        const isManha = hora < 12;

        return matchesSearch && isManha;
      }

      if (statusFilter === "TARDE") {
        const isTarde = hora >= 12;

        return matchesSearch && isTarde;
      }

      // Se houver outros status (caso inesperado)
      return matchesSearch;
    });
  }, [agendamentos, searchTerm, statusFilter]);

  // ---------------------------------------------------------
  // Funcao para "desclicar" um agendamento selecionado
  // ---------------------------------------------------------
  const handleDeselecionarAgendamento = useCallback(() => {
    // Reset form after successful submission
    setCodigoFuncionario("");
    setEmpresa(String(""));
    setNome("");
    setDataNascimento("");
    setCpf("");
    setTelefone("");
    setTipoExame("");
    setCodigoExames([]);
    setPsicoPresencial(false);
    setObservacoes("");
    setPreferencialTipo("");
    setAnotacoes("");
    setShowErrors(false);
    setSelectedSchedulingId(null);
    setAnexos([]);
    setFilesUpload([]);
    setIsBindServiceSelected(false);
    setSomentePa(false);
    setRecords([]);
    setRecordsCodes(new Set());
    setFuncionarioSelecionado(null);
  }, []);

  async function carregarProntuarioPorCodigo({
    empresa,
    codigoFuncionario,
    manterExamesRealizados,
    ficha,
    skipAsoCheck,
  }: {
    empresa: string;
    codigoFuncionario: string;
    manterExamesRealizados: boolean;
    ficha?: string;
    skipAsoCheck?: boolean;
  }): Promise<boolean> {
    const query = new URLSearchParams({
      codempresa: empresa,
      codfuncionario: codigoFuncionario,
      manterExamesRealizados: String(manterExamesRealizados),
    });

    if (ficha) {
      query.set("ficha", ficha);
    }

    const response = await fetch(`${NEST_SOC_PEDIDOEXAME}${query.toString()}`);
    const prontuario: Scheduling = await response.json();

    if (response.ok && prontuario?.CODIGOPRONTUARIO) {
      await handleSelecionarPacienteAgendamento(prontuario, {
        skipAsoCheck,
        ficha: ficha || prontuario.SEQUENCIAFICHA,
      });

      const index = filteredAgendamentos.findIndex(
        (a) => a.CODIGOPRONTUARIO === prontuario.CODIGOPRONTUARIO,
      );

      if (index !== -1 && listRef.current) {
        listRef.current.scrollToItem(index, "center");
      }

      return true;
    }

    const { message } = prontuario as any;

    setModalText(
      <p>{message || "Nao foi possivel carregar os dados do funcionario."}</p>,
    );
    setModalAlert(true);
    handleDeselecionarAgendamento();

    return false;
  }

  // ---------------------------------------------------------
  // Actions: buscar funcionario por codigo (somente numeros)
  // ---------------------------------------------------------
  const handleBuscarFuncionario = useCallback(async () => {
    if (!empresa || !codigoFuncionario) {
      setModalText(
        <p>
          Informe <strong>empresa</strong> e{" "}
          <strong>codigo do funcionario</strong>
        </p>,
      );
      setModalAlert(true);

      return;
    }
    if (!unidadeSelecionada) {
      setModalText(
        <p>
          Selecione uma <strong>unidade</strong>
        </p>,
      );
      setModalAlert(true);

      return;
    }

    try {
      setIsLoading(true);
      // Se for KIT e sem exames -> chama a funcao de busca
      if (
        funcionarioSelecionado &&
        funcionarioSelecionado.CODIGOINTERNOEMPRESA?.includes("KIT") &&
        funcionarioSelecionado.EXAMES.length === 0
      ) {
        await handleAtendimentoCredenciada(funcionarioSelecionado);
        setIsLoading(false);

        return;
      } else {
        let updateSerivce = true;

        const responseValidate = await fetch(
          `${NEST_SOC_PEDIDOEXAME_VALIDADE}codempresa=${empresa}&codfuncionario=${codigoFuncionario}`,
        );

        const { data }: { data: Scheduling | null } =
          await responseValidate.json();

        if (data) {
          setReuseExistingPrompt({
            empresa,
            codigoFuncionario,
          });
          return;
        }


        if (!updateSerivce) return;

        const url = `${NEST_SOC_PEDIDOEXAME}codempresa=${empresa}&codfuncionario=${codigoFuncionario}&manterExamesRealizados=${updateSerivce}`;

        const response = await fetch(url);
        const prontuario: Scheduling = await response.json();

        if (response.ok && prontuario?.CODIGOPRONTUARIO) {
          // Seleciona o paciente normalmente
          // handleDeselecionarAgendamento()
          await handleSelecionarPacienteAgendamento(prontuario);

          // Localiza o indice na lista
          const index = filteredAgendamentos.findIndex(
            (a) => a.CODIGOPRONTUARIO === prontuario.CODIGOPRONTUARIO,
          );

          // Faz o scroll ate o funcionario encontrado
          if (index !== -1 && listRef.current) {
            listRef.current.scrollToItem(index, "center"); // pode ser "auto", "center" ou "smart"
          }

          return;
        } else {
          const { message } = prontuario as any;

          setModalText(
            <p>{message || "Nao foi possivel carregar o atendimento."}</p>,
          );
          setModalAlert(true);
          handleDeselecionarAgendamento();
        }
      }
    } catch (err) {
      console.error("[AtendimentoModal] Erro ao buscar funcionario:", err);
      setModalText(
        <p>Não foi possível buscar o funcionário. Tente novamente.</p>,
      );
      setModalAlert(true);
    } finally {
      setIsLoading(false);
    }
  }, [empresa, codigoFuncionario, unidadeSelecionada, filteredAgendamentos]);

  const handleConfirmarReutilizacao = useCallback(async () => {
    if (!reuseExistingPrompt) return;

    setReuseExistingPrompt(null);
    setIsLoading(true);

    try {
      await carregarProntuarioPorCodigo({
        empresa: reuseExistingPrompt.empresa,
        codigoFuncionario: reuseExistingPrompt.codigoFuncionario,
        manterExamesRealizados: true,
      });
    } catch (err) {
      console.error("[AtendimentoModal] Erro ao reutilizar atendimento:", err);
      setModalText(
        <p>Não foi possível reutilizar o atendimento. Tente novamente.</p>,
      );
      setModalAlert(true);
    } finally {
      setIsLoading(false);
    }
  }, [reuseExistingPrompt, filteredAgendamentos]);

  const handleCancelarReutilizacao = useCallback(() => {
    setReuseExistingPrompt(null);
  }, []);

  const handleAtendimentoCredenciada = useCallback(
    async (paciente: Scheduling) => {
      if (
        paciente.CODIGOINTERNOEMPRESA?.includes("KIT") &&
        paciente.EXAMES.length === 0
      ) {
        setIsLoading(true);

        try {
          const response = await fetch(NEST_SOC_PEDIDOEXAME_CREDENCIADAS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf: paciente.CPFFUNCIONARIO }),
          });

          if (response.ok) {
            const examesJson = await response.json();

            // Cria nova copia de paciente (imutavel)
            const pacienteAtualizado = {
              ...paciente,
              EXAMES: [...paciente.EXAMES, ...examesJson],
            };

            // Atualiza o estado reativo e re-renderiza a UI
            setFuncionarioSelecionado(pacienteAtualizado);

            // Se quiser que o restante da logica de selecao rode tambem:
            await handleSelecionarPacienteAgendamento(pacienteAtualizado);
          } else {
            alert(await response.text());
          }
        } catch (error) {
          console.error(error);
          alert("Erro ao buscar exames credenciada");
        } finally {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  // ---------------------------------------------------------
  // Funcao auxiliar: preenche o formulario com os dados de um Scheduling
  // Extraida para ser reutilizada pelo fluxo automatico (clique no card)
  // e pelo fluxo manual (busca por codigo SOC)
  // ---------------------------------------------------------
  const preencherFormulario = useCallback(
    async (paciente: Scheduling) => {
      setFuncionarioSelecionado(paciente);

      if (examesDataRef.current && paciente.EXAMES && paciente.EXAMES.length > 0) {
        const pedidos = paciente.EXAMES;
        const data = examesDataRef.current;

        // 1. Cria mapas de referencia
        const { codigoToGrupo, codigoToNome } = Object.entries(data).reduce(
          (acc, [grupo, examList]) => {
            examList.forEach((ex) => {
              ex.codigos.forEach((codigo) => {
                acc.codigoToGrupo[codigo] = grupo;
                acc.codigoToNome[codigo] = ex.nome;
              });
            });

            return acc;
          },
          {
            codigoToGrupo: {} as Record<string, string>,
            codigoToNome: {} as Record<string, string>,
          },
        );

        // 2. Processa os exames
        const examesToSet = pedidos.map((e) => e.codigoExame) || [];

        const examesSelecionados = examesToSet
          .map((cod) => codigoToGrupo[cod])
          .filter(Boolean);

        setCodigoExames(examesSelecionados);

        const examesLaboratorio = examesToSet
          .filter((cod) => codigoToGrupo[cod] === "Laboratório")
          .map((cod) => codigoToNome[cod]);

        setLaboratorioExames(examesLaboratorio);

        const examesImagem = examesToSet
          .filter((cod) => codigoToGrupo[cod] === "Raio-X")
          .map((cod) => codigoToNome[cod]);

        setExamesImagem(examesImagem);
      }

      // Atualiza demais campos do formulario
      setEmpresa(String(paciente.CODIGOEMPRESA) || "");
      setCodigoFuncionario(paciente.CODIGO || "");
      setNome(paciente.NOME || "");
      setDataNascimento(paciente.DATANASCIMENTO || "");
      setCpf(formatCPF(paciente.CPFFUNCIONARIO || ""));
      setTelefone(formatPhone(paciente.TELEFONE || ""));
      setTipoExame(resolveTipoExameRecepcao(paciente));
      setSelectedSchedulingId(paciente.CODIGOPRONTUARIO || "");
      setObservacoes(paciente.OBSERVACOES || "");
      setAnotacoes("");
      setPreferencialTipo("");
      setAnexos(paciente.ANEXOS?.map((a) => a) || []);
      setIsBindServiceSelected(false);
      setSomentePa(false);
    },
    [
      setFuncionarioSelecionado,
      setCodigoExames,
      setLaboratorioExames,
      setExamesImagem,
      setEmpresa,
      setCodigoFuncionario,
      setNome,
      setDataNascimento,
      setCpf,
      setTelefone,
      setTipoExame,
      setSelectedSchedulingId,
      setObservacoes,
      setAnotacoes,
      setPreferencialTipo,
      setAnexos,
      setIsBindServiceSelected,
      setSomentePa,
    ],
  );

  // ---------------------------------------------------------
  // Busca opcoes de ASO para o funcionario (multiplas fichas no mesmo dia)
  // ---------------------------------------------------------
  const buscarAsoOptions = useCallback(
    async (empresa: string, codigoFuncionario: string): Promise<AsoOption[]> => {
      try {
        const url = `${NEST_SOC_PEDIDOEXAME_OPTIONS}codempresa=${empresa}&codfuncionario=${codigoFuncionario}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return data.options || [];
      } catch {
        return [];
      }
    },
    [],
  );

  // ---------------------------------------------------------
  // Quando seleciona um paciente no sidebar:
  // 1. Detecta KIT/Credenciada e desvia se necessario
  // 2. Consulta o SOC em tempo real via GET /soc/pedidoexame
  // 3. Preenche o formulario com os dados atualizados do SOC
  // ---------------------------------------------------------
  const handleSelecionarPacienteAgendamento = useCallback(
    async (
      paciente: Scheduling,
      options?: {
        skipAsoCheck?: boolean;
        ficha?: string;
      },
    ) => {
      // 1. Detecta KIT/Credenciada antes de qualquer fetch
      if (
        paciente.CODIGOINTERNOEMPRESA?.includes("KIT") &&
        paciente.EXAMES.length === 0
      ) {
        setIsLoading(true);
        await handleAtendimentoCredenciada(paciente);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setIsSyncingCard(true);

      document.getElementById("empresa-autocomplete")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });

      handleDeselecionarAgendamento();

      try {
        // 2. Se AGENDADO, tenta sincronizar com SOC para exames atualizados
        if (paciente.ATENDIMENTOSTATUS === AtendimentoStatus.AGENDADO) {
          try {
            const fichaSelecionada =
              options?.ficha || paciente.SEQUENCIAFICHA || "";
            const url =
              `${NEST_SOC_PEDIDOEXAME}codempresa=${paciente.CODIGOEMPRESA}` +
              `&codfuncionario=${paciente.CODIGO}` +
              (fichaSelecionada
                ? `&ficha=${encodeURIComponent(fichaSelecionada)}`
                : "");
            const response = await fetch(url);
            const prontuario: Scheduling | { success: false; message: string } =
              await response.json();
            console.log("[AtendimentoModal] SOC prontuario response:", {
              ok: response.ok,
              success: "success" in prontuario ? prontuario.success : undefined,
              examesCount:
                "EXAMES" in prontuario && Array.isArray(prontuario.EXAMES)
                  ? prontuario.EXAMES.length
                  : undefined,
            });

            if (
              response.ok &&
              !("success" in prontuario && !prontuario.success)
            ) {
              // SOC retornou dados validos
              if (!options?.skipAsoCheck) {
                const options = await buscarAsoOptions(
                  paciente.CODIGOEMPRESA,
                  paciente.CODIGO,
                );
                if (options.length > 1) {
                  setAsoOptions(options);
                  setPendingAsoSelection({
                    empresa: paciente.CODIGOEMPRESA,
                    codigoFuncionario: paciente.CODIGO,
                  });
                  setIsAsoSelectionOpen(true);
                  setIsLoading(false);
                  setIsSyncingCard(false);
                  return;
                }
              }
              // Unica opcao: preenche o formulario diretamente
              await preencherFormulario(prontuario as Scheduling);
              return;
            }
          } catch {
            // SOC falhou: segue com os dados já carregados do painel
          }

          // SOC nao retornou exames: segue com o documento já recebido
          if (!paciente.EXAMES || paciente.EXAMES.length === 0) {
            await preencherFormulario(paciente);
            setModalText(
              <p>
                Nenhum pedido de exame valido foi localizado no SOC para este
                funcionario na data atual.
              </p>,
            );
            setModalAlert(true);
            return;
          }
        }

        // 3. Preenche com o documento já carregado no modal
        await preencherFormulario(paciente);
      } catch (err) {
        console.error("[AtendimentoModal] Erro ao carregar dados:", err);
        // Erro inesperado: usa dados do WebSocket
        await preencherFormulario(paciente);
        setModalText(
          <p>Não foi possível carregar os dados do funcionário. Tente novamente.</p>,
        );
        setModalAlert(true);
      } finally {
        setIsLoading(false);
        setIsSyncingCard(false);
      }
    },
    [handleAtendimentoCredenciada, handleDeselecionarAgendamento, preencherFormulario, buscarAsoOptions],
  );

  // ---------------------------------------------------------
  // Handler: usuario selecionou uma ficha (ASO) no modal de opcoes
  // ---------------------------------------------------------
  const handleConfirmarAsoOption = useCallback(
    async (option: AsoOption) => {
      setIsAsoSelectionOpen(false);
      setAsoOptions([]);

      if (!pendingAsoSelection) return;

      setIsLoading(true);
      try {
        await carregarProntuarioPorCodigo({
          empresa: pendingAsoSelection.empresa,
          codigoFuncionario: pendingAsoSelection.codigoFuncionario,
          manterExamesRealizados: true,
          ficha: option.sequenciaFicha,
          skipAsoCheck: true,
        });
      } catch (err) {
        console.error("[AtendimentoModal] Erro ao buscar ficha:", err);
        setModalText(
          <p>Não foi possível buscar a ficha. Tente novamente.</p>,
        );
        setModalAlert(true);
        handleDeselecionarAgendamento();
      } finally {
        setIsLoading(false);
        setPendingAsoSelection(null);
      }
    },
    [pendingAsoSelection, handleSelecionarPacienteAgendamento, handleDeselecionarAgendamento],
  );

  const handleCancelarAsoSelection = useCallback(() => {
    setIsAsoSelectionOpen(false);
    setAsoOptions([]);
    setPendingAsoSelection(null);
    handleDeselecionarAgendamento();
  }, [handleDeselecionarAgendamento]);

  // ---------------------------------------------------------
  // Load exames data when modal is open
  // ---------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      fetchExamesGrouped().then(setExamesData).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchPrestadores().then(setPrestadores).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchExames().then((exames) => {
        const map: Record<string, string> = {};
        for (const exame of exames) {
          if (exame.preparacao) {
            for (const codigo of exame.codigos) {
              map[codigo] = exame.preparacao;
            }
          }
        }
        setExamesPreparacaoMap(map);
      }).catch(console.error);
    }
  }, [isOpen]);

  // ---------------------------------------------------------
  // Reset form when modal opens/closes
  // ---------------------------------------------------------
  useEffect(() => {
    handleDeselecionarAgendamento();
    setSearchTerm("");
  }, [isOpen, onClose]);

  // ---------------------------------------------------------
  // Data de nascimento Modal
  // ---------------------------------------------------------
  const handleDataNascimento = (e: string) => {
    const formated = formatBrithdayDate(e);

    setDataNascimento(formated);
  };

  // ---------------------------------------------------------
  // CPF Modal
  // ---------------------------------------------------------
  const handleCpfInput = (e: string) => {
    const formated = formatCPF(e);

    setCpf(formated);
  };

  const handleTelefoneInput = (e: string) => {
    const formated = formatPhone(e);

    setFuncionarioSelecionado((prev: any) => ({
      ...prev,
      TELEFONE: formated,
    }));
    setTelefone(formated);
  };

  // ---------------------------------------------------------
  // Toggle Tipo de Exame - acessível (role="radiogroup")
  // ---------------------------------------------------------
  const handleToggleTipo = (key: string) => {
    const value = TIPOS_EXAME[key];

    setTipoExame((prev) => (prev === value ? "" : value));
  };

  // ---------------------------------------------------------
  // Exames list (compact) - função para desmarcar exames
  // ---------------------------------------------------------
  const toggleExame = useCallback(
    (exame: string) => {
      setCodigoExames((prev) => {
        if (prev.includes(exame)) {
          return prev.filter((ex) => ex !== exame);
        } else {
          return [...prev, exame];
        }
      });
    },
    [],
  );

  const handlePsicoExame = () => {
    const novoValor = !psicoPresencial;

    setPsicoPresencial(novoValor);

    if (funcionarioSelecionado) {
      const updatedFuncionario = {
        ...funcionarioSelecionado,
        EXAMES: funcionarioSelecionado.EXAMES?.map((exam) => {
          if (exam.grupo?.includes("Psicossocial")) {
            return {
              ...exam,
              preparacao: novoValor ? "Entrevista presencial" : "",
            };
          }

          return exam;
        }),
      };

      setFuncionarioSelecionado(updatedFuncionario);
    }
  };

  // ---------------------------------------------------------
  // Atendimento preferencial
  // ---------------------------------------------------------
  // Sincronizar o tipo preferencial quando o ticket mudar
  useEffect(() => {
    if (ticketSelecionado?.preferencialTipo) {
      setPreferencialTipo(ticketSelecionado.preferencialTipo);
    } else if (!ticketSelecionado?.preferencial) {
      // Se não for preferencial, limpa o tipo
      setPreferencialTipo("");
    }
  }, [ticketSelecionado]);

  const togglePreferencial = useCallback(
    (p: string) => {
      // Se já tem tipo definido e não é "Outros", só permite alterar para "Outros"
      if (
        ticketSelecionado?.preferencialTipo &&
        ticketSelecionado.preferencialTipo !== "Outros" &&
        p !== "Outros"
      ) {
        return;
      }

      // Se está tentando desmarcar o mesmo tipo (toggle off)
      if (preferencialTipo === p) {
        setPreferencialTipo("");
      } else {
        setPreferencialTipo(p);
      }
    },
    [preferencialTipo, ticketSelecionado?.preferencialTipo],
  );

  // ---------------------------------------------------------
  // Visualizar anexo
  // ----------------------------------------------------------
  const handleViewAttachment = (anexo: FileUpload) => {
    const link = document.createElement("a");

    link.href = anexo.StoragePath ?? "#";
    link.target = "_blank";

    link.click();
  };

  // ---------------------------------------------------------
  // Solicitação somente de PA
  // ----------------------------------------------------------
  const handleSomentePa = (value: boolean) => {
    setSomentePa(value);

    if (!codigoExames) return;

    if (value === true) {
      // Marcar -> remover Exame Clínico
      setCodigoExames((prev) => prev.filter((g) => g !== "Exame Clínico" && g !== "Exame Clinico"));
    } else {
      // Desmarcar -> adicionar Exame Clínico novamente, se não existir
      setCodigoExames((prev) => {
        if (!prev.includes("Exame Clínico") && !prev.includes("Exame Clinico")) {
          return [...prev, "Exame Clínico"];
        }

        return prev;
      });
    }
  };

  // ---------------------------------------------------------
  // Vincular atendimento
  // ----------------------------------------------------------
  const handleBindService = async (value: boolean) => {
    setIsBindServiceSelected(value);

    if (!empresa || !codigoFuncionario) return;

    // Pela lógica implementada, a negação faz a busca quando o check for true
    if (value) {
      const url = `${NEST_SOC_RECORDS}empresa=${empresa}&funcionario=${codigoFuncionario}&ficha=${funcionarioSelecionado?.SEQUENCIAFICHA}`;
      const response = await fetch(url);

      if (response.ok) {
        const records: AsoFuncionarioDto[] = await response.json();

        if (records && records.length > 0) {
          setRecords(records);
        }
      }
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;

    if (files) {
      const arrFiles = Array.from(files);

      for (const file of arrFiles) {
        setFilesUpload((prev) => [...prev, file]);
      }
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setFilesUpload((prev) => prev.filter((f) => f.name !== fileName));
    funcionarioSelecionado!.ANEXOS = funcionarioSelecionado!.ANEXOS.filter(
      (f) => f.Name !== fileName,
    );
  };

  const updateTicketFuncionarioSelecionado = useCallback(
    async (ticket: Ticket) => {
      if (ticket && funcionarioSelecionado) {
        const updatedTicket: Ticket = {
          ...ticket,
          atendente: user.nome,
          sala: salaSelecionada,
          preferencialTipo: ticket.preferencialTipo || preferencialTipo,
          status: TicketStatus.AGUARDANDO,
          grupo: TicketGroups.EXAME,
        };

        // Update the local state
        setTicketSelecionado(updatedTicket);
        // Update the scheduling object
        funcionarioSelecionado.TICKET = updatedTicket;
      } else if (funcionarioSelecionado) {
        // Se for lançado sem vínculo de ticket, realiza a "emissão"
        // direto para o servidor como se fosse o mesmo da recepção

        const ticketPrefix = preferencialTipo === "" ? "" : "P";

        // Se já tem tipo preferencial do totem, usa ele
        const tipoPreferencial =
          ticketSelecionado?.preferencialTipo || preferencialTipo;

        const newTicket: TicketEmitedDto = {
          emissao: new Date(),
          numero: 0,
          prefixo: ticketPrefix,
          preferencial: ticketPrefix === "P",
          preferencialTipo: tipoPreferencial || undefined, // Adicionar o tipo preferencial
          status: TicketStatus.AGUARDANDO, // Fixed: was EM_ATENDIMENTO!
          type: WebsocketType.TICKET,
          unidade: unidadeSelecionada,
          grupo: TicketGroups.EXAME,
        };

        try {
          const response = await fetch(NEST_TICKETS_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(newTicket),
          });

          if (!response.ok) {
            throw new Error("Erro ao emitir o ticket.");
          }

          const ticketResponse: Ticket = await response.json();

          const updatedTicketResponse: Ticket = {
            ...ticketResponse,
            atendente: user.nome,
            sala: salaSelecionada,
            preferencialTipo: tipoPreferencial,
            status: TicketStatus.AGUARDANDO,
            grupo: TicketGroups.EXAME,
          };

          funcionarioSelecionado.TICKET = updatedTicketResponse;
          addOrUpdate(updatedTicketResponse);
          setTicketSelecionado(updatedTicketResponse);
        } catch (e) {
          console.error(e);
          alert(`Erro durante processamento do ticket`);
        }
      } else {
        alert("Não foi possível criar vínculo ticket ao funcionário");
      }
    },
    [
      ticketSelecionado,
      preferencialTipo,
      funcionarioSelecionado,
      unidadeSelecionada,
      user,
      salaSelecionada,
      addOrUpdate,
      setTicketSelecionado,
    ],
  );

  const handlePreparationModal = () => {
    setIsOpenPreparationModal(true);
  };

  // Função que faz o print da guia de atendimento
  const handlePrint = async (prestador?: IPrestador) => {
    if (!funcionarioSelecionado) {
      setModalText(
        <p>
          Selecione um <strong>funcionário</strong>
        </p>,
      );
      setModalAlert(true);

      return;
    }

    if (isLoading || isSyncingCard) {
      setModalText(
        <p>
          Aguarde o carregamento do funcionario antes de imprimir a guia.
        </p>,
      );
      setModalAlert(true);
      console.log("[GuiaPrestador] handlePrint blocked:", {
        isLoading,
        isSyncingCard,
      });
      return;
    } else {
      const prestadorGroups = (prestador?.grupos || []).map((grupo) =>
        String(grupo ?? "").trim(),
      );
      const examesFuncionario = (funcionarioSelecionado.EXAMES || []).map((exame) => ({
        codigoExame: exame.codigoExame,
        nomeExame: exame.nomeExame,
        grupo: exame.grupo,
        preparacao: exame.preparacao,
      }));
      const funcionarioPayloadGuia: Scheduling = {
        ...funcionarioSelecionado,
        EXAMES: examesFuncionario,
      };

      console.log("[GuiaPrestador] handlePrint codigoExames:", [...codigoExames]);
      console.log("[GuiaPrestador] handlePrint prestador:", {
        id: prestador?.id,
        nome: prestador?.nome,
        grupos: prestadorGroups,
      });
      console.log("[GuiaPrestador] handlePrint funcionario:", {
        codigo: funcionarioPayloadGuia.CODIGO,
        nome: funcionarioPayloadGuia.NOME,
        examesCount: examesFuncionario.length,
        exames: examesFuncionario,
      });
      console.log("[GuiaPrestador] handlePrint flags:", {
        isLoading,
        isSyncingCard,
        funcionarioSelecionadoId: funcionarioPayloadGuia._id,
      });

      const htmlContent = await guiaAtendimento(
        funcionarioPayloadGuia,
        prestador,
        undefined,
        examesPreparacaoMap,
        {
          operadorNome: user.nome,
          unidade: unidadeSelecionada,
        },
      );
      const printWindow = window.open("", "_blank", "width=900,height=800");

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // opcional: aguarda o carregamento antes de imprimir
        printWindow.onload = () => {
          printWindow.focus();
        };
      }
    }
  };

  // ---------------------------------------------------------
  // Biometria
  // ---------------------------------------------------------
  const handleCapturarBiometria = useCallback(() => {
    if (!socket || !funcionarioSelecionado || !unidadeSelecionada || !salaSelecionada) {
      alert("Certifique-se de que o funcionário está selecionado e a unidade/sala estão configuradas.");
      return;
    }

    const requestId = crypto.randomUUID();
    biometriaRequestIdRef.current = requestId;

    const payload = {
      requestId,
      unidade: unidadeSelecionada,
      sala: salaSelecionada, // Mantido para identificação/log no backend
      operador: {
        id: String(user.codigo ?? user.nome),
        nome: user.nome,
        perfil: user.perfil ?? "RECEPCAO",
      },
      funcionario: {
        id: getBiometriaFuncionarioRef(funcionarioSelecionado),
        nome: funcionarioSelecionado.NOME,
        prontuario: funcionarioSelecionado.CODIGOPRONTUARIO,
      },
      atendimento: {
        id: getSchedulingMongoId(funcionarioSelecionado),
        ticketId: String(funcionarioSelecionado.TICKET?.id ?? ""),
        tipoAtendimento: funcionarioSelecionado.TIPOEXAMENOME,
        exame: tipoExame,
      },
      origem: "RECEPCAO" as const,
      solicitadoEm: new Date().toISOString(),
    };

    setBiometriaStatus("routing");
    setBiometriaRequestId(requestId);
    setBiometriaMessage("Solicitando captura biométrica...");
    setIsCapturingBiometria(true);
    setBiometriaSuccess(false);

    // Salva o CPF e Nascimento no contexto local para exibição no modal
    setBiometriaContextExtra({
      cpf: cpf,
      dataNascimento: dataNascimento,
    });

    socket.emit("biometria:captura_request", payload);
  }, [
    socket,
    funcionarioSelecionado,
    unidadeSelecionada,
    salaSelecionada,
    user,
    tipoExame,
    cpf,
    dataNascimento,
  ]);

  const handleCloseBiometria = useCallback(() => {
    if (biometriaRequestId && biometriaStatus !== "success" && biometriaStatus !== "error") {
      socket?.emit("biometria:captura_cancel", {
        requestId: biometriaRequestId,
        unidade: unidadeSelecionada,
      });
      setBiometriaStatus("cancelled");
      setBiometriaMessage("Captura cancelada pelo usuário.");
    }
    setIsCapturingBiometria(false);
  }, [biometriaRequestId, biometriaStatus, socket, unidadeSelecionada]);

  // Validação Biométrica 1:1
  const handleValidarBiometria = useCallback((dedoSelecionado?: string) => {
    if (!socket || !funcionarioSelecionado || !unidadeSelecionada) {
      alert("Certifique-se de que o funcionário está selecionado e a unidade está configurada.");
      return;
    }

    const schedulingId = getSchedulingMongoId(funcionarioSelecionado);
    const cpfRaw =
      funcionarioSelecionado.CPFFUNCIONARIO ||
      (typeof cpf === "string" ? cpf : "");
    if (!schedulingId) {
      alert("CPF do funcionário inválido para validação biométrica.");
      return;
    }

    const requestId = crypto.randomUUID();
    validacaoRequestIdRef.current = requestId;

    const payload = {
      requestId,
      schedulingId,
      unidade: unidadeSelecionada,
      ipLocal: "",
      funcionario: {
        nome: funcionarioSelecionado.NOME,
      },
      atendimento: {
        id: schedulingId,
      },
      dedo: {
        codigo: dedoSelecionado || "INDICADOR_DIREITO",
        label: dedoSelecionado
          ? dedoSelecionado.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
          : "Indicador direito",
      },
      origem: "recepcao",
    };

    setValidacaoModal({
      isOpen: true,
      status: "routing",
      mensagem: "Buscando cadastro biométrico...",
      requestId,
      context: {
        funcionarioNome: funcionarioSelecionado.NOME,
        funcionarioCpf: cpfRaw,
        unidade: unidadeSelecionada,
      },
    });

    console.log("[BIOMETRIA_RETRY] Emitindo validacao_request", { requestId, schedulingId, unidade: unidadeSelecionada });
    socket.emit("biometria:validacao_request", payload);
  }, [socket, funcionarioSelecionado, unidadeSelecionada, cpf]);

  const handleAbrirFacial = useCallback(() => {
    if (!funcionarioSelecionado) return;

    setFacialContext({
      funcionarioNome: funcionarioSelecionado.NOME,
      funcionarioId: getBiometriaFuncionarioRef(funcionarioSelecionado),
      funcionarioCpf: funcionarioSelecionado.CPFFUNCIONARIO || "",
      schedulingId: funcionarioSelecionado._id?.toString() || "",
      user: {
        codigo: user.codigo,
        nome: user.nome,
      },
    });
    setFacialModalOpen(true);
  }, [funcionarioSelecionado, user]);

  const handleFacialClose = (success?: boolean) => {
    setFacialModalOpen(false);
    if (success) {
      setBiometriaStatus("success");
      setBiometriaMessage("Autenticação Facial OK");
      setFuncionarioSelecionado((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          AUTENTICACAOATENDIMENTO: {
            ...(prev.AUTENTICACAOATENDIMENTO ?? { metodo: "FACIAL" }),
            metodo: "FACIAL",
            status: "VALIDADO",
          },
        };
      });
    }
  };

  const handleCloseValidacao = useCallback(() => {
    setValidacaoModal({ isOpen: false, status: "idle" });
    validacaoRequestIdRef.current = null;
  }, []);

  const handleRetryValidacao = useCallback(() => {
    setValidacaoModal({ isOpen: false, status: "idle" });
    validacaoRequestIdRef.current = null;
    setBiometriaStatusModalOpen(true);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onBiometriaRequestState = (payload: any) => {
      // Validação estrita de requestId
      if (biometriaRequestIdRef.current && payload.requestId === biometriaRequestIdRef.current) {
        setBiometriaStatus(payload.state);
        setBiometriaMessage(payload.message ?? "");

        if (payload.state === "success") {
          setBiometriaSuccess(true);
        } else if (payload.state === "error" || payload.state === "timeout" || payload.state === "cancelled") {
          setBiometriaSuccess(false);
        }
      }

      // Também atualiza o estado do modal unificado se houver
      setBiometriaModal((prev) => {
        if (!prev.isOpen || (payload.requestId && prev.requestId !== payload.requestId)) return prev;
        return {
          ...prev,
          status: payload.state,
          mensagem: payload.message,
        };
      });

      // Cadastro Biométrico
      setCadastroBiometricoModal((prev) => {
        if (!prev.isOpen || (payload.requestId && prev.requestId !== payload.requestId)) return prev;
        
        let newStatus = prev.status;
        const isAgentNotFound = [
          "agent_not_found", "agent_indisponivel", "AGENT_NOT_FOUND", "AGENT_INDISPONIVEL", "BIOMETRIA_AGENT_NOT_FOUND"
        ].includes(payload.state);
        
        const isReaderUnavailable = [
          "reader_unavailable", "LEITOR_INDISPONIVEL", "reader_offline"
        ].includes(payload.state);

        if (isAgentNotFound) {
          newStatus = "agent_not_found";
        } else if (isReaderUnavailable) {
          newStatus = "reader_unavailable";
        } else if (payload.state === "error" || payload.state === "timeout") {
          newStatus = "erro";
        }
        
        return {
          ...prev,
          status: newStatus,
          mensagem: payload.message
        };
      });

      // Validação Biométrica
      if (validacaoRequestIdRef.current && payload.requestId === validacaoRequestIdRef.current) {
        setValidacaoModal((prev) => {
          if (!prev.isOpen) return prev;
          
          let newStatus = prev.status;
          const isAgentNotFound = [
            "agent_not_found", "agent_indisponivel", "AGENT_NOT_FOUND", "AGENT_INDISPONIVEL", "BIOMETRIA_AGENT_NOT_FOUND"
          ].includes(payload.state);
          
          const isReaderUnavailable = [
            "reader_unavailable", "LEITOR_INDISPONIVEL", "reader_offline"
          ].includes(payload.state);

          if (isAgentNotFound) {
            newStatus = "agent_not_found";
          } else if (isReaderUnavailable) {
            newStatus = "reader_unavailable";
          } else if (payload.state === "error" || payload.state === "timeout") {
            newStatus = "error";
          } else if (payload.state === "agent_found") {
            newStatus = "agent_found";
          } else if (payload.state === "command_sent") {
            newStatus = "command_sent";
          } else if (payload.state === "waiting_finger") {
            newStatus = "waiting_finger";
          } else if (payload.state === "capturing") {
            newStatus = "capturing";
          }
          
          return {
            ...prev,
            status: newStatus,
            mensagem: payload.message
          };
        });
      }
    };

    const onBiometriaAgentSnapshot = (payload: any) => {
      // Se estamos em estado de erro de hardware e o snapshot diz que o leitor abriu, tenta auto-retry
      // APENAS para captura simples e se o modal de captura estiver aberto.
      if (
        isCapturingBiometria &&
        (biometriaStatus === "routing" || biometriaStatus === "error" || biometriaStatus === "reader_unavailable") &&
        payload.unidade === unidadeSelecionada &&
        payload.leitorAberto === true &&
        !biometriaSuccess
      ) {
        console.log("[BIOMETRIA] Agente pronto detectado via snapshot. Auto-tentativa...");
        handleCapturarBiometria();
      }
    };

    const onBiometriaAgentUnavailable = (payload: any) => {
      setBiometriaModal((prev) => prev.isOpen ? { ...prev, status: "error", mensagem: payload.mensagem } : prev);
      setCadastroBiometricoModal((prev) => prev.isOpen ? { ...prev, status: "erro", mensagem: payload.mensagem } : prev);
    };

    const onBiometriaCadastroStatus = (payload: any) => {
      setCadastroBiometricoModal((prev) => prev.isOpen ? { ...prev, status: payload.status, mensagem: payload.mensagem, requestId: payload.requestId } : prev);
    };

    const onBiometriaCadastroResult = (payload: any) => {
      if (payload.status === "concluido") {
        const dedo = payload.capturas?.[payload.capturas.length - 1]?.dedo?.codigo
          ?? payload.capturas?.[payload.capturas.length - 1]?.dedo;
        if (dedo) setDedoCapturado(dedo);
        setMetodoValidacao("BIOMETRIA");
        setFuncionarioSelecionado((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            AUTENTICACAOATENDIMENTO: {
              ...(prev.AUTENTICACAOATENDIMENTO ?? { metodo: "BIOMETRIA" }),
              metodo: "BIOMETRIA",
              status: "VALIDADO",
              biometria: {
                ...(prev.AUTENTICACAOATENDIMENTO?.biometria ?? {}),
                dedo: dedo ?? prev.AUTENTICACAOATENDIMENTO?.biometria?.dedo,
              },
            },
          };
        });
      }
      setCadastroBiometricoModal((prev) => {
        if (!prev.isOpen) return prev;
        const TERMINAL_INFRA_ERRORS = ["agent_not_found", "reader_unavailable"];
        if (TERMINAL_INFRA_ERRORS.includes(prev.status)) return prev;
        return { ...prev, status: payload.status, mensagem: payload.mensagem, capturas: payload.capturas };
      });
    };

    // Validação 1:1
    const onValidacaoStatus = (payload: any) => {
      if (validacaoRequestIdRef.current && payload.requestId === validacaoRequestIdRef.current) {
        setValidacaoModal((prev) => ({
          ...prev,
          status: payload.status,
          mensagem: payload.mensagem,
        }));
      }
    };

    const onValidacaoResult = (payload: any) => {
      if (validacaoRequestIdRef.current && payload.requestId === validacaoRequestIdRef.current) {
        if (payload.aprovado) {
          if (payload.dedo) setDedoCapturado(payload.dedo);
          setMetodoValidacao("BIOMETRIA");
          setFuncionarioSelecionado((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              AUTENTICACAOATENDIMENTO: {
                ...(prev.AUTENTICACAOATENDIMENTO ?? { metodo: "BIOMETRIA" }),
                metodo: "BIOMETRIA",
                status: "VALIDADO",
                biometria: {
                  ...(prev.AUTENTICACAOATENDIMENTO?.biometria ?? {}),
                  dedo: payload.dedo ?? prev.AUTENTICACAOATENDIMENTO?.biometria?.dedo,
                },
              },
            };
          });
        }
        setValidacaoModal((prev) => {
          // Não sobrescreve estados de erro de infra (agent/leitor indisponível)
          // que já foram definidos pelo onBiometriaRequestState.
          const TERMINAL_INFRA_ERRORS: ValidacaoStatus[] = ["agent_not_found", "reader_unavailable"];
          if (TERMINAL_INFRA_ERRORS.includes(prev.status)) return prev;

          return {
            ...prev,
            status: payload.aprovado ? "aprovado" : "reprovado",
            mensagem: payload.mensagem,
            score: payload.score,
            threshold: payload.threshold,
          };
        });
      }
    };

    socket.on("biometria:request_state", onBiometriaRequestState);
    socket.on("biometria:agent_snapshot", onBiometriaAgentSnapshot);
    socket.on("biometria:agent_unavailable", onBiometriaAgentUnavailable);
    socket.on("biometria:cadastro_status", onBiometriaCadastroStatus);
    socket.on("biometria:cadastro_result", onBiometriaCadastroResult);
    socket.on("biometria:validacao_status", onValidacaoStatus);
    socket.on("biometria:validacao_result", onValidacaoResult);

    return () => {
      socket.off("biometria:request_state", onBiometriaRequestState);
      socket.off("biometria:agent_snapshot", onBiometriaAgentSnapshot);
      socket.off("biometria:agent_unavailable", onBiometriaAgentUnavailable);
      socket.off("biometria:cadastro_status", onBiometriaCadastroStatus);
      socket.off("biometria:cadastro_result", onBiometriaCadastroResult);
      socket.off("biometria:validacao_status", onValidacaoStatus);
      socket.off("biometria:validacao_result", onValidacaoResult);
    };
  }, [socket, biometriaStatus, isCapturingBiometria, biometriaSuccess, unidadeSelecionada, handleCapturarBiometria]);

  // ---------------------------------------------------------
  // Submit
  // ---------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    setShowErrors(true);
    if (!validation.all || isSubmitting || !funcionarioSelecionado || !socket)
      return;

    // Valida autenticação biométrica/facial
    const authStatus = funcionarioSelecionado.AUTENTICACAOATENDIMENTO?.status;
    if (
      (metodoValidacao === "BIOMETRIA" || metodoValidacao === "FACIAL") &&
      authStatus !== "VALIDADO"
    ) {
      setModalText(
        <p>
          Autenticação{" "}
          {metodoValidacao === "BIOMETRIA" ? "biométrica" : "facial"} não
          foi concluída. Complete a autenticação antes de lançar o
          funcionário.
        </p>,
      );
      setModalAlert(true);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();

    console.info("[RECEPCAO][ATENDIMENTO_SUBMIT][START]", {
      ticketId: funcionarioSelecionado.TICKET?.id ?? null,
      schedulingId: funcionarioSelecionado._id ?? null,
      unidade: unidadeSelecionada,
      sala: salaSelecionada,
      statusAtual: funcionarioSelecionado.TICKET?.status ?? null,
      grupoAtual: funcionarioSelecionado.TICKET?.grupo ?? null,
      metodoValidacao,
    });

    await updateTicketFuncionarioSelecionado(ticketSelecionado!);
    funcionarioSelecionado.UNIDADEATENDIMENTO = unidadeSelecionada;
    funcionarioSelecionado.ANOTACOES = anotacoes.toUpperCase();

    // Persiste CPF e data de nascimento editados no formulario
    // Necessario para o backend-first de autenticacao (AtendimentoAuthContextService)
    funcionarioSelecionado.CPFFUNCIONARIO = cpf.replace(/\D/g, '');
    funcionarioSelecionado.DATANASCIMENTO = dataNascimento;

    // Adiciona códigos de prontuários
    if (recordsCodes && recordsCodes.size > 0) {
      funcionarioSelecionado.PRONTUARIOSVINCULADOS = Array.from(recordsCodes);
    }

    // Adiciona anexos do upload
    if (filesUpload && filesUpload.length > 0) {
      // funcionarioSelecionado.ANEXOS.push(...filesUpload)
      for (const item of filesUpload) {
        formData.append("files", item);
      }
    }

    // Caso tiver vindo do preparo finalizado, limpa a listagem
    if (funcionarioSelecionado.TICKET.id)
      onSetPreparacaoFinalizada((prev) =>
        prev.filter((e) => e.ticketId != funcionarioSelecionado.TICKET.id),
      );

    if (psicoPresencial) {
      const psicoIndex = funcionarioSelecionado.EXAMES.findIndex(
        (e) => e.grupo === "Psicossocial",
      );

      funcionarioSelecionado.EXAMES[psicoIndex] = {
        ...funcionarioSelecionado.EXAMES[psicoIndex],
        preparacao: "Entrevista presencial",
      };
    }

    // Persiste o metodo de autenticação selecionado
    funcionarioSelecionado.AUTENTICACAOATENDIMENTO = {
      ...(funcionarioSelecionado.AUTENTICACAOATENDIMENTO ?? { metodo: "SOC" }),
      metodo: metodoValidacao,
    };

    // Filtra EXAMES para enviar apenas os grupos que o usuário deixou marcados
    // Constrói mapa de codigoExame -> grupo a partir do examesData
    const data = examesDataRef.current;
    const codigoParaGrupo: Record<string, string> = {};
    if (data) {
      for (const [grupo, examList] of Object.entries(data)) {
        for (const ex of examList) {
          for (const cod of ex.codigos) {
            codigoParaGrupo[cod] = grupo;
          }
        }
      }
    }
    const examesFiltrados = funcionarioSelecionado.EXAMES.filter((ex) => {
      // Sempre mantém o exame de triagem
      if (ex.codigoExame === 'triagem') return true;
      const grupo = codigoParaGrupo[ex.codigoExame];
      // Se o código não mapeia para nenhum grupo conhecido, mantém (não remove)
      if (!grupo) return true;
      return codigoExames.includes(grupo);
    });
    const funcionarioParaEnvio = {
      ...funcionarioSelecionado,
      EXAMES: examesFiltrados,
    };

    try {
      formData.append("scheduling", JSON.stringify(funcionarioParaEnvio));
      formData.append("somentepa", String(somentePa));

      const submmitResponse = await fetch(NEST_SCHEDULINGS_UPDATE, {
        method: "POST",
        body: formData,
      });

      console.info("[RECEPCAO][ATENDIMENTO_SUBMIT][SCHEDULING_RESPONSE]", {
        ok: submmitResponse.ok,
        status: submmitResponse.status,
        ticketId: funcionarioSelecionado.TICKET?.id ?? null,
        schedulingId: funcionarioSelecionado._id ?? null,
      });

      if (submmitResponse.ok) {
        console.info("[RECEPCAO][ATENDIMENTO_SUBMIT][TICKET_ACTION_EMIT]", {
          ticketId: funcionarioSelecionado.TICKET.id,
          action: TicketActionType.EXAME,
          unidade: unidadeSelecionada,
          sala: salaSelecionada,
          schedulingId: funcionarioSelecionado._id,
        });

        onExecutarAcao(
          funcionarioSelecionado.TICKET.id,
          TicketActionType.EXAME,
          unidadeSelecionada,
          socket,
          salaSelecionada,
          user.nome,
          funcionarioSelecionado._id,
        );

        // Não fecha o modal aqui - mostra confirmação primeiro
        setIsSuccessModal(true);
        setModalText(
          <p>
            Atendimento enviado com sucesso!
          </p>,
        );
        setModalAlert(true);
      } else {
        const responseText = await submmitResponse.text().catch(() => "");
        console.warn("[RECEPCAO][ATENDIMENTO_SUBMIT][SCHEDULING_FAILED]", {
          status: submmitResponse.status,
          ticketId: funcionarioSelecionado.TICKET?.id ?? null,
          schedulingId: funcionarioSelecionado._id ?? null,
          responseText,
        });
      }
    } catch (err) {
      console.error("[AtendimentoModal] Erro ao submeter atendimento:", err);
      setIsSuccessModal(false);
      setModalText(
        <p>Não foi possível enviar o atendimento. Tente novamente.</p>,
      );
      setModalAlert(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validation.all,
    isSubmitting,
    codigoFuncionario,
    empresa,
    nome,
    tipoExame,
    codigoExames,
    preferencialTipo,
    anotacoes,
    filesUpload,
    recordsCodes,
    ticketSelecionado,
    selectedSchedulingId,
    funcionarioSelecionado,
    psicoPresencial,
    metodoValidacao,
  ]);

  // Prevent rendering when closed
  if (!isOpen) return null;

  const authStatus = funcionarioSelecionado?.AUTENTICACAOATENDIMENTO?.status;
  const authVisual = getAuthMethodVisualClean(metodoValidacao, authStatus);
  const isAuthBlockedForSubmit =
    !!funcionarioSelecionado &&
    (metodoValidacao === "BIOMETRIA" || metodoValidacao === "FACIAL") &&
    authStatus !== "VALIDADO";

  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
      <div className="text-center">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner animado */}
          <Spinner color="success" size="lg" variant="default" />

          {/* Texto de loading */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Processando...</p>
            <p className="text-xs text-gray-500">Buscando informações</p>
          </div>

          {/* Barra de progresso sutil */}
          {/* <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#104e35] to-[#a6ce39] rounded-full animate-pulse"></div>
        </div> */}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------
  // Paciente item memoizado (para react-window) - com indicação de selecionado
  // ---------------------------------------------------------
  const PacienteItem = React.memo(function _PacienteItem({
    index,
    style,
    data,
  }: ListChildComponentProps & { data?: Scheduling[] }) {
    const paciente: Scheduling = (data as Scheduling[])[index];
    const isSelected = selectedSchedulingId === paciente.CODIGOPRONTUARIO;

    // Renderiza o card sem o Tooltip se não houver observações
    if (!paciente.OBSERVACOES) {
      return (
        <div
          className="px-2 py-1"
          id={`card-${paciente.CODIGOPRONTUARIO}`}
          style={style}
        >
          <div
            onClick={() => {
              if (isSyncingCard) return; // bloqueia cliques concorrentes
              if (isSelected) {
                handleDeselecionarAgendamento();
              } else {
                handleSelecionarPacienteAgendamento(paciente);
              }
            }}
            // Adicionei a classe 'relative' para que o chip 'absolute' funcione
            className={`p-2 rounded-lg border transition-all duration-200 ${isSyncingCard
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
              } ${isSelected
                ? "bg-[#e6f0ff] border-[#003366] ring-2 ring-[#003366]/20 shadow-md"
                : "bg-white border-gray-200 hover:border-[#003366] hover:shadow-sm hover:scale-[1.01]"
              }`}
          >
            {/* Conteúdo do card */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`font-medium text-sm truncate ${isSelected ? "text-[#003366]" : ""}`}
                  >
                    {paciente.NOME}
                  </div>
                  {isSelected && (
                    <Chip
                      className="ml-2"
                      color="primary"
                      size="sm"
                      variant="solid"
                    >
                      Selecionado
                    </Chip>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                  <span className="truncate">{paciente.NOMEEMPRESA}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500 gap-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span>
                    {paciente.HORARIO} - {paciente.TIPOEXAMENOME}
                    {paciente.ATENDIMENTOSTATUS !== AtendimentoStatus.AGENDADO &&
                      paciente.TICKET?.prefixo !== undefined
                      ? ` - ${paciente.TICKET.prefixo}${paciente.TICKET.numero}`
                      : ""}
                  </span>
                </div>
              </div>
            </div>
            {paciente.ATENDIMENTOSTATUS && (
              <div className="mt-1">
                <span
                  className={`text-left text-xs text-${getStatusColor(paciente.ATENDIMENTOSTATUS)}-500`}
                >
                  {formatAtendimentoStatusLabel(paciente.ATENDIMENTOSTATUS)}
                </span>
              </div>
            )}

            {paciente.ASOSTATUS === AsoStatus.KIT_CREDENCIADA && (
              <div className="mt-1 text-yellow-400">
                <span className="text-xs">{paciente.ASOSTATUS}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Renderiza o card com o Tooltip se houver observações
    return (
      <div className="px-2 py-1" style={style}>
        <Tooltip
          key={`tooltip-obscard-${paciente.CODIGOPRONTUARIO}`}
          color="warning"
          content={
            <div className="px-1 py-2 max-w-xs">
              <p className="text-xs break-words font-medium">OBSERVAÇÕES:</p>
              <p className="text-xs break-words">{paciente.OBSERVACOES}</p>
            </div>
          }
          placement="right"
        >
          <div
            onClick={() => {
              if (isSyncingCard) return; // bloqueia cliques concorrentes
              if (isSelected) {
                handleDeselecionarAgendamento();
              } else {
                handleSelecionarPacienteAgendamento(paciente);
              }
            }}
            // Adicionei a classe 'relative' para que o chip 'absolute' funcione
            className={`relative p-2 rounded-lg border transition-all duration-200 ${isSyncingCard
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
              } ${isSelected
                ? "bg-[#e6f0ff] border-[#003366] ring-2 ring-[#003366]/20 shadow-md"
                : "bg-white border-gray-200 hover:border-[#003366] hover:shadow-sm hover:scale-[1.01]"
              }`}
          >
            {/* Conteúdo do card */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <InformationCircleIcon className={`h-4 w-4 text-amber-500`} />
                  <div
                    className={`font-medium text-sm truncate ${isSelected ? "text-[#003366]" : ""}`}
                  >
                    {paciente.NOME}
                  </div>
                  {isSelected && (
                    <Chip
                      className="ml-2"
                      color="primary"
                      size="sm"
                      variant="solid"
                    >
                      Selecionado
                    </Chip>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <span className="truncate">{paciente.NOMEEMPRESA}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500 gap-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span>
                    {paciente.HORARIO} - {paciente.TIPOEXAMENOME}
                    {paciente.ATENDIMENTOSTATUS !== AtendimentoStatus.AGENDADO &&
                      paciente.TICKET?.prefixo !== undefined
                      ? ` - ${paciente.TICKET.prefixo}${paciente.TICKET.numero}`
                      : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-1 flex flex-col items-start">
              {paciente.ASOSTATUS === AsoStatus.GERADO && (
                <span className="text-xs text-green-400">ASO OK</span>
              )}
              {paciente.ATENDIMENTOSTATUS && (
                <span
                  className={`text-left text-xs text-${getStatusColor(paciente.ATENDIMENTOSTATUS)}-500`}
                >
                  {formatAtendimentoStatusLabel(paciente.ATENDIMENTOSTATUS)}
                </span>
              )}
            </div>
          </div>
        </Tooltip>
      </div>
    );
  });

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
      >
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 p-2 bg-[#114E34] text-white">
          <div className="flex items-center gap-4">
            {/* Senha/Ticket em destaque */}
            {ticketSelecionado ? (
              <div className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                <div className="text-center">
                  <div className="text-xs text-white/90">Senha</div>
                  <div className="font-bold text-3xl tracking-wide text-yellow-300">
                    {ticketSelecionado.prefixo + ticketSelecionado.numero}
                  </div>
                </div>
              </div>
            ) : (
              <FilePlus size={40} />
            )}
            <div>
              <h3 className="text-xl font-semibold">Atendimento</h3>
              <p className="text-sm opacity-90">
                {[salaSelecionada, unidadeSelecionada, user?.nome].filter(Boolean).join(" - ") || "Selecione sala e unidade"}
              </p>
            </div>
          </div>

          {/* Close button */}
          <div className="ml-2">
            <Button
              isIconOnly
              aria-label="Fechar modal"
              className="bg-white/10 hover:bg-white/20 text-white rounded-full h-12 w-12 p-0"
              size="lg"
              variant="light"
              onPress={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </header>

        {/* BODY: left=form (scroll), right=sidebar (scroll) */}
        <div className="flex-1 flex min-h-0">
          {/* FORM (esquerda) */}
          <main className="flex-1 min-h-0 overflow-y-auto p-3 relative">
            {/* Overlay de Loading */}
            {isLoading && <LoadingOverlay />}

            {/* Conteúdo do modal (fica desabilitado durante o loading) */}
            <div
              className={`max-w-3xl mx-auto space-y-3 transition-opacity duration-300 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
            >
              {/* Indicador de agendamento selecionado */}
              {selectedSchedulingId && (
                <div
                  className="bg-blue-50 border border-blue-200 rounded-lg p-1 flex items-center justify-between"
                  id="empresa-autocomplete"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Agendamento selecionado:{" "}
                      <strong>{selectedSchedulingId}</strong>
                    </span>
                  </div>
                  <Button
                    className="text-blue-600 hover:bg-blue-100"
                    disabled={isLoading}
                    size="sm"
                    variant="light"
                    onPress={handleDeselecionarAgendamento}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Desselecionar
                  </Button>
                </div>
              )}

              {/* Empresa (obrigatório) */}
              <div>
                <Autocomplete
                  aria-label="Selecione a empresa"
                  className="w-full"
                  defaultItems={socCompanies}
                  inputProps={{
                    className:
                      showErrors && !validation.empresa
                        ? "ring-1 ring-amber-300"
                        : "",
                  }}
                  isDisabled={isLoading}
                  label={"Empresa"}
                  selectedKey={empresa || ""}
                  size="sm"
                  onSelectionChange={(key) => setEmpresa(String(key))}
                >
                  {(item: CadastroEmpresa) => (
                    <AutocompleteItem
                      key={item.CODIGO}
                      textValue={item.RAZAOSOCIAL}
                    >
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">
                          {item.RAZAOSOCIAL}
                        </span>
                        <span className="text-xs text-gray-500">
                          Cod {item.CODIGO}
                        </span>
                      </div>
                    </AutocompleteItem>
                  )}
                </Autocomplete>

                {showErrors && !validation.empresa && (
                  <div className="text-xs text-amber-700 mt-1">
                    Informe a empresa.
                  </div>
                )}
              </div>

              {/* Codigo funcionario (compact) e Nome funcionario */}
              <section className="flex items-baseline gap-2">
                <div className="mt-1">
                  <Input
                    aria-label="Codigo do funcionario"
                    className={`flex-1 ${showErrors && !codigoFuncionario ? "ring-1 ring-amber-300" : ""}`}
                    disabled={isLoading}
                    endContent={
                      codigoFuncionario != "" &&
                      empresa && (
                        <Button
                          aria-label="Buscar funcionario"
                          className="bg-transparent"
                          disabled={isLoading}
                          isIconOnly={true}
                          size="sm"
                          type="button"
                          onPress={handleBuscarFuncionario}
                        >
                          <Tooltip
                            key={`tooltip-searchbutton-${funcionarioSelecionado?.CODIGOPRONTUARIO}`}
                            color="foreground"
                            content="Buscar funcionario"
                            disableAnimation={true}
                          >
                            <UserRoundSearch />
                          </Tooltip>
                        </Button>
                      )
                    }
                    inputMode="numeric"
                    label={"Codigo SOC"}
                    size="sm"
                    value={codigoFuncionario}
                    onChange={(e: any) => {
                      const val = e.target.value;

                      if (/^\d*$/.test(val)) setCodigoFuncionario(val);
                    }}
                  />
                </div>

                {/* Nome do funcionario (obrigatorio) */}
                <div className="w-full">
                  <Input
                    aria-invalid={!validation.nome && showErrors}
                    className={`${showErrors && !validation.nome ? "ring-1 ring-amber-300" : ""}`}
                    disabled={isLoading}
                    endContent={
                      <Tooltip
                        key={`clipboard-copy-tooltip-${funcionarioSelecionado?.SCHEDULINGCODE}`}
                        color="foreground"
                        content="Copiar nome"
                        disableAnimation={true}
                      >
                        <Button
                          aria-label="Copiar nome"
                          isIconOnly={true}
                          size="sm"
                          type="button"
                          variant="light"
                          onPress={() => copyToClipboard(nome)}
                        >
                          <Copy />
                        </Button>
                      </Tooltip>
                    }
                    label={"Nome completo"}
                    size="sm"
                    value={nome}
                    onChange={(e: any) => setNome(e.target.value.toUpperCase())}
                  />
                  {showErrors && !validation.nome && (
                    <div className="text-xs text-amber-700 mt-1">
                      Informe o nome do funcionario.
                    </div>
                  )}
                </div>
              </section>

              {/* Informações adicionais: Nascimento, CPF, Horário */}
              <section className="flex gap-2">
                <Input
                  className="text-xs"
                  disabled={isLoading}
                  label={"Data de nascimento"}
                  maxLength={10}
                  size="sm"
                  value={dataNascimento}
                  onChange={(e) => handleDataNascimento(e.target.value)}
                />
                <Input
                  className="text-xs"
                  disabled={isLoading}
                  label={"CPF"}
                  size="sm"
                  value={cpf}
                  onChange={(e) => handleCpfInput(e.target.value)}
                />
                <Input
                  readOnly
                  className="text-xs"
                  disabled={isLoading}
                  label={"Horário"}
                  size="sm"
                  value={
                    funcionarioSelecionado?.HORARIO
                      ? funcionarioSelecionado.HORARIO
                      : undefined
                  }
                />
                <Input
                  className="text-xs"
                  disabled={isLoading}
                  label={"Telefone"}
                  size="sm"
                  value={telefone}
                  onChange={(e) => handleTelefoneInput(e.target.value)}
                />
              </section>

              <section className="flex gap-2">
                <Input
                  readOnly
                  className="text-xs"
                  disabled={isLoading}
                  label={"Cargo"}
                  size="sm"
                  value={
                    funcionarioSelecionado?.NOMECARGO
                      ? funcionarioSelecionado.NOMECARGO
                      : undefined
                  }
                />
                <Input
                  readOnly
                  className="text-xs"
                  disabled={isLoading}
                  label={"Setor"}
                  size="sm"
                  value={
                    funcionarioSelecionado?.NOMESETOR
                      ? funcionarioSelecionado.NOMESETOR
                      : undefined
                  }
                />
                <Input
                  readOnly
                  className="text-xs"
                  disabled={isLoading}
                  label={"Unidade"}
                  size="sm"
                  value={
                    funcionarioSelecionado?.NOMEUNIDADE
                      ? funcionarioSelecionado.NOMEUNIDADE
                      : undefined
                  }
                />
              </section>

              {/* Tipo de Exame - ToggleGroup (acessível) */}
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de Exame *
                  </label>
                </div>

                <div
                  aria-label="Tipo de exame"
                  className="grid grid-cols-3 mt-2 gap-2 flex-wrap"
                  role="radiogroup"
                >
                  {Object.entries(TIPOS_EXAME).map(([key, value]) => {
                    const active = tipoExame === value;

                    return (
                      <Button
                        key={key}
                        aria-checked={active}
                        className={`px-3 py-1.5 rounded-md text-xs border transition  ${active
                          ? "bg-[#6AA84F] text-white border-[#6AA84F]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#003366]"
                          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                        disableAnimation={true}
                        disabled={isLoading}
                        role="radio"
                        size="sm"
                        type="button"
                        onPress={() => handleToggleTipo(key)}
                      >
                        {value}
                      </Button>
                    );
                  })}
                </div>

                {showErrors && !validation.tipoExame && (
                  <div className="text-xs text-amber-700 mt-1">
                    Selecione o tipo de exame.
                  </div>
                )}

                {isBindServiceSelected && (
                  <div className="mt-4">
                    <div className="mt-1 flex flex-col align-center items-start space-x-2">
                      <div className="mt-2 mb-2">
                        {records && (
                          <Select
                            className="min-w-lg"
                            disabled={isLoading}
                            label="Prontuários"
                            placeholder="Prontuários disponíveis"
                            selectedKeys={recordsCodes}
                            selectionMode="multiple"
                            size="sm"
                            onSelectionChange={(keys) => {
                              const stringKeys = new Set(
                                Array.from(keys).map(String),
                              );

                              setRecordsCodes(stringKeys);
                            }}
                          >
                            {records.map((rec) => (
                              <SelectItem key={String(rec.IDFICHA)}>
                                {`${convertTipoAsoNome(rec.TPASO)} - ${rec.DATAFICHA} - ${convertRespAso(rec.RESASO)}`}
                              </SelectItem>
                            ))}
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Exames (checkbox grid) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    {empresa && codigoFuncionario && funcionarioSelecionado && isAgendado && (
                      <Checkbox
                        color="danger"
                        disabled={isLoading}
                        isSelected={somentePa}
                        onValueChange={handleSomentePa}
                      >
                        <span
                          className={`text-sm ${somentePa ? "text-red-600" : "text-gray-700"}`}
                        >
                          Somente P.A
                        </span>
                      </Checkbox>
                    )}
                    <div className="text-xs text-gray-400">
                      {codigoExames.length} selecionado(s)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.keys(examesData || {}).map((exame, index) => {
                    const isSelected = codigoExames.includes(exame);

                    return (exame === "Laboratório" || exame === "Raio-X") &&
                      isSelected ? (
                      <Tooltip
                        key={`tooltip-exame-${exame}-${index}`}
                        className="p-2 bg-amber-100"
                        content={
                          exame == "Laboratório"
                            ? laboratorialExames?.map((e, i) => (
                              <span key={`lab-${i}`} className="text-xs">
                                {e}
                              </span>
                            ))
                            : examesImagem?.map((e, i) => (
                              <span key={`img-${i}`} className="text-xs">
                                {e}
                              </span>
                            ))
                        }
                        disableAnimation={true}
                      >
                        <Button
                          key={exame}
                          aria-checked={isSelected}
                          className={`px-3 py-1.5 rounded-md justify-start items-center text-xs border transition ${isSelected
                            ? "bg-[#6AA84F] text-white font-medium border-[#6AA84F]"
                            : "bg-white text-gray-700 border-gray-200 hover:border-[#003366]"
                            } ${isLoading || !isAgendado ? "opacity-50 cursor-not-allowed" : ""}`}
                          disableAnimation={true}
                          disabled={isLoading || !isAgendado}
                          role="radio"
                          size="sm"
                          type="button"
                          onPress={() => toggleExame(exame)}
                        >
                          {exame}
                        </Button>
                      </Tooltip>
                    ) : (
                      <Button
                        key={exame}
                        aria-checked={isSelected}
                        className={`px-3 py-1.5 rounded-md justify-start items-center text-xs border transition ${isSelected
                          ? "bg-[#6AA84F] text-white font-medium border-[#6AA84F]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#003366]"
                          } ${isLoading || !isAgendado ? "opacity-50 cursor-not-allowed" : ""}`}
                        disableAnimation={true}
                        disabled={isLoading || !isAgendado}
                        role="radio"
                        size="sm"
                        type="button"
                        onPress={() => toggleExame(exame)}
                      >
                        {exame.includes("Psico") && isSelected ? (
                          <div className="flex justify-between items-baseline-last w-full">
                            <span>{exame}</span>
                            <span>
                              Com psico.{" "}
                              <Switch
                                checked={psicoPresencial}
                                color="warning"
                                disabled={isLoading}
                                id="psicossocial-switch"
                                size="md"
                                onValueChange={handlePsicoExame}
                              />
                            </span>
                          </div>
                        ) : (
                          <span>{exame}</span>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {showErrors && !validation.exames && (
                  <div className="text-xs text-amber-700 mt-1">
                    Marque ao menos 1 exame.
                  </div>
                )}
              </div>

              {/* Observações */}
              {observacoes && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-xs text-amber-700 flex justify-baseline gap-2">
                    <Info className="h-4 w-4" />
                    <strong>Observações:</strong> {observacoes}
                  </div>
                </div>
              )}

              {/* Anexos */}
              {anexos.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Anexos
                  </label>
                  {anexos.map((anexo: FileUpload, index) => (
                    <Button
                      key={anexo.Name || index}
                      color="default"
                      disabled={isLoading}
                      size="sm"
                      variant="light"
                      onPress={() => handleViewAttachment(anexo)}
                    >
                      {anexo.Name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Anotacoes */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Anotacoes
                </label>
                <Textarea
                  isClearable
                  className="resize-none"
                  disabled={isLoading}
                  label="Informacoes internas"
                  minRows={2}
                  value={anotacoes}
                  onValueChange={setAnotacoes}
                />
              </div>

              {/* Vincular prontuario */}
              <div>
                <div>
                  <input
                    multiple
                    accept=".pdf,image/*"
                    className="hidden"
                    disabled={isLoading}
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <label
                    className={`cursor-pointer text-xs inline-flex items-center px-3 py-2 rounded-full ${isLoading
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-gray-500 text-white hover:bg-gray-600"
                      }`}
                    htmlFor="file-upload"
                  >
                    Anexos {filesUpload.length > 0 ? filesUpload.length : ""}
                  </label>
                  {filesUpload.map((file) => (
                    <Chip
                      key={file.name}
                      className="mt-2 text-xs"
                      size="sm"
                      onClose={() => handleRemoveFile(file.name)}
                    >
                      {file.name}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Atendimento Preferencial - Modificado */}
              {(ticketSelecionado?.preferencial ||
                ticketSelecionado == null) && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Atendimento Preferencial
                      {ticketSelecionado?.preferencialTipo && (
                        <span className="ml-2 text-xs text-green-600 font-semibold">
                          (Tipo já definido: {ticketSelecionado.preferencialTipo})
                        </span>
                      )}
                    </label>

                    <div className="mt-2 flex gap-2 flex-wrap">
                      {PREFERENCIAL_OPTIONS.map((pref) => {
                        const active = preferencialTipo === pref;
                        const isDisabled =
                          ticketSelecionado?.preferencialTipo &&
                          ticketSelecionado.preferencialTipo !== "Outros" &&
                          pref !== "Outros";

                        return (
                          <Button
                            key={pref}
                            className={`px-3 py-1 rounded-md text-sm border transition ${active
                              ? "bg-[#6AA84F] text-white border-[#6AA84F]"
                              : "bg-white text-gray-700 border-gray-200 hover:border-[#003366]"
                              } ${isLoading || isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={isLoading}
                            type="button"
                            value={pref}
                            onPress={(e: any) => {
                              // Se já tem tipo definido, só permite alterar para "Outros"
                              if (
                                ticketSelecionado?.preferencialTipo &&
                                ticketSelecionado.preferencialTipo !== "Outros" &&
                                pref !== "Outros"
                              ) {
                                return;
                              }
                              togglePreferencial(e.target.value);
                            }}
                          >
                            {pref}
                            {pref === "Outros" &&
                              ticketSelecionado?.preferencialTipo && (
                                <span className="ml-1 text-xs">(Alterar)</span>
                              )}
                          </Button>
                        );
                      })}
                    </div>

                    {ticketSelecionado?.preferencialTipo &&
                      ticketSelecionado.preferencialTipo !== "Outros" && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-700">
                            <Info className="h-3 w-3 inline mr-1" />O tipo
                            preferencial{" "}
                            <strong>{ticketSelecionado.preferencialTipo}</strong>{" "}
                            foi definido no totem. Você pode alterar para "Outros"
                            se necessário.
                          </p>
                        </div>
                      )}
                  </div>
                )}
            </div>
          </main>

          {/* SIDEBAR (direita) */}
          <aside className="w-80 border-l border-gray-200 bg-gray-100 flex flex-col min-h-0">
            <div className="p-3 border-b border-gray-200 bg-white">
              <div className="flex justify-between mb-2">
                {/* <div className="p-2 rounded ">
                  <Calendar className="h-5 w-5 " />
                </div> */}
                <div>
                  <h4 className="font-medium">Atendimentos</h4>
                  <div className="text-xs text-gray-500">
                    {filteredAgendamentos.length} funcionarios
                  </div>
                </div>

                <Select
                  className="max-w-26"
                  defaultSelectedKeys={["all"]}
                  disableAnimation={true}
                  required={true}
                  selectionMode="single"
                  size="sm"
                  variant="underlined"
                  onChange={(key) => {
                    handleDeselecionarAgendamento();
                    setStatusFilter(key.target.value);
                  }}
                >
                  <SelectItem key={"all"} variant="light">
                    Todos
                  </SelectItem>
                  <SelectItem key={"MANHA"} variant="light">
                    Manha
                  </SelectItem>
                  <SelectItem key={"TARDE"} variant="light">
                    Tarde
                  </SelectItem>
                </Select>
              </div>

              {/* Search */}
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar funcionário, empresa ou CPF..."
                  size="sm"
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    isIconOnly
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    size="sm"
                    variant="light"
                    onPress={() => setSearchTerm("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {filteredAgendamentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                  <Filter className="h-10 w-10 mb-2 text-gray-300" />
                  <div className="text-sm text-center">
                    {searchTerm
                      ? "Nenhum paciente encontrado"
                      : "Nenhum agendamento para hoje"}
                  </div>
                </div>
              ) : (
                <List
                  ref={listRef}
                  className="overflow-auto min-h-full"
                  height={280}
                  itemCount={filteredAgendamentos.length}
                  itemData={filteredAgendamentos}
                  itemSize={110} // Aumentado para acomodar o chip de selecionado
                  width={"100%"}
                >
                  {(props) => (
                    <PacienteItem {...props} data={filteredAgendamentos} />
                  )}
                </List>
              )}
            </div>
          </aside>
        </div>

        {/* FOOTER (fora do scroll) */}
        <footer className="border-t border-gray-200 bg-white p-3 flex items-center justify-between">
          {/* Grupo Esquerdo: Ações Complementares + Biometria */}
          <div className="flex items-center gap-3 min-h-[44px]">
            {funcionarioSelecionado && (
              <>
                <Button
                  className="px-4 py-2 rounded hover:bg-gray-100"
                  disabled={isSubmitting || isLoading || isSyncingCard}
                  variant="flat"
                  onPress={handlePreparationModal}
                >
                  <FileInput className="h-4 w-4 mr-2" /> Solicitar Preparo
                </Button>
                {/* Dropdown de Guia */}
                <Dropdown className="z-[100]" placement="top-start">
                  <DropdownTrigger>
                    <Button
                      className="px-4 py-2 rounded hover:bg-gray-100"
                      disabled={isSubmitting || isLoading || isSyncingCard}
                      variant="flat"
                    >
                      <PrinterCheck className="h-4 w-4 mr-2" /> Guia
                      <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Opções de guia"
                    items={[
                      { key: "__default__", label: "Guia Padrão", description: "Guia com todos os exames" },
                      ...prestadores.filter((p) => p.ativo && p.unidade.trim().toUpperCase() === String(unidadeSelecionada || "").trim().toUpperCase() && p.grupos.some((g) => codigoExames.includes(g))).map((p) => ({
                        key: p.id, label: `Guia • ${p.nome}`, description: [p.unidade, p.grupos.join(", ")].filter(Boolean).join(" • "),
                      })),
                    ]}
                    onAction={(key) => { handlePrint(key === "__default__" ? undefined : prestadores.find((p) => p.id === key)); }}
                  >
                    {(item) => (
                      <DropdownItem key={item.key} description={item.description} startContent={<PrinterCheck className="h-4 w-4" />}>
                        {item.label}
                      </DropdownItem>
                    )}
                  </DropdownMenu>
                </Dropdown>

                {/* Dropdown de Biometria / Metodo de Validacao */}
                <Dropdown className="z-[100]" placement="top-start">
                  <DropdownTrigger>
                    <Button
                      className="px-4 py-2 rounded hover:bg-gray-100"
                      disabled={isSubmitting || isLoading || isSyncingCard}
                      variant="flat"
                    >
                      <span
                        className={`mr-2 ${
                          isCapturingBiometria
                            ? "animate-pulse text-blue-500"
                            : funcionarioSelecionado?.AUTENTICACAOATENDIMENTO?.status ===
                                "VALIDADO"
                              ? "text-green-600"
                              : "text-gray-500"
                        }`}
                      >
                        {authVisual.icon}
                      </span>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs font-semibold">
                          {authVisual.label}
                        </span>
                        {metodoValidacao === "BIOMETRIA" &&
                        funcionarioSelecionado?.AUTENTICACAOATENDIMENTO?.status ===
                          "VALIDADO" ? (
                          <span className="text-[10px] text-green-600 font-medium">
                            Registrada
                            {funcionarioSelecionado?.AUTENTICACAOATENDIMENTO?.biometria
                              ?.dedo
                              ? ` - ${formatDedoLabel(
                                  funcionarioSelecionado.AUTENTICACAOATENDIMENTO
                                    .biometria.dedo,
                                )}`
                              : dedoCapturado
                                ? ` - ${formatDedoLabel(dedoCapturado)}`
                                : ""}
                          </span>
                        ) : (
                          authVisual.badge
                        )}
                      </div>
                      <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Opcoes de validacao"
                    onAction={(key) => {
                      if (key === "BIOMETRIA") {
                        setMetodoValidacao("BIOMETRIA");
                        handleAbrirBiometriaFuncionario();
                      }
                      if (key === "FACIAL") {
                        setMetodoValidacao("FACIAL");
                        handleAbrirFacial();
                      }
                      if (key === "SOC") setMetodoValidacao("SOC");
                    }}
                  >
                    <DropdownItem
                      key="BIOMETRIA"
                      description="Cadastrar ou validar biometria"
                      startContent={<Fingerprint className="h-4 w-4 text-emerald-600" />}
                    >
                      Biometria
                    </DropdownItem>
                    <DropdownItem
                      key="FACIAL"
                      description="Reconhecimento facial"
                      startContent={<Camera className="h-4 w-4 text-emerald-600" />}
                    >
                      Facial
                    </DropdownItem>
                    <DropdownItem
                      key="SOC"
                      description="Fluxo padrao via SOC"
                      startContent={<Globe className="h-4 w-4 text-blue-600" />}
                    >
                      SOC (Padrao)
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </>
            )}

            {showErrors && !validation.all && (
              <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Corrija os campos obrigatórios
              </div>
            )}
          </div>

          {/* Grupo Direito: Atendimento */}
          <div className="flex items-center gap-3">
            <Button
              className="px-4 py-2 rounded hover:bg-gray-100"
              disabled={isSubmitting}
              variant="flat"
              onPress={() => {
                if (isCapturingBiometria) handleCloseBiometria();
                onClose();
              }}
            >
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>

            <Button
              className="px-4 py-2 rounded bg-[#114E34] text-white hover:bg-[#0b3523] hover:shadow-lg transition-all duration-200"
              isDisabled={!validation.all || isSubmitting || isAuthBlockedForSubmit}
              isLoading={isSubmitting}
              spinner={<Spinner color="success" size="sm" />}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Enviar Atendimento
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>

      {socket && funcionarioSelecionado && (
        <>
          {process.env.NEXT_PUBLIC_BIOMETRIA_CAPTURA_SIMPLES_DEV === 'true' && (
            <BiometriaModal
              state={{
                isOpen: isCapturingBiometria,
                status: biometriaStatus,
                mensagem: biometriaMessage,
                requestId: biometriaRequestId || undefined,
                context: {
                  operadorNome: user.nome,
                  unidade: unidadeSelecionada,
                  sala: salaSelecionada,
                  funcionarioNome: funcionarioSelecionado.NOME,
                  funcionarioId: getBiometriaFuncionarioRef(funcionarioSelecionado),
                  funcionarioCpf: biometriaContextExtra.cpf,
                  funcionarioDataNascimento: biometriaContextExtra.dataNascimento,
                  atendimentoId: getSchedulingMongoId(funcionarioSelecionado),
                },
              }}
              onClose={handleCloseBiometria}
              onRetry={handleCapturarBiometria}
            />
          )}

          <CadastroBiometricoModal
            state={cadastroBiometricoModal}
            onClose={fecharCadastroBiometricoModal}
            onStartCapture={handleConfirmarDedoCadastro}
            onReset={resetarCadastroBiometricoModal}
          />

          <BiometriaValidacaoModal
            state={validacaoModal}
            onClose={handleCloseValidacao}
            onRetry={handleRetryValidacao}
          />

          <FacialModal
            isOpen={facialModalOpen}
            context={facialContext}
            onClose={handleFacialClose}
          />

          <BiometriaFuncionarioModal
            isOpen={biometriaStatusModalOpen}
            onClose={() => setBiometriaStatusModalOpen(false)}
            socket={socket}
            unidade={unidadeSelecionada}
            operador={{
              id: String(user.codigo || user.nome),
              nome: user.nome,
              perfil: user.perfil,
            }}
            funcionario={funcionarioSelecionado ? {
              id: getSchedulingMongoId(funcionarioSelecionado),
              nome: funcionarioSelecionado.NOME,
              schedulingId: getSchedulingMongoId(funcionarioSelecionado),
            } : null}
            onAction={(action, payload) => {
              setBiometriaStatusModalOpen(false);
              if (action === "CADASTRAR" || action === "REACADASTRAR" || action === "NOVO_CADASTRO") {
                handleCadastroBiometrico();
              } else if (action === "VALIDAR") {
                handleValidarBiometria(payload?.dedo);
              }
            }}
          />

          <EmPreparacaoModal
            funcionario={funcionarioSelecionado}
            isOpen={isOpenPreparationModal}
            salaSelecionada={salaSelecionada}
            socket={socket}
            ticket={ticketSelecionado ?? null}
            unidadeSelecionada={unidadeSelecionada}
            onOpenChange={setIsOpenPreparationModal}
          />
        </>
      )}

      {/* Modal de selecao de multiplas fichas (ASO) */}
      <Modal
        disableAnimation={true}
        isDismissable={false}
        isOpen={!!reuseExistingPrompt}
        placement="center"
        size="md"
      >
        <ModalContent className="border border-[#114E34]/20">
          <ModalHeader className="text-[#114E34] flex items-center gap-2">
            <ExclamationCircleIcon className="h-6 w-6 text-[#114E34]" />
            Atendimento Encontrado
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <p className="text-sm text-gray-700 leading-6">
                Encontramos um atendimento válido para este funcionário na data atual.
              </p>
              <div className="rounded-xl border border-[#114E34]/15 bg-[#114E34]/[0.03] p-4">
                <p className="text-sm font-medium text-[#114E34]">
                  Deseja reutilizar este atendimento?
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Se você continuar, vamos carregar o prontuário existente e seguir o fluxo normal de validação.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button
              className="px-4 py-2 rounded hover:bg-gray-100"
              size="sm"
              variant="flat"
              onPress={handleCancelarReutilizacao}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#114E34] text-white hover:bg-[#0b3523] focus-visible:ring-2 focus-visible:ring-[#114E34]/40"
              size="sm"
              onPress={handleConfirmarReutilizacao}
            >
              Reutilizar atendimento
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        disableAnimation={true}
        isDismissable={false}
        isOpen={isAsoSelectionOpen}
        placement="center"
        size="lg"
      >
        <ModalContent className="border border-[#114E34]/20">
          <ModalHeader className="text-[#114E34] flex items-center gap-2">
            <ExclamationCircleIcon className="h-6 w-6 text-[#114E34]" />
            Múltiplas Fichas Encontradas
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Foram encontradas <strong>{asoOptions.length}</strong> fichas de ASO para este funcionário na data de hoje. Selecione qual deseja encaminhar para atendimento:
            </p>
            <div className="space-y-3">
              {asoOptions.map((option, index) => (
                <div
                  key={option.sequenciaFicha || index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-[#114E34] hover:shadow-md transition-all cursor-pointer bg-white"
                  onClick={() => handleConfirmarAsoOption(option)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmarAsoOption(option);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {option.tipoExameNome}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Ficha: <strong>{option.sequenciaFicha || "N/A"}</strong>
                        {option.dataFicha ? ` - ${option.dataFicha}` : ""}
                      </p>
                    </div>
                    <div className="bg-[#114E34] text-white text-xs px-3 py-1 rounded-full font-medium">
                      Selecionar
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button
              className="px-4 py-2 rounded hover:bg-gray-100"
              size="sm"
              variant="flat"
              onPress={handleCancelarAsoSelection}
            >
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Alerta */}
      <Modal disableAnimation={true} isDismissable={false} isOpen={modalAlert}>
        <ModalContent className="border border-[#114E34]/20">
          <ModalHeader className="text-[#114E34]">
            {isSuccessModal ? (
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            ) : (
              <ExclamationCircleIcon className="h-6 w-6 text-[#114E34]" />
            )}{" "}
            {isSuccessModal ? "Sucesso" : "Atenção"}
          </ModalHeader>
          <ModalBody>{modalText}</ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button
              className="bg-[#114E34] text-white hover:bg-[#0b3523] focus-visible:ring-2 focus-visible:ring-[#114E34]/40"
              size="sm"
              onPress={() => {
                setModalAlert(false);
                // Se for mensagem de sucesso, fecha o modal principal
                if (isSuccessModal) {
                  onClose();
                }
                // Reset dos estados
                setIsSuccessModal(false);
              }}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default React.memo(AtendimentoModal);
