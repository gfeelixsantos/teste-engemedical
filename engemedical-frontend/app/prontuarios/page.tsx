// page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { MessageCircleWarning, ChevronDown, ChevronUp } from "lucide-react";

// Enums e interfaces
import {
  addToast,
  Button,
  Card,
  CardBody,
  Badge,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Search } from "lucide-react";

import PdfViewer from "./components/PdfView";

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
import PainelDireita from "./components/PainelDireita";

import {
  AtendimentoStatus,
  MongoOperationTypes,
} from "@/lib/scheduling/enum/scheduling.enum";
import { CustomEventMap, EventType } from "@/lib/websocket/events/events";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import { IUserInfo, IUserWebsocket } from "@/lib/user/interfaces/IUser";
import {
  ExamRegister,
  FileUpload,
  Scheduling,
  SchedulingChange,
} from "@/lib/scheduling/interface/scheduling";

// Componentes
import { HeaderApp } from "@/components/shared/HeaderApp";
import { PscProviderStatus } from "@/app/atendimento/components/PscProviderStatus";

// Utils e config
import { getCurrentUser, getStatusColor, logout } from "@/lib/utils";
import {
  NEST_PRONTUARIO_PARAMETROS,
  NEST_PRONTUARIO_REGISTROS,
  NEST_URL,
} from "@/config/constants";

// Hooks
import { usePscAuthStatus } from "@/hooks/usePscAuthStatus";

// UI Components

/* ---------------------- Tipos ---------------------- */

type PdfUrl = {
  url: string;
  title: string;
  type: "exame" | "anexo";
  examName?: string;
  grupo?: string;
};

export type MedicalRecord = Scheduling & {
  currentStatus: AtendimentoStatus;
  pdfUrls: PdfUrl[];
};

type ParametrosResponse = {
  medicos: { name: string }[];
  empresas: { name: string }[];
  status: { name: string }[];
};

interface Pagination<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ---------------------- Utils ---------------------- */

const mapSchedulingToMedicalRecord = (
  s: Scheduling,
  status: string,
): MedicalRecord => {
  const exameUrls: PdfUrl[] =
    (s.EXAMES || [])
      .filter((e: ExamRegister) => e && e.url && e.url.trim() !== "")
      .map((e) => ({
        url: e.url!,
        title: `${e.grupo}`,
        type: "exame" as const,
        examName: e.nomeExame,
        grupo: e.grupo,
      })) || [];

  const anexoUrls: PdfUrl[] =
    (s.ANEXOS || [])
      .filter(
        (a: FileUpload) => a && a.StoragePath && a.StoragePath.trim() !== "",
      )
      .map((a: any) => ({
        url: a.StoragePath,
        title: a.Name || "Anexo",
        type: "anexo" as const,
      })) || [];

  const allPdfUrls = [...exameUrls, ...anexoUrls];

  if (allPdfUrls.length === 0) {
    allPdfUrls.push({
      url: "",
      title: "Sem PDF Disponível",
      type: "exame",
    });
  }

  const id =
    typeof s._id === "string"
      ? s._id
      : ((s._id as any).$oid ?? JSON.stringify(s._id));

  return {
    ...s,
    _id: id,
    currentStatus: status as AtendimentoStatus,
    pdfUrls: allPdfUrls,
  } as MedicalRecord;
};



/* ---------------------- Página Principal ---------------------- */

export default function UnifiedProntuarioPage() {
  const router = useRouter();
  const [atendimentos, setAtendimentos] = useState<Scheduling[]>([]);
  const [user, setUser] = useState<IUserInfo | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null,
  );
  const [search, setSearch] = useState<string>("");
  const [attendanceStatus, setAttendanceStatus] =
    useState<AtendimentoStatus | null>(null);

  // Novos estados para empresas e médicos
  const [empresa, setEmpresa] = useState<string>("");
  const [medicoExaminador, setMedicoExaminador] = useState<string>("");
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [medicos, setMedicos] = useState<string[]>([]);

  // Estados para uso de debounced
  const ITEMS_PER_PAGE = 50;
  const RETRY_DELAY_MS = 10000; // 10 segundos
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationData, setPaginationData] = useState({
    total: 0,
    totalPages: 1,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);

  // Estados para WebSocket
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const [conectado, setConectado] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  const [isLoadingEmpresasMedicos, setIsLoadingEmpresasMedicos] =
    useState(false);

  // Estados para controle de mudanças não salvas
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
  const [nextSelectedRecordIfDiscard, setNextSelectedRecordIfDiscard] =
    useState<MedicalRecord | null>(null);

  // Estados para PDF
  const [currentPdfIndex, setCurrentPdfIndex] = useState<number>(0);

  // Estado para controle de scroll e carregamento de mais itens
  const [scrollContainerRef, setScrollContainerRef] =
    useState<HTMLDivElement | null>(null);

  // Estados para autenticação PSC
  const {
    settings: pscSettings,
    pscAuthStatus,
    isLoading: isPscLoading,
  } = usePscAuthStatus();
  const assinaDigitalmente = pscSettings?.assinaDigitalmente ?? false;

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push("/");
    } else {
      setUser(currentUser);
    }
  }, [router]);

  const carregarEmpresasEMedicos = async () => {
    setIsLoadingEmpresasMedicos(true);
    try {
      const response = await fetch(NEST_PRONTUARIO_PARAMETROS);

      if (!response.ok) alert("Erro ao buscar parâmetros");

      const parametrosData: ParametrosResponse = await response.json();

      setEmpresas(parametrosData.empresas.map((e) => e.name));
      setMedicos(parametrosData.medicos.map((m) => m.name));
    } catch (error) {
      console.error("Erro ao carregar empresas e médicos:", error);
      addToast({
        title: "Erro ao carregar dados",
        description:
          "Não foi possível carregar empresas e médicos examinadores",
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    } finally {
      setIsLoadingEmpresasMedicos(false);
    }
  };

  // Função para carregar empresas e médicos examinadores
  useEffect(() => {
    carregarEmpresasEMedicos();
  }, []);

  // Função para buscar dados com filtros
  const buscarDadosComFiltros = useCallback(
    async (
      status: AtendimentoStatus,
      page: number,
      limit: number,
      empresasFiltro?: string,
      medicosFiltro?: string,
      loadMore: boolean = false,
    ) => {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingInitialData(true);
        setRecords([]);
        setSelectedRecord(null);
      }

      try {
        let url = NEST_PRONTUARIO_REGISTROS;
        const params = new URLSearchParams();

        params.append("status", status);
        params.append("page", page.toString());
        params.append("limit", limit.toString());

        if (empresasFiltro) params.append("empresa", empresasFiltro);
        if (medicosFiltro) params.append("medico", medicosFiltro);

        url = `${url}?${params.toString()}`;
        const response = await fetch(url, {
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Erro na resposta");

        const paginationData: Pagination<Scheduling> = await response.json();

        const schedules = paginationData.data;

        // LÓGICA DE NOVA TENTATIVA (RETRY)
        if (paginationData.total === 0) {
          console.warn(
            `Resultado vazio encontrado. Agendando nova tentativa em ${RETRY_DELAY_MS / 1000} segundos.`,
          );
          setTimeout(() => {
            setRetryTrigger((c) => c + 1);
          }, RETRY_DELAY_MS);
        }

        const mapped = schedules.map((s) =>
          mapSchedulingToMedicalRecord(s, status),
        );
        const mappedOrdered = mapped.sort((a, b) =>
          a.NOME.localeCompare(b.NOME, "pt-BR", { sensitivity: "base" }),
        );

        setAtendimentos(schedules);

        if (loadMore) {
          // Adiciona os novos registros aos existentes
          setRecords((prev) => [...prev, ...mappedOrdered]);
        } else {
          // Substitui os registros existentes
          setRecords(mappedOrdered);
        }

        setPaginationData({
          total: paginationData.total,
          totalPages: paginationData.totalPages,
        });

        // Calcula se há mais registros para carregar
        const currentTotalLoaded = loadMore
          ? records.length + mappedOrdered.length
          : mappedOrdered.length;

        setHasMoreRecords(currentTotalLoaded < paginationData.total);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        addToast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os prontuários",
          severity: "danger",
          color: "foreground",
          variant: "flat",
        });

        if (!loadMore) {
          setRecords([]);
          setPaginationData({ total: 0, totalPages: 1 });
        }
      } finally {
        setIsLoadingInitialData(false);
        setIsLoadingMore(false);
      }
    },
    [mapSchedulingToMedicalRecord],
  );

  // EFEITO 1: FILTROS + DEBOUNCE + RETRY
  useEffect(() => {
    const currentEmpresaFiltro = empresa;
    const currentMedicoFiltro = medicoExaminador;

    if (!attendanceStatus) return;

    const delay = retryTrigger > 0 ? 0 : 300;

    const timeoutId = setTimeout(() => {
      if (retryTrigger === 0) {
        setCurrentPage(1);
      }

      buscarDadosComFiltros(
        attendanceStatus,
        currentPage,
        ITEMS_PER_PAGE,
        currentEmpresaFiltro,
        currentMedicoFiltro,
        false,
      );

      if (retryTrigger > 0) {
        setRetryTrigger(0);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [
    attendanceStatus,
    empresa,
    medicoExaminador,
    buscarDadosComFiltros,
    retryTrigger,
  ]);

  // EFEITO 2: MUDANÇA DE PÁGINA
  useEffect(() => {
    if (currentPage === 1 && retryTrigger === 0) {
      return;
    }
    if (!attendanceStatus) return;

    buscarDadosComFiltros(
      attendanceStatus,
      currentPage,
      ITEMS_PER_PAGE,
      empresa,
      medicoExaminador,
      currentPage > 1, // loadMore = true se for página > 1
    );
  }, [currentPage]);

  // Função para carregar mais registros
  const carregarMaisRegistros = () => {
    if (hasMoreRecords && !isLoadingMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Configura o observer para scroll infinito
  useEffect(() => {
    if (!scrollContainerRef || !hasMoreRecords || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          carregarMaisRegistros();
        }
      },
      {
        root: scrollContainerRef,
        rootMargin: "100px", // Carrega 100px antes de chegar no final
        threshold: 0.1,
      },
    );

    // Observa o último elemento da lista
    const lastCard = scrollContainerRef.querySelector(
      ".prontuario-card:last-child",
    );

    if (lastCard) {
      observer.observe(lastCard);
    }

    return () => {
      if (lastCard) {
        observer.unobserve(lastCard);
      }
    };
  }, [scrollContainerRef, hasMoreRecords, isLoadingMore, records]);

  // Registro handles de eventos WebSocket
  useEffect(() => {
    if (!socketState) return;

    const handleUpdateRecord = ({ operation, schedule }: SchedulingChange) => {
      console.log(`🔄 UPDATE_RECORD: ${operation}`, schedule.NOME);

      setRecords((prev) => {
        let updatedRecords = [...prev];

        const scheduleId = String((schedule as any)._id ?? "");
        const index = updatedRecords.findIndex(
          (r) => String((r as any)._id ?? "") === scheduleId,
        );

        const isStatusSelecionado =
          schedule.ATENDIMENTOSTATUS === attendanceStatus;

        // DELETE → sempre remove
        if (operation === MongoOperationTypes.DELETE) {
          if (index > -1) {
            updatedRecords.splice(index, 1);
          }

          if (selectedRecord?.CODIGOPRONTUARIO === schedule.CODIGOPRONTUARIO) {
            setSelectedRecord(null);
          }

          return updatedRecords;
        }

        // UPDATE / INSERT → status diferente do selecionado
        if (!isStatusSelecionado) {
          if (index > -1) {
            updatedRecords.splice(index, 1);
          }

          if (selectedRecord?.CODIGOPRONTUARIO === schedule.CODIGOPRONTUARIO) {
            setSelectedRecord(null);
          }

          return updatedRecords;
        }

        // Status é o selecionado → inserir ou atualizar
        const newRecord = mapSchedulingToMedicalRecord(
          schedule,
          schedule.ATENDIMENTOSTATUS,
        );

        if (index > -1) {
          updatedRecords[index] = newRecord;
        } else {
          updatedRecords.push(newRecord);
        }

        if (selectedRecord?._id === newRecord._id) {
          setSelectedRecord(newRecord);
        }

        return updatedRecords.sort((a, b) =>
          a.NOME.localeCompare(b.NOME, "pt-BR", { sensitivity: "base" }),
        );
      });
    };

    // Registra handler
    socketState.on(EventType.UPDATE_RECORD, handleUpdateRecord);

    // Cleanup correto
    return () => {
      socketState.off(EventType.UPDATE_RECORD, handleUpdateRecord);
    };
  }, [socketState, attendanceStatus, selectedRecord]);

  // Efeito para configurar WebSocket
  useEffect(() => {
    if (!getCurrentUser()) return;

    const conectionType = WebsocketType.PRONTUARIO;
    const user: IUserWebsocket = {
      nome: getCurrentUser()?.nome!,
      sala: "prontuario",
      type: conectionType,
      unidade: "",
    };

    const s: Socket<CustomEventMap> = io(NEST_URL, {
      auth: user,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity, // Tenta indefinidamente
      reconnectionDelay: 1000, // 1 segundo
      reconnectionDelayMax: 5000, // Máximo 5 segundos
      timeout: 20000,
      forceNew: false,
      upgrade: false,
      rememberUpgrade: true,
    });

    setSocketState(s);

    s.on("connect", () => {
      console.log("✅ Prontuário conectado:", s.id);
      setConectado(true);

      addToast({
        title: "Conectado",
        description: "Conexão estabelecida com o servidor",
        severity: "success",
        color: "foreground",
        variant: "flat",
      });
    });

    s.on("disconnect", (reason) => {
      console.warn("⚠️ Prontuário desconectado:", reason);
      setConectado(false);

      if (reason !== "io client disconnect") {
        addToast({
          title: "Conexão perdida",
          description: "Tentando reconectar...",
          severity: "warning",
          color: "foreground",
          variant: "flat",
        });
      }
    });

    s.on("connect_error", (err) => {
      console.error("❌ Erro ao conectar:", err);

      addToast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor",
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    });

    // ✅ Cleanup apenas ao desmontar componente
    return () => {
      console.log("🔌 Desmontando ProntuarioPage - fechando socket");
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.disconnect();
      setSocketState(null);
    };
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const normalizedSearch = normalizeString(search);
      const nameMatch =
        !search || normalizeString(r.NOME).includes(normalizedSearch);
      const statusMatch = attendanceStatus === r.currentStatus;

      return nameMatch && statusMatch;
    });
  }, [records, search, attendanceStatus]);

  const selectRecord = (r: MedicalRecord) => {
    const hasUnsavedChanges = false;

    if (hasUnsavedChanges) {
      setNextSelectedRecordIfDiscard(r);
      setUnsavedModalOpen(true);

      return;
    }
    setSelectedRecord(r);
    setCurrentPdfIndex(0);
  };

  const confirmDiscardAndSelect = () => {
    setUnsavedModalOpen(false);
    if (nextSelectedRecordIfDiscard) {
      setSelectedRecord(nextSelectedRecordIfDiscard);
      setCurrentPdfIndex(0);
    }
    setNextSelectedRecordIfDiscard(null);
  };

  const handlePdfIndexChange = (index: number) => {
    setCurrentPdfIndex(index);
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setAttendanceStatus(null);
    setEmpresa("");
    setMedicoExaminador("");
    setSearch("");
  };

  // Indicador visual de mais registros - aparece quando há 40+ registros carregados
  const showLoadMoreIndicator = records.length >= 40 && hasMoreRecords;

  return (
    <div className="min-h-screen flex flex-col bg-default-50 antialiased">
      <HeaderApp
        children={<h1 className="text-lg">Gestão de Prontuários</h1>}
        onLogout={logout}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Lista / filtros */}
        <aside className="w-80 bg-default-50 border-r border-divider p-4 flex flex-col flex-shrink-0">
          <div className="space-y-4">
            {/* Badge do Provedor de Assinatura Digital */}
            {assinaDigitalmente && (
              <div className="mb-4 grid grid-cols-[85px_minmax(0,1fr)] items-center gap-x-2 border-b border-divider pb-3">
                <span className="text-sm font-medium text-gray-700 text-left pt-1">
                  Assinatura:
                </span>
                <div className="justify-self-end flex items-center gap-2">
                  <PscProviderStatus
                    isLoading={isPscLoading}
                    pscAuthStatus={pscAuthStatus}
                    settings={pscSettings}
                  />
                </div>
              </div>
            )}

            <Select
              className="w-full"
              isDisabled={isLoadingEmpresasMedicos}
              label="Status de Atendimento"
              placeholder="Selecione um Status"
              selectedKeys={attendanceStatus ? [attendanceStatus] : []}
              size="sm"
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as
                  | AtendimentoStatus
                  | undefined;

                setAttendanceStatus(value ?? ("" as AtendimentoStatus));
              }}
            >
              {Object.values(AtendimentoStatus)
                .filter((status) => status !== AtendimentoStatus.AGENDADO)
                .map((status) => (
                  <SelectItem key={status}>
                    {status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
            </Select>

            {/* Novo campo: Empresa */}
            <Select
              isDisabled={isLoadingEmpresasMedicos}
              label="Empresas"
              placeholder="Todas"
              selectedKeys={empresa ? [empresa] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string | undefined;

                setEmpresa(value ?? "");
              }}
            >
              {empresas.map((emp) => (
                <SelectItem key={emp}>{emp}</SelectItem>
              ))}
            </Select>


            {/* Novo campo: Médico Examinador */}
            <Select
              isDisabled={isLoadingEmpresasMedicos}
              label="Médico Examinador"
              placeholder="Todos"
              selectedKeys={medicoExaminador ? [medicoExaminador] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string | undefined;

                setMedicoExaminador(value ?? "");
              }}
            >
              {medicos.map((med) => (
                <SelectItem key={med}>{med}</SelectItem>
              ))}
            </Select>

            <Input
              isDisabled={!attendanceStatus || isLoadingInitialData}
              placeholder="Buscar funcionário..."
              startContent={<Search className="w-4 h-4 text-default-400" />}
              value={search}
              onValueChange={setSearch}
            />

            {/* Botão para limpar filtros */}
            {(empresa || medicoExaminador || search) && (
              <Button
                className="w-full"
                size="sm"
                variant="light"
                onPress={limparFiltros}
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <Divider className="my-4" />

          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-default-700">
              Prontuários
            </h3>
            <div className="flex items-center gap-2">
              <Badge color="primary" variant="solid">
                {filtered.length}
              </Badge>
              {paginationData.total > 0 && (
                <span className="text-xs text-default-500">
                  de {paginationData.total}
                </span>
              )}
            </div>
          </div>

          {/* Container com scroll independente */}
          <div
            ref={setScrollContainerRef}
            className="flex-1 overflow-y-auto max-h-80 overflow-x-hidden space-y-3 p-1"
          >
            {isLoadingInitialData ? (
              <div className="flex flex-col items-center justify-center p-8 text-default-500">
                <Spinner color="success" size="lg" />
                <p className="mt-2 text-sm">Carregando...</p>
              </div>
            ) : !attendanceStatus ? (
              <Card className="bg-default-100 border-default-200">
                <CardBody className="text-center p-6">
                  <MessageCircleWarning className="w-8 h-8 mx-auto mb-3 text-warning" />
                  <p className="text-sm font-medium text-default-600">
                    Selecione um status para carregar os prontuários.
                  </p>
                </CardBody>
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardBody className="text-center p-6">
                  <MessageCircleWarning className="w-8 h-8 mx-auto mb-3 text-warning" />
                  <p className="text-default-500">
                    Nenhum prontuário encontrado.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <>
                {filtered.map((r, index) => (
                  <Card
                    key={r._id.toString()}
                    isPressable
                    className={`prontuario-card transition-all duration-200 w-3xs ${
                      selectedRecord?._id === r._id
                        ? "ring-2 ring-warning bg-warning-50"
                        : "hover:shadow-md"
                    }`}
                    onPress={() => selectRecord(r)}
                  >
                    <CardBody className="p-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-default-800 truncate">
                                {r.NOME}
                              </h4>
                              <p className="text-xs text-default-500">
                                {r.DATAAGENDAMENTO} - {r.TIPOEXAMENOME}
                              </p>
                              <Chip
                                className="mt-1"
                                color={getStatusColor(r.currentStatus)}
                                size="sm"
                                variant="flat"
                              >
                                {r.currentStatus.replace(/_/g, " ")}
                              </Chip>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}

                {/* Indicador de mais registros disponíveis */}
                {showLoadMoreIndicator && (
                  <div className="flex flex-col items-center justify-center p-4 bg-default-100 rounded-lg border border-default-200">
                    <div className="flex items-center gap-2 text-default-600 mb-2">
                      <ChevronDown className="w-4 h-4 animate-bounce" />
                      <span className="text-sm font-medium">
                        Mais prontuários disponíveis
                      </span>
                      <ChevronDown className="w-4 h-4 animate-bounce" />
                    </div>
                    <p className="text-xs text-default-500 text-center mb-3">
                      {paginationData.total - records.length} prontuários
                      restantes
                    </p>

                    {/* Botão para carregar mais manualmente */}
                    <Button
                      className="w-full"
                      color="primary"
                      isLoading={isLoadingMore}
                      size="sm"
                      startContent={
                        !isLoadingMore && <ChevronDown className="w-4 h-4" />
                      }
                      variant="flat"
                      onPress={carregarMaisRegistros}
                    >
                      {isLoadingMore ? "Carregando..." : "Carregar Mais"}
                    </Button>

                    {/* Indicador de carregamento automático */}
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 mt-2">
                        <Spinner color="primary" size="sm" />
                        <span className="text-xs text-default-500">
                          Carregando mais prontuários...
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Indicador de fim dos registros */}
                {!hasMoreRecords && records.length > 0 && (
                  <div className="flex flex-col items-center justify-center p-4 bg-success-50 rounded-lg border border-success-200">
                    <div className="flex items-center gap-2 text-success-600 mb-1">
                      <ChevronUp className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Todos os prontuários carregados
                      </span>
                      <ChevronUp className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-success-500 text-center">
                      {records.length} de {paginationData.total} prontuários
                      visualizados
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status da paginação no rodapé */}
          {records.length > 0 && (
            <div className="mt-3 pt-3 border-t border-default-200">
              <div className="flex justify-between items-center text-xs text-default-500">
                <span>
                  Visualizando {records.length} de {paginationData.total}
                </span>
                {hasMoreRecords && (
                  <span className="text-primary-600 font-medium">
                    +{paginationData.total - records.length} disponíveis
                  </span>
                )}
              </div>

              {/* Barra de progresso visual */}
              {paginationData.total > 0 && (
                <div className="w-full bg-default-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-green-700 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(records.length / paginationData.total) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </aside>

        {/* MIDDLE: PDF Viewer Componentizado */}
        <PdfViewer
          currentPdfIndex={currentPdfIndex}
          selectedRecord={selectedRecord}
          onPdfIndexChange={handlePdfIndexChange}
        />

        {/* RIGHT: Painel Lateral Componentizado */}
        <PainelDireita
          key={selectedRecord?.CODIGOPRONTUARIO || "no-selection"}
          currentPdfIndex={currentPdfIndex}
          selectedRecord={selectedRecord}
          setSelectedRecord={setSelectedRecord}
          user={user!}
          onPdfIndexChange={handlePdfIndexChange}
          onRecordUpdate={(updatedRecord) => {
            setRecords((prev) =>
              prev.map((rec) =>
                rec._id === updatedRecord._id ? updatedRecord : rec,
              ),
            );
            if (selectedRecord && selectedRecord._id === updatedRecord._id) {
              setSelectedRecord(updatedRecord);
            }
          }}
        />
      </div>

      {/* Modal Confirmar Descarte */}
      <HeroModal
        backdrop="blur"
        isOpen={unsavedModalOpen}
        onClose={() => setUnsavedModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-bold">Alterações não salvas</h3>
          </ModalHeader>
          <ModalBody>
            <p>
              Existem alterações não salvas. Deseja descartá-las para mudar de
              prontuário?
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setUnsavedModalOpen(false)}>
              Cancelar
            </Button>
            <Button color="danger" onPress={confirmDiscardAndSelect}>
              Descartar e Mudar
            </Button>
          </ModalFooter>
        </ModalContent>
      </HeroModal>
    </div>
  );
}
