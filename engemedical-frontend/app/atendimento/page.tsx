"use client";
import { useRouter } from "next/navigation";
import { Socket } from "socket.io-client";
import { useSocket } from "@/lib/websocket/hooks/useSocket";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { UserLock } from "lucide-react";
import dynamic from "next/dynamic";

import { PscProviderStatus } from "./components/PscProviderStatus";
import { PscProviderSelector } from "./components/PscProviderSelector";

import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { usePscAuthStatus } from "@/hooks/usePscAuthStatus";
import {
  emitEvent,
  EventType,
  TicketActionSuccessPayload,
  BiometriaCapturaResultPayload,
  BiometriaCapturaStatusPayload,
  BiometriaAgentUnavailablePayload,
  BiometriaRequestStatePayload,
  BiometriaAgentSnapshotPayload,
} from "@/lib/websocket/events/events";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import { useEntityManager } from "@/hooks/useEntityManager";
import { getCurrentUser, logout } from "@/lib/utils";
import { sendLocalNotification } from "@/lib/notifications";
import {
  createAtendimentoLoadFlow,
  mergeSchedulesById,
  filterSchedulesByUnit,
} from "@/lib/atendimento/atendimento-load-flow";
import type { ExamToogle } from "@/lib/exames/utils/exames-helper";
import { FALLBACK_EXAMES_GROUPED, normalizeExamLabel } from "@/lib/exames/utils/fallback-exames";
import { getExamsCatalog } from "@/lib/exames/utils/exames-catalog-cache";
import EmptyState from "@/app/recepcao/components/EmptyState";
import { SidebarRecepcao } from "@/components/shared/Sidebar";
import { HeaderApp } from "@/components/shared/HeaderApp";
import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";
import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import {
  PreparationRequest,
  Ticket,
  TicketGroups,
  TicketStatus,
  TicketActionType,
} from "@/lib/ticket/ticket";
import { IndexDb } from "@/lib/indexDb/indexdb";
import {
  Scheduling,
  SchedulingChange,
} from "@/lib/scheduling/interface/scheduling";
import {
  NEST_SOC_COMPANIES,
  NEST_TELEATENDIMENTO_SESSION,
  NEST_SCHEDULINGS_TODAY,
  NEST_TICKET_QUERY,
} from "@/config/constants";
import {
  AtendimentoStatus,
  ExamStatus,
  MongoOperationTypes,
} from "@/lib/scheduling/enum/scheduling.enum";
import { StatsModal } from "@/app/recepcao/components/SenhasEstatisticas";
import AtendimentoContent from "@/app/atendimento/components/AtendimentoContent";
import AtendimentoModalExames from "@/app/atendimento/components/AtendimentoModalExames";
import BiometriaModal, {
  BiometriaModalState,
} from "@/app/atendimento/components/BiometriaModal";
import FacialModal, {
  FacialContext,
} from "@/app/atendimento/components/FacialModal";
import LazyModalContent from "@/app/relatorio/LazyModalContent";
import TeleatendimentoPanel from "@/app/teleatendimento/components/TeleatendimentoPanel";

const SenhasEstatisticas = dynamic<import("@/app/recepcao/components/SenhasEstatisticas").SenhasEstatisticasProps>(
  () => import("@/app/recepcao/components/SenhasEstatisticas"),
  {
    ssr: false,
    loading: () => (
      <div className="h-16 w-full animate-pulse bg-gray-200/40 rounded-lg" />
    ),
  },
);

// =================================================================================
// Socket singleton & helpers
// =================================================================================

type PendingActionInfo = {
  action: string;
  startedAt: number;
  phase: "pending" | "acknowledged" | "resync";
};

const AtendimentoPage: React.FC = () => {
  const [user, setUser] = useState<IUserInfo | null>(() => getCurrentUser());
  const [conectado, setConectado] = useState(false);
  const {
    socket,
    connected,
    isReconnecting,
    connect,
    disconnect,
    registerHandlers,
  } = useSocket();
  const socketRef = useRef<Socket | null>(null);
  const teleatendimentoPanelRef = useRef<any>(null);
  const loadFlowRef = useRef(createAtendimentoLoadFlow());
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("");

  // Debounce de 300ms na troca de unidade para evitar mÃºltiplas chamadas simultÃ¢neas
  const unidadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const setUnidadeSelecionadaDebounced = useCallback((value: string) => {
    if (unidadeTimerRef.current) clearTimeout(unidadeTimerRef.current);
    unidadeTimerRef.current = setTimeout(() => setUnidadeSelecionada(value), 300);
  }, []);

  const [statusSelecionado, setStatusSelecionado] = useState("");
  const [salaSelecionada, setSalaSelecionada] = useState("");
  const [exameSelecionado, setExameSelecionado] = useState("");
  const [codigosDeAtendimento, setCodigosDeAtendimento] = useState<Set<string>>(
    new Set(),
  );
  const [examesData, setExamesData] = useState<Record<string, ExamToogle[]>>(
    FALLBACK_EXAMES_GROUPED,
  );
  const [agendamentos, setAgendamentos] = useState<Scheduling[]>([]);
  const [agendamentosGeral, setAgendamentosGeral] = useState<Scheduling[]>([]);
  const [empreparacao, setEmPreparacao] = useState<PreparationRequest[]>([]);
  const [modalAtendimentoAberto, setModalAtendimentoAberto] = useState(false);
  const [modalAlert, setModalAlert] = useState<boolean>(false);
  const [modalText, setModalText] = useState<React.ReactNode>("");
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [relatorioModal, setRelatorioModal] = useState<{
    open: boolean;
    atendimento: Scheduling | null;
  }>({ open: false, atendimento: null });
  const [isLoading, setIsLoading] = useState(false);
  const [aguardandoPrimeirosAtendimentos, setAguardandoPrimeirosAtendimentos] =
    useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    "conectando" | "carregando-tickets" | "recebendo-atendimentos"
  >("conectando");
  const [pendingActions, setPendingActions] = useState<
    Record<number, PendingActionInfo>
  >({});
  const [funcionarioSelecionado, setFuncionarioSelecionado] =
    useState<Scheduling | null>(null);
  const router = useRouter();
  const {
    entities: tickets,
    setAll,
    getAll,
    clear,
    addOrUpdate,
    remove,
  } = useEntityManager<Ticket>([]);
  const [estatisticas, setEstatisticas] = useState<Record<string, number>>({
    pendentes: 0,
    finalizados: 0,
    aguardandoRecepcao: 0,
    total: 0,
    aguardando: 0,
    preparacao: 0,
    raiox: 0,
    recepcaoAguardando: 0,
    examesAguardando: 0,
    emAtendimento: 0,
  });

  const {
    settings,
    pscAuthStatus,
    isLoading: isPscLoading,
    refetch: refetchPscStatus,
  } = usePscAuthStatus();

  const assinaDigitalmente = settings?.assinaDigitalmente ?? false;
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);

  const [isPscAuthenticating, setIsPscAuthenticating] = useState(false);
  const [modalPscAvisoOpen, setModalPscAvisoOpen] = useState(false);
  const [isWaitingForAuthToConnect, setIsWaitingForAuthToConnect] =
    useState(false);
  const [pscAuthWindowUrl, setPscAuthWindowUrl] = useState<string>("");
  const pscWindowRef = useRef<Window | null>(null);
  const pscPollingRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const previousPscStatusRef = useRef(pscAuthStatus.status);
  const [biometriaModal, setBiometriaModal] = useState<BiometriaModalState>({
    isOpen: false,
    status: "idle",
  });
  const biometriaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [facialModalOpen, setFacialModalOpen] = useState(false);
  const [facialContext, setFacialContext] = useState<FacialContext | null>(
    null,
  );
  const [teleatendimentoSessionId, setTeleatendimentoSessionId] = useState<string | null>(null);
  const [isTelemedicinaModo, setIsTelemedicinaModo] = useState<boolean>(false);

  useEffect(() => {
    getExamsCatalog().then(setExamesData);
  }, []);

  useEffect(() => {
    return () => {
      if (pscPollingRef.current) clearInterval(pscPollingRef.current);
      Object.values(pendingTimeoutsRef.current).forEach((timer) =>
        clearTimeout(timer),
      );
      if (unidadeTimerRef.current) clearTimeout(unidadeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPscAuthenticating) {
      pscPollingRef.current = setInterval(async () => {
        if (pscWindowRef.current && pscWindowRef.current.closed) {
          if (pscPollingRef.current) clearInterval(pscPollingRef.current);
          setIsPscAuthenticating(false);
          addToast({
            title: "Autenticação Não Concluída",
            description: "A janela de autenticação foi fechada antes de concluir.",
            severity: "warning",
            color: "foreground",
            variant: "flat",
          });
          return;
        }
        try {
          await refetchPscStatus();
        } catch {}
      }, 3000);
    } else {
      if (pscPollingRef.current) clearInterval(pscPollingRef.current);
    }
    return () => {
      if (pscPollingRef.current) clearInterval(pscPollingRef.current);
    };
  }, [isPscAuthenticating, refetchPscStatus]);

  useEffect(() => {
    if (isPscAuthenticating && pscAuthStatus.isActive) {
      setIsPscAuthenticating(false);
      if (pscWindowRef.current && !pscWindowRef.current.closed) {
        pscWindowRef.current.close();
      }
      addToast({
        title: "Autenticação Realizada",
        description: "Assinatura digital habilitada com sucesso.",
        severity: "success",
        color: "foreground",
        variant: "flat",
      });
        if (isWaitingForAuthToConnect) {
        setIsWaitingForAuthToConnect(false);
      }
    }
  }, [pscAuthStatus.isActive, isPscAuthenticating, isWaitingForAuthToConnect]);

  useEffect(() => {
    const previousStatus = previousPscStatusRef.current;
    const currentStatus = pscAuthStatus.status;
    if (previousStatus !== currentStatus && currentStatus === "EXPIRED") {
      addToast({
        title: "Sessão PSC expirada",
        description: "Sua autenticação de assinatura expirou. Reautentique-se para continuar assinando digitalmente.",
        severity: "warning",
        color: "foreground",
        variant: "flat",
      });
    }
    previousPscStatusRef.current = currentStatus;
  }, [pscAuthStatus.status]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const handlePscAuth = async (provider?: string) => {
    try {
      const response = await fetch("/api/psc/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!response.ok) throw new Error(await response.text() || "Falha ao iniciar autenticação");
      const data = await response.json();
      if (data.url) {
        setPscAuthWindowUrl(data.url);
        setIsPscAuthenticating(true);
        const width = 800;
        const height = 700;
        const left = window.screen.width ? (window.screen.width - width) / 2 : 0;
        const top = window.screen.height ? (window.screen.height - height) / 2 : 0;
        const newWindow = window.open(data.url, "psc_auth", `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`);
        if (newWindow) {
          pscWindowRef.current = newWindow;
          newWindow.focus();
        }
      }
    } catch (error: any) {
      addToast({
        title: "Erro de Autenticação",
        description: `Falha ao conectar com provedor: ${error.message || "Erro desconhecido"}`,
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    }
  };

  const handlePscClick = () => {
    if (pscAuthStatus.status === "ACTIVE") {
      addToast({ title: "Sessão Ativa", description: "Sua sessão com o provedor de assinatura está ativa.", severity: "success", color: "foreground", variant: "flat" });
      return;
    }
    if (settings?.assinaturaProvider === "BRYKMS") {
      if (settings?.uuidCert && settings?.uuidCert.trim() !== "") {
        addToast({ title: "BRy Cloud Configurado", description: "Seu provedor BRy Cloud está configurado e pronto para uso.", severity: "success", color: "foreground", variant: "flat" });
        return;
      }
    }
    const defaultPscProvider = settings?.pscPadrao ?? settings?.provedorPadrao;
    if (defaultPscProvider) handlePscAuth(defaultPscProvider);
    else setIsProviderSelectorOpen(true);
  };

  const iniciarBiometria = useCallback(
    (params: {
      funcionarioId: string;
      funcionarioNome: string;
      funcionarioCpf?: string;
      funcionarioDataNascimento?: string;
      atendimentoId: string;
      ticketId?: string;
      exame?: string;
      unidade: string;
      sala: string;
      estacaoId: string;
    }) => {
      if (!socketRef.current) {
        addToast({
          title: "Biometria indisponível",
          description: "Conecte-se ao atendimento para iniciar a autenticação biométrica.",
          severity: "warning",
          color: "foreground",
          variant: "flat",
        });
        return;
      }

      if (biometriaModal.requestId) {
        emitEvent(socketRef.current, EventType.BIOMETRIA_CAPTURA_CANCEL, {
          requestId: biometriaModal.requestId,
          unidade: biometriaModal.context?.unidade ?? params.unidade,
        });
      }

      const requestId = `bio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setBiometriaModal({
        isOpen: true,
        status: "routing",
        requestId,
        context: {
          operadorNome: user?.nome ?? undefined,
          unidade: params.unidade,
          sala: params.sala,
          estacaoId: params.estacaoId,
          funcionarioNome: params.funcionarioNome,
          funcionarioId: params.funcionarioId,
          funcionarioCpf: params.funcionarioCpf,
          funcionarioDataNascimento: params.funcionarioDataNascimento,
          atendimentoId: params.atendimentoId,
          ticketId: params.ticketId ? String(params.ticketId) : undefined,
          exame: params.exame,
        },
      });

      emitEvent(socketRef.current, EventType.BIOMETRIA_CAPTURA_REQUEST, {
        requestId,
        unidade: params.unidade,
        sala: params.sala,
        funcionario: {
          id: params.funcionarioId,
          nome: params.funcionarioNome,
          cpf: params.funcionarioCpf,
          dataNascimento: params.funcionarioDataNascimento,
        },
        atendimento: {
          id: params.atendimentoId,
          ticketId: params.ticketId ? String(params.ticketId) : undefined,
          exame: params.exame,
        },
        origem: "ATENDIMENTO",
        solicitadoEm: new Date().toISOString(),
      });
    },
    [biometriaModal.context, biometriaModal.requestId, user?.nome],
  );

  const iniciarAutenticacaoAtendimento = useCallback(
    (atendimento: Scheduling, metodo: "BIOMETRIA" | "FACIAL") => {
      const authBase = atendimento.AUTENTICACAOATENDIMENTO;
      const funcionarioId = String(atendimento.CODIGO || atendimento.CODIGOPRONTUARIO || atendimento._id || "");
      const funcionarioNome = atendimento.NOME || "";
      const funcionarioCpf = atendimento.CPFFUNCIONARIO || "";
      const funcionarioDataNascimento = atendimento.DATANASCIMENTO || undefined;
      const atendimentoId = String(atendimento._id || "");
      const ticketId = atendimento.TICKET?.id ? String(atendimento.TICKET.id) : undefined;
      const exame = atendimento.TIPOEXAMENOME || exameSelecionado;
      const unidade = unidadeSelecionada || atendimento.UNIDADEATENDIMENTO || "";
      const sala = salaSelecionada || atendimento.TICKET?.sala || "";
      const estacaoId = socketRef.current?.id || authBase?.requestId || `atendimento:${atendimentoId}`;

      if (metodo === "BIOMETRIA") {
        iniciarBiometria({
          funcionarioId,
          funcionarioNome,
          funcionarioCpf,
          funcionarioDataNascimento,
          atendimentoId,
          ticketId,
          exame,
          unidade,
          sala,
          estacaoId,
        });
        return;
      }

      setFacialContext({
        funcionarioNome,
        funcionarioId,
        funcionarioCpf,
        schedulingId: atendimentoId,
        user: {
          codigo: String(user?.codigo || ""),
          nome: user?.nome || "",
        },
      });
      setFacialModalOpen(true);
    },
    [exameSelecionado, iniciarBiometria, salaSelecionada, unidadeSelecionada, user?.codigo, user?.nome],
  );


  const handleViewRelatorio = useCallback((atendimento: Scheduling) => {
    setRelatorioModal({ open: true, atendimento });
  }, []);

  useEffect(() => {
    if (
      biometriaModal.isOpen &&
      (biometriaModal.status === "routing" || biometriaModal.status === "started")
    ) {
      if (biometriaTimeoutRef.current) clearTimeout(biometriaTimeoutRef.current);

      biometriaTimeoutRef.current = setTimeout(() => {
        setBiometriaModal((prev) => {
          if (
            prev.isOpen &&
            (prev.status === "routing" || prev.status === "started")
          ) {
            return {
              ...prev,
              status: "timeout",
              mensagem:
                "O Agente Biométrico não respondeu. Verifique se a aplicação está aberta e o leitor está conectado.",
            };
          }
          return prev;
        });
      }, 15000);
    } else if (biometriaTimeoutRef.current) {
      clearTimeout(biometriaTimeoutRef.current);
      biometriaTimeoutRef.current = null;
    }

    return () => {
      if (biometriaTimeoutRef.current) clearTimeout(biometriaTimeoutRef.current);
    };
  }, [biometriaModal.isOpen, biometriaModal.status]);

  const loadInitialTickets = async () => {
    try {
      if (!unidadeSelecionada) return;
      const response = await fetch(`${NEST_TICKET_QUERY}${encodeURIComponent(unidadeSelecionada)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.tickets)) setAll(data.tickets);
      if (Array.isArray(data.preparationRequests)) setEmPreparacao(data.preparationRequests);
    } catch {}
  };

  const loadSocCompanies = useCallback(async () => {
    try {
      const response = await fetch(NEST_SOC_COMPANIES);
      if (!response.ok) return await IndexDb.getCompanies();
      const data = await response.json();
      if (Array.isArray(data)) await IndexDb.saveCompanies(data);
      return [];
    } catch {
      return await IndexDb.getCompanies();
    }
  }, []);

  const clearPendingAction = useCallback((ticketId?: number | null) => {
    if (!ticketId || Number.isNaN(Number(ticketId))) return;
    const numericTicketId = Number(ticketId);
    const timer = pendingTimeoutsRef.current[numericTicketId];
    if (timer) {
      clearTimeout(timer);
      delete pendingTimeoutsRef.current[numericTicketId];
    }
    setPendingActions((prev) => {
      if (!(numericTicketId in prev)) return prev;
      const updated = { ...prev };
      delete updated[numericTicketId];
      return updated;
    });
  }, []);

  const resyncAttendimentos = useCallback(
    async (reason: string, targetTicketId?: number) => {
      if (!unidadeSelecionada) return;
      try {
        const response = await fetch(NEST_SCHEDULINGS_TODAY, { cache: "no-store" });
        if (!response.ok) throw new Error(`Falha ao recarregar atendimentos (${response.status})`);
        const schedules: Scheduling[] = await response.json();
        const filtered = filterSchedulesByUnit(schedules, unidadeSelecionada);
        setAgendamentosGeral(filtered);
        if (targetTicketId) clearPendingAction(targetTicketId);
      } catch {
        if (targetTicketId) clearPendingAction(targetTicketId);
      }
    },
    [clearPendingAction, unidadeSelecionada],
  );

  const handleFacialClose = useCallback(
    (success?: boolean) => {
      setFacialModalOpen(false);
      setFacialContext(null);
      if (success) {
        addToast({
          title: "Autenticação facial concluída",
          description: "O atendimento foi atualizado com sucesso.",
          severity: "success",
          color: "foreground",
          variant: "flat",
        });
        void resyncAttendimentos("facial_success");
      }
    },
    [resyncAttendimentos],
  );

  const fecharBiometriaModal = useCallback(() => {
    setBiometriaModal((prev) => {
      const shouldCancel =
        prev.requestId &&
        socketRef.current &&
        prev.status !== "success" &&
        prev.status !== "error" &&
        prev.status !== "timeout";

      if (shouldCancel && socketRef.current && prev.requestId) {
        emitEvent(socketRef.current, EventType.BIOMETRIA_CAPTURA_CANCEL, {
          requestId: prev.requestId,
          unidade: prev.context?.unidade ?? "",
        });
      }

      if (prev.status === "success") {
        void resyncAttendimentos("biometria_success");
      }

      return { ...prev, isOpen: false };
    });
  }, [resyncAttendimentos]);

  const startPendingAction = useCallback(
    (ticketId: number, action: string) => {
      clearPendingAction(ticketId);
      setPendingActions((prev) => ({
        ...prev,
        [ticketId]: { action, startedAt: Date.now(), phase: "pending" },
      }));
      pendingTimeoutsRef.current[ticketId] = setTimeout(() => {
        setPendingActions((prev) => {
          const current = prev[ticketId];
          if (!current) return prev;
          return { ...prev, [ticketId]: { ...current, phase: "resync" } };
        });
        addToast({ title: "Verificando atualização", description: "A ação demorou para refletir na tela. Vamos recarregar o atendimento.", severity: "warning", color: "foreground", variant: "flat" });
        void resyncAttendimentos("timeout", ticketId);
      }, 4000);
    },
    [clearPendingAction, resyncAttendimentos],
  );

  const acknowledgePendingAction = useCallback(
    (payload: TicketActionSuccessPayload) => {
      const ticketId = Number(payload.ticketId);
      const timer = pendingTimeoutsRef.current[ticketId];
      if (timer) {
        clearTimeout(timer);
        delete pendingTimeoutsRef.current[ticketId];
      }
      setPendingActions((prev) => {
        if (!(ticketId in prev)) return prev;
        return { ...prev, [ticketId]: { ...prev[ticketId], phase: "acknowledged" } };
      });
      pendingTimeoutsRef.current[ticketId] = setTimeout(() => {
        setPendingActions((prev) => {
          const current = prev[ticketId];
          if (!current || current.phase !== "acknowledged") return prev;
          return { ...prev, [ticketId]: { ...current, phase: "resync" } };
        });
        void resyncAttendimentos("acknowledged_without_update", ticketId);
      }, 2500);
    },
    [resyncAttendimentos],
  );


  const findSchedulingIndex = useCallback((list: Scheduling[], schedule: Scheduling) =>
    list.findIndex((item) => {
      if (item._id && schedule._id && item._id === schedule._id) return true;
      if (item.CODIGOPRONTUARIO && schedule.CODIGOPRONTUARIO && item.CODIGOPRONTUARIO === schedule.CODIGOPRONTUARIO) return true;
      // Busca por Empresa + Funcionário (CPF ou Código) para evitar duplicidade de cards
      const sameCompany = item.CODIGOEMPRESA && schedule.CODIGOEMPRESA && item.CODIGOEMPRESA === schedule.CODIGOEMPRESA;
      if (sameCompany) {
        if (item.CPFFUNCIONARIO && schedule.CPFFUNCIONARIO && item.CPFFUNCIONARIO === schedule.CPFFUNCIONARIO) return true;
        if (item.CODIGO && schedule.CODIGO && item.CODIGO === schedule.CODIGO) return true;
      }
      return false;
    }),
  []);

  const matchesSelectedExam = useCallback(
    (exame: Scheduling["EXAMES"][number]) => {
      if (!exameSelecionado) return false;
      if (codigosDeAtendimento.size > 0) {
        return codigosDeAtendimento.has(exame.codigoExame);
      }

      const selected = normalizeExamLabel(exameSelecionado);
      return (
        normalizeExamLabel(exame.grupo) === selected ||
        normalizeExamLabel(exame.nomeExame) === selected
      );
    },
    [codigosDeAtendimento, exameSelecionado],
  );

  useEffect(() => {
    if (!exameSelecionado || !examesData || Object.keys(examesData).length === 0) {
      setCodigosDeAtendimento(new Set());
      return;
    }
    const group = examesData[exameSelecionado];
    if (!group) {
      setCodigosDeAtendimento(new Set());
      return;
    }
    const codigos = group.flatMap((ex) => ex.codigos);
    setCodigosDeAtendimento(new Set(codigos));
  }, [exameSelecionado, examesData]);

  useEffect(() => {
    if (!codigosDeAtendimento || codigosDeAtendimento.size === 0 || !agendamentosGeral || agendamentosGeral.length === 0) {
      if (!exameSelecionado || !agendamentosGeral || agendamentosGeral.length === 0) {
        setAgendamentos([]);
        return;
      }
    }
    const emAtendimento = agendamentosGeral.filter((a) => a.ATENDIMENTOSTATUS === AtendimentoStatus.EM_ATENDIMENTO);
    const meusAtendimentos = emAtendimento.filter((atend) =>
      atend.TICKET?.emissao != null &&
      Array.isArray(atend.EXAMES) &&
      atend.EXAMES.some(
        (exame) =>
          matchesSelectedExam(exame) && exame.status === ExamStatus.PENDENTE,
      )
    );
    setAgendamentos(meusAtendimentos);
  }, [agendamentosGeral, codigosDeAtendimento, exameSelecionado, matchesSelectedExam]);

  const handleConectar = () => {
    if (connected) {
      if (teleatendimentoPanelRef.current) {
        teleatendimentoPanelRef.current.endSession();
      }
      disconnect();
      socketRef.current = null;
      loadFlowRef.current.reset();
      setConectado(false);
      setAguardandoPrimeirosAtendimentos(false);
      setIsLoading(false);
      clear();
      setAgendamentos([]);
      setAgendamentosGeral([]);
      addToast({ title: "Desconectado", description: "Você se desconectou do servidor.", severity: "warning", color: "foreground", variant: "flat" });
      return;
    }
    if (!unidadeSelecionada || !salaSelecionada || !exameSelecionado) {
      setModalText(<p>Selecione uma <strong>UNIDADE</strong>, <strong>SALA</strong> e <strong>EXAME</strong> antes de conectar.</p>);
      setModalAlert(true);
      return;
    }
    let requiresPscAuth = false;
    if (assinaDigitalmente) {
      if (settings?.assinaturaProvider === "BRYKMS") {
        const isBryKmsConfigured = settings?.uuidCert && settings?.uuidCert.trim() !== "";
        requiresPscAuth = !isBryKmsConfigured;
      } else {
        requiresPscAuth = !pscAuthStatus.isActive;
      }
    }
    if (requiresPscAuth && settings?.assinaturaProvider !== "BRYKMS") {
      loadFlowRef.current.startConnection();
      setIsLoading(true);
      setAguardandoPrimeirosAtendimentos(true);
      setLoadingPhase("conectando");
      setConectado(true);
      connect({
        nome: user?.nome!,
        sala: salaSelecionada,
        type: WebsocketType.USER_ATENDIMENTO,
        unidade: unidadeSelecionada,
      });
      setModalPscAvisoOpen(true);
      return;
    }
    if (requiresPscAuth && settings?.assinaturaProvider === "BRYKMS") {
      setModalText(<p>Para usar o provedor <strong>BRy Cloud</strong>, configure o <strong>ID Cert (UUID)</strong> e <strong>PIN</strong> nas configurações de assinatura digital.</p>);
      setModalAlert(true);
      return;
    }
    loadFlowRef.current.startConnection();
    setIsLoading(true);
    setAguardandoPrimeirosAtendimentos(true);
    setLoadingPhase("conectando");
    setConectado(true);
    connect({
      nome: user?.nome!,
      sala: salaSelecionada,
      type: WebsocketType.USER_ATENDIMENTO,
      unidade: unidadeSelecionada,
    });
  };



  const handleTicketError = (payload: { error?: string; message?: string }) => {
    addToast({
      title: "Erro no Ticket",
      description: payload.message || payload.error || "Ocorreu um erro.",
      variant: "flat",
      color: "danger",
    });
  };

  // Manter socketRef atualizado para callbacks
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Registro de handlers de eventos do socket
  useEffect(() => {
    const handleConnectionRequest = (schedules?: Scheduling[]) => {
      const loadingState = loadFlowRef.current.markConnectionRequestReceived();
      setIsLoading(loadingState.isLoading);
      setAguardandoPrimeirosAtendimentos(
        loadingState.aguardandoPrimeirosAtendimentos,
      );
      if (!loadingState.initialTicketsLoaded) {
        setLoadingPhase("carregando-tickets");
      }

      if (schedules && Array.isArray(schedules)) {
        schedules.forEach((s) => clearPendingAction(s.TICKET?.id));
        setAgendamentosGeral((prev) => {
          return mergeSchedulesById(prev, schedules);
        });
      }
    };

    const handleUpdateSchedule = ({ operation, schedule }: SchedulingChange) => {
      clearPendingAction(schedule.TICKET?.id);
      if (operation === MongoOperationTypes.DELETE) {
        setAgendamentosGeral((prev) => prev.filter((ag) => ag._id !== schedule._id && ag.CODIGOPRONTUARIO !== schedule.CODIGOPRONTUARIO));
      } else {
        if (schedule.ATENDIMENTOSTATUS === AtendimentoStatus.EM_ATENDIMENTO) {
          sendLocalNotification("🩺 Novo Paciente na Sala", {
            body: `O paciente ${schedule.NOME} acabou de entrar em atendimento e aguarda por você.`,
          });
        }
        setAgendamentosGeral((prev) => {
          const idx = findSchedulingIndex(prev, schedule);
          if (idx !== -1) {
            const updated = [...prev];
            const existing = updated[idx];
            // Mescla exames preservando os já existentes para evitar sobrescrever
            const existingExames = Array.isArray(existing.EXAMES) ? existing.EXAMES : [];
            const incomingExames = Array.isArray(schedule.EXAMES) ? schedule.EXAMES : [];
            const mergedExamesMap = new Map();
            existingExames.forEach((e) => mergedExamesMap.set(e.codigoExame || e.grupo || e.nomeExame, e));
            incomingExames.forEach((e) => mergedExamesMap.set(e.codigoExame || e.grupo || e.nomeExame, e));
            
            updated[idx] = {
              ...existing,
              ...schedule,
              TICKET: schedule.TICKET || existing.TICKET,
              EXAMES: Array.from(mergedExamesMap.values()),
            };
            return updated;
          }
          return [...prev, schedule];
        });
      }
    };

    const unregister = registerHandlers({
      [EventType.CONNECTION_REQUEST]: handleConnectionRequest,
      [EventType.TICKET_EMITED]: (ticket: Ticket) => addOrUpdate(ticket),
      [EventType.TICKET_UPDATED]: (ticket: Ticket) => addOrUpdate(ticket),
      [EventType.TICKET_DELETE]: (id: number) => remove(id),
      [EventType.TICKET_ACTION_SUCCESS]: acknowledgePendingAction,
      [EventType.UPDATE_SCHEDULE]: handleUpdateSchedule,
      [EventType.TICKET_ERROR]: handleTicketError,
      [EventType.BIOMETRIA_CAPTURA_STATUS]: (payload: BiometriaCapturaStatusPayload) => {
        setBiometriaModal((prev) => {
          if (!prev.isOpen || prev.requestId !== payload.requestId) return prev;
          return {
            ...prev,
            status: payload.status as BiometriaModalState["status"],
            mensagem: payload.mensagem,
          };
        });
      },
      [EventType.BIOMETRIA_CAPTURA_RESULT]: (payload: BiometriaCapturaResultPayload) => {
        setBiometriaModal((prev) => {
          if (!prev.isOpen || prev.requestId !== payload.requestId) return prev;
          return {
            ...prev,
            status: payload.success ? "success" : "error",
            mensagem: payload.message,
          };
        });
      },
      [EventType.BIOMETRIA_AGENT_UNAVAILABLE]: (payload: BiometriaAgentUnavailablePayload) => {
        setBiometriaModal((prev) => {
          if (!prev.isOpen) return prev;
          return {
            ...prev,
            status: "error",
            mensagem: payload.mensagem,
          };
        });
      },
      [EventType.BIOMETRIA_REQUEST_STATE]: (payload: BiometriaRequestStatePayload) => {
        setBiometriaModal((prev) => {
          if (!prev.isOpen || prev.requestId !== payload.requestId) return prev;
          return {
            ...prev,
            status: payload.state as BiometriaModalState["status"],
            mensagem: payload.message,
          };
        });
      },
      [EventType.TELEATENDIMENTO_PULL_TO_CALL]: (payload: { sessionId: string }) => {
         setIsTelemedicinaModo(true);
         setTeleatendimentoSessionId(payload.sessionId);
      },
    } as any);

    return () => unregister();
  }, [socket]); // ← apenas socket: wrappers estáveis do useSocket garantem valores sempre atualizados via ref

  // Carregar dados iniciais e re-carregar após reconexão
  useEffect(() => {
    if (!connected || !socket || !unidadeSelecionada) return;

    emitEvent(socket, EventType.TICKET_INFO, unidadeSelecionada);
    setLoadingPhase("carregando-tickets");

    loadInitialTickets()
      .catch(() => {})
      .finally(() => {
        const loadingState = loadFlowRef.current.markInitialTicketsLoaded();
        setIsLoading(loadingState.isLoading);
        setAguardandoPrimeirosAtendimentos(
          loadingState.aguardandoPrimeirosAtendimentos,
        );
        if (!loadingState.connectionRequestReceived) {
          setLoadingPhase("recebendo-atendimentos");
        }
      });

    void loadSocCompanies();
  }, [connected, unidadeSelecionada]);

  const handleHandleModal = useCallback((atendimento: Scheduling, modalType: "exams" | "ticket") => {
    setFuncionarioSelecionado(atendimento);
    if (modalType === "exams") {
      setModalAtendimentoAberto(true);
    }
  }, []);

  const calcularEstatisticas = useCallback(() => {
    if (codigosDeAtendimento.size === 0) {
      setEstatisticas({ pendentes: 0, finalizados: 0, aguardandoRecepcao: getAll().filter((s) => s.status === TicketStatus.AGUARDANDO && s.grupo === TicketGroups.RECEPCAO).length, total: 0, aguardando: 0, preparacao: 0, raiox: 0, recepcaoAguardando: 0, examesAguardando: 0, emAtendimento: 0 });
      return;
    }
    let countPendentes = 0;
    let countFinalizados = 0;
    for (const agendamento of agendamentosGeral) {
      if (!Array.isArray(agendamento.EXAMES)) continue;
      const isEmAtendimento =
        agendamento.ATENDIMENTOSTATUS === AtendimentoStatus.EM_ATENDIMENTO &&
        agendamento.TICKET?.emissao != null;
      for (const exame of agendamento.EXAMES) {
        if (!matchesSelectedExam(exame)) continue;
        if (exame.status === ExamStatus.FINALIZADO) countFinalizados++;
        if (exame.status === ExamStatus.PENDENTE && isEmAtendimento) countPendentes++;
      }
    }
    const countTotal = countPendentes + countFinalizados;
    setEstatisticas({
      pendentes: countPendentes,
      finalizados: countFinalizados,
      aguardandoRecepcao: getAll().filter(
        (s) =>
          s.status === TicketStatus.AGUARDANDO &&
          s.grupo === TicketGroups.RECEPCAO,
      ).length,
      total: countTotal,
      aguardando: 0,
      preparacao: 0,
      raiox: 0,
      recepcaoAguardando: 0,
      examesAguardando: 0,
      emAtendimento: 0,
    });
  }, [getAll, unidadeSelecionada, codigosDeAtendimento, agendamentosGeral, matchesSelectedExam]);

  useEffect(() => { calcularEstatisticas(); }, [agendamentosGeral, codigosDeAtendimento, tickets, calcularEstatisticas, exameSelecionado, unidadeSelecionada]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <HeaderApp onLogout={() => { logout(); router.push('/'); }}>
        {conectado && socketRef.current && (
          <SenhasEstatisticas
            context="atendimento"
            estatisticasSenhas={estatisticas}
            onSetStatsModalOpen={setIsStatsModalOpen}
          />
        )}
      </HeaderApp>

      <PscProviderSelector
        isOpen={isProviderSelectorOpen}
        onClose={() => setIsProviderSelectorOpen(false)}
        onSelect={(provider) => {
          setIsProviderSelectorOpen(false);
          handlePscAuth(provider);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarRecepcao
            agendadosFiltrados={agendamentosGeral}
            conectado={conectado}
            exameSelecionado={exameSelecionado}
            handleConectar={handleConectar}
            onHandleExameSelecionado={setExameSelecionado}
            onHandleModal={() => {}}
            onLoading={isLoading}
            salaSelecionada={salaSelecionada}
            setSalaSelecionada={setSalaSelecionada}
            setTicketSelecionado={() => {}}
            unidadeSelecionada={unidadeSelecionada}
            setUnidadeSelecionada={setUnidadeSelecionadaDebounced}
            statusSelecionado={statusSelecionado}
            setStatusSelecionado={setStatusSelecionado}
            isReconnecting={isReconnecting}
            pscStatusElement={
              assinaDigitalmente ? (
                <PscProviderStatus
                  isLoading={isPscLoading}
                  pscAuthStatus={pscAuthStatus}
                  settings={settings}
                  onClick={handlePscClick}
                />
              ) : null
            }
            pscAuthButtonElement={
              assinaDigitalmente &&
              settings?.assinaturaProvider !== "BRYKMS" &&
              pscAuthStatus.status !== "ACTIVE" ? (
                <Button
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-all"
                  onPress={handlePscClick}
                >
                  {pscAuthStatus.status === "EXPIRED"
                    ? "Renovar autenticação"
                    : "Autenticar assinatura"}
                </Button>
              ) : null
            }
            examesGrouped={examesData}
            isTelemedicinaModo={isTelemedicinaModo}
            toggleTelemedicinaModo={() => setIsTelemedicinaModo((prev) => !prev)}
          />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-8">
          {isLoading ? (
            <CmsoCircularLoading />
          ) : conectado && socket ? (
            <AtendimentoContent
              agendamentos={agendamentos}
              codigosDeAtendimento={codigosDeAtendimento}
              aguardandoPrimeirosAtendimentos={aguardandoPrimeirosAtendimentos}
              conectado={conectado}
              exameSelecionado={exameSelecionado}
               onIniciarAutenticacao={iniciarAutenticacaoAtendimento}
              onViewRelatorio={handleViewRelatorio}
              onHandleModal={handleHandleModal}
              pendingActions={pendingActions}
              salaSelecionada={salaSelecionada}
              setFuncionarioSelecionado={setFuncionarioSelecionado}
              socket={socket!}
              startPendingAction={startPendingAction}
              unidadeSelecionada={unidadeSelecionada}
              examesGrouped={examesData}
            />
          ) : (
            <EmptyState
              description="Conecte-se para visualizar os atendimentos"
              title="Desconectado"
            />
          )}
        </main>
      </div>

      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        estatisticasSenhas={estatisticas}
        tickets={getAll()}
        agendamentos={agendamentosGeral}
        preparationRequests={empreparacao}
      />
      <AtendimentoModalExames
        isOpen={modalAtendimentoAberto}
        funcionarioSelecionado={funcionarioSelecionado}
        onClose={() => setModalAtendimentoAberto(false)}
        exame={exameSelecionado}
        sala={salaSelecionada}
        unidade={unidadeSelecionada}
        codigosAtendimento={codigosDeAtendimento}
        socket={socket!}
        operationalUser={user}
        assinaDigitalmente={assinaDigitalmente}
        pscAuthStatus={pscAuthStatus}
        onPscAuth={handlePscAuth}
      />
      {relatorioModal.atendimento && (
        <Modal
          aria-label="Modal de detalhes do atendimento"
          classNames={{
            base: "max-h-[90vh] border border-[#104e35]/20",
            wrapper: "z-[500]",
            backdrop: "z-[400]",
          }}
          isOpen={relatorioModal.open}
          scrollBehavior="inside"
          size="5xl"
          onClose={() => setRelatorioModal({ open: false, atendimento: null })}
        >
          <ModalContent>
            <LazyModalContent
              atendimento={relatorioModal.atendimento}
              userApp={user}
              onClose={() => setRelatorioModal({ open: false, atendimento: null })}
            />
          </ModalContent>
        </Modal>
      )}
      <BiometriaModal
        onClose={fecharBiometriaModal}
        onRetry={() => {
          if (biometriaModal.context) {
            iniciarBiometria({
              funcionarioId: biometriaModal.context.funcionarioId || "",
              funcionarioNome: biometriaModal.context.funcionarioNome || "",
              funcionarioCpf: biometriaModal.context.funcionarioCpf || "",
              funcionarioDataNascimento: biometriaModal.context.funcionarioDataNascimento || "",
              atendimentoId: biometriaModal.context.atendimentoId || "",
              ticketId: biometriaModal.context.ticketId,
              exame: biometriaModal.context.exame,
              unidade: biometriaModal.context.unidade || "",
              sala: biometriaModal.context.sala || "",
              estacaoId: biometriaModal.context.estacaoId || "",
            });
          }
        }}
        state={biometriaModal}
      />
      <FacialModal
        context={facialContext}
        isOpen={facialModalOpen}
        onClose={handleFacialClose}
      />

      <Modal disableAnimation={true} isDismissable={false} isOpen={modalAlert}>
        <ModalContent className="border border-[#44735e]/20">
          <ModalHeader className="text-[#2a4a3a]"><ExclamationCircleIcon className="h-6 w-6 text-[#44735e]" /> Atenção</ModalHeader>
          <ModalBody>{modalText}</ModalBody>
          <ModalFooter><Button className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white" size="sm" onPress={() => setModalAlert(false)}>Confirmar</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal hideCloseButton disableAnimation={true} isDismissable={false} isOpen={isPscAuthenticating}>
        <ModalContent className="border border-[#44735e]/20">
          <ModalHeader className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white">Autenticação Necessária</ModalHeader>
          <ModalBody className="py-6 flex flex-col items-center justify-center text-center">
            <Spinner className="mb-4" color="primary" size="lg" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Aguardando provedor...</h3>
            <p className="text-gray-600 mb-4 text-sm">Conclua a autenticação na janela que foi aberta.</p>
            {pscAuthWindowUrl && (
              <div className="bg-[#e8f4e3] border border-[#b8d864] p-3 rounded-lg w-full mb-4">
                <a className="text-[#44735e] hover:underline text-xs break-all" href={pscAuthWindowUrl} rel="noopener noreferrer" target="_blank">Clique aqui se a janela não abrir</a>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex justify-center border-t border-gray-100">
            <Button color="danger" variant="light" onPress={() => { if (pscPollingRef.current) clearInterval(pscPollingRef.current); setIsPscAuthenticating(false); if (pscWindowRef.current && !pscWindowRef.current.closed) pscWindowRef.current.close(); }}>Cancelar Autenticação</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal disableAnimation={true} isDismissable={false} isOpen={modalPscAvisoOpen} onClose={() => setModalPscAvisoOpen(false)}>
        <ModalContent className="border border-[#44735e]/20">
          <ModalHeader className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white"><div className="flex items-center gap-2"><UserLock className="h-8 w-8" /><span className="text-lg font-semibold">Autenticação Necessária</span></div></ModalHeader>
          <ModalBody className="py-6 px-6">
            <p className="font-semibold text-lg text-gray-800">Você possui assinatura digital habilitada.</p>
            <p className="text-gray-600 mt-2">Sua sessão de assinatura não está ativa. Deseja autenticar agora para assinar os exames automaticamente?</p>
          </ModalBody>
          <ModalFooter className="px-6 pb-4">
            <Button className="font-medium" color="default" variant="flat" onPress={() => { 
              setModalPscAvisoOpen(false); 
              // "Continuar sem autenticar": just stay connected, since we already connected
            }}>Continuar sem autenticar</Button>
            <Button className="font-medium bg-[#44735e] text-white" onPress={() => { 
              setModalPscAvisoOpen(false); 
              setIsWaitingForAuthToConnect(true); 
              const defaultPscProvider = settings?.pscPadrao ?? settings?.provedorPadrao;
              if (defaultPscProvider) {
                handlePscAuth(defaultPscProvider);
              } else {
                setIsProviderSelectorOpen(true);
              }
            }}>Autenticar agora</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {(isTelemedicinaModo || teleatendimentoSessionId) && (
        <div className="fixed bottom-28 right-6 w-[320px] max-h-[75vh] shadow-2xl z-[600] rounded-xl overflow-hidden border border-gray-200 bg-white flex flex-col">
          <div className="bg-[#114e34] text-white text-sm font-semibold p-3 flex justify-between items-center cursor-move shadow-md relative z-10">
            <span>Videochamada em Andamento</span>
            <Button isIconOnly variant="light" size="sm" className="text-white hover:bg-white/20" onPress={() => { setIsTelemedicinaModo(false); setTeleatendimentoSessionId(null); }}>
              X
            </Button>
          </div>
          <div className="flex-1 overflow-auto bg-gray-50">
             <TeleatendimentoPanel
                ref={teleatendimentoPanelRef}
                sessionId={teleatendimentoSessionId || undefined}
                layout="pip"
                role="PROFESSIONAL"
                unidade={unidadeSelecionada}
                sala={salaSelecionada}
                exame={exameSelecionado}
                onEndSession={() => {
                  setTeleatendimentoSessionId(null);
                }}
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default AtendimentoPage;
