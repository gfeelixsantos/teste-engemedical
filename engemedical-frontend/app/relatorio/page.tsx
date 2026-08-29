// app/relatorios/page.tsx
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Chip,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { SearchIcon, FilterIcon, EyeIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

import { LightModalSkeleton } from "./ModalSkeleton";

import {
  Scheduling,
  SchedulingChange,
} from "@/lib/scheduling/interface/scheduling";
import {
  AtendimentoStatus,
  MongoOperationTypes,
} from "@/lib/scheduling/enum/scheduling.enum";
import {
  NEST_RELATORIO_FILTROS,
  NEST_RELATORIO_FUNCIONARIO,
  NEST_RELATORIO_PARAMETROS,
  NEST_URL,
} from "@/config/constants";
import { HeaderApp } from "@/components/shared/HeaderApp";
import { formatCPF, getCurrentUser, getStatusColor, logout } from "@/lib/utils";
import { useModalOptimizer } from "@/hooks/useModalOptimizer";
import { useOptimizedDebounce } from "@/hooks/useDebounceOptimizer";
import { IUserInfo, IUserWebsocket } from "@/lib/user/interfaces/IUser";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";
import { EventType } from "@/lib/websocket/events/events";

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Componente lazy para o conteúdo pesado do modal
const LazyModalContent = lazy(() => import("./LazyModalContent"));

interface ReportParams {
  profissionais: { code: string; name: string }[];
  empresas: { code: string; name: string }[];
  status: { code: string; name: string }[];
  tiposExame: { code: string; name: string }[];
  unidadesAtendimento: { code: string; name: string }[];
  grupo: { code: string; name: string }[];
  salas: { code: string; name: string }[];
  atendentes: { code: string; name: string }[];
}

interface FilterParams {
  dataInicio?: string;
  dataFim?: string;
  empresa?: string;
  grupoExame?: string;
  tipoExame?: string;
  status?: string;
  search?: string;
  profissional?: string;
  atendente?: string;
  sala?: string;
  unidadeAtendimento?: string;
}

interface PaginatedReportData {
  data: Scheduling[];
  total: number;
  page: number;
  manha: number;
  tarde: number;
  indefinido: number;
  limit: number;
  totalPages: number;
}

// Componente principal
export default function RelatoriosPage() {
  const router = useRouter();
  const [userApp, setUserApp] = useState<IUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Referência para a tabela (para scroll)
  const tableRef = useRef<HTMLDivElement>(null);

  // Filtros atualizados
  const [filters, setFilters] = useState({
    dataInicio: "",
    dataFim: "",
    empresa: "",
    grupoExame: "",
    tipoExame: "",
    status: "",
    search: "",
    profissional: "",
    atendente: "",
    sala: "",
    unidadeAtendimento: "",
  });

  const [appliedFilters, setAppliedFilters] = useState<typeof filters>(filters);

  // Estados para selects
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [gruposExames, setGruposExames] = useState<string[]>([]);
  const [tiposExame, setTiposExame] = useState<string[]>([]);
  const [profissionais, setProfissionais] = useState<string[]>([]);
  const [atendentes, setAtendentes] = useState<string[]>([]);
  const [salas, setSalas] = useState<string[]>([]);
  const [unidadesAtendimento, setUnidadesAtendimento] = useState<string[]>([]);

  // Paginação
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalManha, setTotalManha] = useState(0);
  const [totalTarde, setTotalTarde] = useState(0);
  const [totalIndefinido, setTotalIndefinido] = useState(0);

  // Modal de detalhes
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedAtendimento, setSelectedAtendimento] =
    useState<Scheduling | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Estado para modal de alerta
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({ open: false, type: "warning", message: "" });
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  // Hooks otimizados
  const { preloadedData, preloadModalData, clearPreloadedData } =
    useModalOptimizer();
  const { isPending: isModalOpening, debounce: openModalWithDebounce } =
    useOptimizedDebounce(250);

  // Estado para os atendimentos FILTRADOS
  const [filteredAtendimentos, setFilteredAtendimentos] = useState<
    Scheduling[]
  >([]);

  // Estados para WebSocket
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      return router.push("/");
    }

    setUserApp(currentUser);
  }, [router]);

  // Calcular se há filtros ativos - MOVER PARA CIMA
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(
      (value) => value !== null && value !== "",
    );
  }, [filters]);

  // Função para scroll para o topo da tabela
  const scrollToTableTop = useCallback(() => {
    setTimeout(() => {
      if (tableRef.current) {
        const tableTop = tableRef.current.offsetTop - 100;

        window.scrollTo({
          top: tableTop,
          behavior: "smooth",
        });
      }
    }, 100);
  }, []);

  // Carregar parametros disponíveis
  const getParamsReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(NEST_RELATORIO_PARAMETROS, {
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Erro ao buscar dados iniciais:", response.statusText);

        return null;
      }

      const params: ReportParams = await response.json();

      setProfissionais(params.profissionais.map((p) => p.name));
      setAtendentes(params.atendentes.map((p) => p.name));
      setEmpresas(params.empresas.map((p) => p.name));
      setGruposExames(params.grupo.map((p) => p.name));
      setTiposExame(params.tiposExame.map((p) => p.name));
      setSalas(params.salas.map((p) => p.name));
      setUnidadesAtendimento(params.unidadesAtendimento.map((p) => p.name));
    } catch (err) {
      console.error("Erro ao carregar dados iniciais:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para formatar data do input (yyyy-MM-dd) para exibição ou para o backend
  const formatDateForBackend = (dateString: string): string => {
    if (!dateString) return "";

    return dateString;
  };

  // Função para validar se a data é válida
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);

    return !isNaN(date.getTime());
  };

  // Carregar dados quando o componente montar
  useEffect(() => {
    getParamsReport();
  }, [getParamsReport]);

  // Efeito para configurar WebSocket
  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) return;

    const conectionType = WebsocketType.PRONTUARIO;
    const user: IUserWebsocket = {
      nome: currentUser.nome!,
      sala: "relatorio",
      type: conectionType,
      unidade: "",
    };

    const s: Socket = io(NEST_URL, {
      auth: user,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
    });

    setSocketState(s);

    s.on("connect", () => {
      console.log("✅ Relatório conectado via WebSocket:", s.id);
      setConectado(true);
    });

    s.on("disconnect", (reason) => {
      console.warn("⚠️ Relatório desconectado do WebSocket:", reason);
      setConectado(false);
    });

    s.on("connect_error", (err) => {
      console.error("❌ Erro ao conectar WebSocket no Relatório:", err);
    });

    return () => {
      console.log("🔌 Desconectando WebSocket do Relatório");
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.disconnect();
      setSocketState(null);
    };
  }, []);

  // Registro handle de eventos WebSocket
  useEffect(() => {
    if (!socketState) return;

    const handleUpdateRecord = ({ operation, schedule }: SchedulingChange) => {
      console.log(`🔄 [Relatorio] UPDATE_RECORD: ${operation}`, schedule.NOME);

      // Atualizar lista principal
      setFilteredAtendimentos((prev) => {
        const updatedList = [...prev];
        const scheduleId = String((schedule as any)._id ?? "");
        const index = updatedList.findIndex(
          (r) => String((r as any)._id ?? "") === scheduleId,
        );

        if (operation === MongoOperationTypes.DELETE) {
          if (index > -1) {
            updatedList.splice(index, 1);
          }

          return updatedList;
        }

        if (index > -1) {
          updatedList[index] = schedule;
        } else {
          // Se não estiver na lista, talvez devesse ser inserido?
          // No relatório, geralmente só atualizamos o que já está visível
          // (devido aos filtros de data/empresa).
          // Por simplicidade e segurança (filtros), apenas atualizamos.
        }

        return updatedList;
      });

      // Atualizar modal selecionado
      setSelectedAtendimento((current) => {
        if (!current) return null;
        const currentId = String((current as any)._id ?? "");
        const updateId = String((schedule as any)._id ?? "");

        if (currentId === updateId) {
          console.log("✅ Atualizando modal selecionado via WebSocket");

          return schedule;
        }

        return current;
      });
    };

    socketState.on(EventType.UPDATE_RECORD, handleUpdateRecord);

    return () => {
      socketState.off(EventType.UPDATE_RECORD, handleUpdateRecord);
    };
  }, [socketState]);

  // Função para preparar os filtros para envio ao backend
  const prepareFiltersForBackend = useCallback(
    (currentFilters: typeof filters): FilterParams => {
      const backendFilters: FilterParams = {};

      // Converter datas para formato YYYY-MM-DD (já estão nesse formato do input)
      if (currentFilters.dataInicio && isValidDate(currentFilters.dataInicio)) {
        backendFilters.dataInicio = formatDateForBackend(
          currentFilters.dataInicio,
        );
      }

      if (currentFilters.dataFim && isValidDate(currentFilters.dataFim)) {
        backendFilters.dataFim = formatDateForBackend(currentFilters.dataFim);
      }

      // Adicionar outros filtros apenas se não estiverem vazios
      if (currentFilters.empresa)
        backendFilters.empresa = currentFilters.empresa;
      if (currentFilters.grupoExame)
        backendFilters.grupoExame = currentFilters.grupoExame;
      if (currentFilters.tipoExame)
        backendFilters.tipoExame = currentFilters.tipoExame;
      if (currentFilters.status) backendFilters.status = currentFilters.status;
      if (currentFilters.search)
        backendFilters.search = normalizeString(currentFilters.search);
      if (currentFilters.profissional)
        backendFilters.profissional = currentFilters.profissional;
      if (currentFilters.atendente)
        backendFilters.atendente = currentFilters.atendente;
      if (currentFilters.sala) backendFilters.sala = currentFilters.sala;
      if (currentFilters.unidadeAtendimento)
        backendFilters.unidadeAtendimento = currentFilters.unidadeAtendimento;

      return backendFilters;
    },
    [],
  );

  // Buscar dados filtrados do backend com paginação
  const fetchFilteredData = useCallback(
    async (filterParams: FilterParams, currentPage: number = 1) => {
      try {
        setIsFiltering(true);

        // Construir query string com os filtros E paginação
        const queryParams = new URLSearchParams();

        // Adicionar filtros
        Object.entries(filterParams).forEach(([key, value]) => {
          if (value && value !== "") {
            queryParams.append(key, value.toString());
          }
        });

        // Adicionar parâmetros de paginação
        queryParams.append("page", currentPage.toString());
        queryParams.append("limit", rowsPerPage.toString());

        const url = `${NEST_RELATORIO_FILTROS}?${queryParams.toString()}`;

        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Erro ao buscar dados filtrados: ${response.statusText}`,
          );
        }

        const result: PaginatedReportData = await response.json();

        // Atualizar estados de paginação
        setTotalRecords(result.total);
        setTotalPages(result.totalPages);
        setTotalManha(result.manha);
        setTotalTarde(result.tarde);
        setTotalIndefinido(result.indefinido);
        setPage(result.page);
        setFilteredAtendimentos(result.data);

        // Pré-carregar os primeiros 3 atendimentos da página
        const firstThree = result.data.slice(0, 3);

        firstThree.forEach((item) => {
          preloadModalData(item._id);
        });
      } catch (error) {
        console.error("Erro ao buscar dados filtrados:", error);
      } finally {
        setIsFiltering(false);
      }
    },
    [rowsPerPage, preloadModalData],
  );

  // Aplicar filtros
  const handleApplyFilters = useCallback(async () => {
    setShowResults(true);
    setAppliedFilters(filters);
    setPage(1);

    const backendFilters = prepareFiltersForBackend(filters);

    await fetchFilteredData(backendFilters, 1);

    // Scroll para a tabela após aplicar filtros
    scrollToTableTop();
  }, [filters, prepareFiltersForBackend, fetchFilteredData, scrollToTableTop]);

  // Mudar de página
  const handlePageChange = useCallback(
    async (newPage: number) => {
      setPage(newPage);

      const backendFilters = prepareFiltersForBackend(appliedFilters);

      await fetchFilteredData(backendFilters, newPage);

      // Scroll para o topo da tabela após mudar de página
      scrollToTableTop();
    },
    [
      appliedFilters,
      prepareFiltersForBackend,
      fetchFilteredData,
      scrollToTableTop,
    ],
  );

  // Limpar filtros e resultados
  const handleClearFilters = useCallback(() => {
    setFilters({
      dataInicio: "",
      dataFim: "",
      empresa: "",
      grupoExame: "",
      tipoExame: "",
      status: "",
      search: "",
      profissional: "",
      atendente: "",
      sala: "",
      unidadeAtendimento: "",
    });
    setAppliedFilters({
      dataInicio: "",
      dataFim: "",
      empresa: "",
      grupoExame: "",
      tipoExame: "",
      status: "",
      search: "",
      profissional: "",
      atendente: "",
      sala: "",
      unidadeAtendimento: "",
    });
    setShowResults(false);
    setFilteredAtendimentos([]);
    setPage(1);
    setTotalRecords(0);
    setTotalPages(0);
    clearPreloadedData();
  }, [clearPreloadedData]);

  // Handler para mudanças rápidas nos filtros
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Pré-carregar quando o mouse passa sobre uma linha
  const handleMouseEnterRow = useCallback(
    (atendimentoId: string) => {
      preloadModalData(atendimentoId);
    },
    [preloadModalData],
  );

  // Função para visualizar detalhes
  const viewDetails = useCallback(
    (atendimento: Scheduling) => {
      setLoadingDetailsId(atendimento._id);
      setModalLoading(true);
      onOpen();

      openModalWithDebounce(async () => {
        try {
          // Verificar se já temos dados pré-carregados
          if (preloadedData[atendimento._id]) {
            setSelectedAtendimento(preloadedData[atendimento._id]);
            setModalLoading(false);
            setLoadingDetailsId(null);

            // Limpar da memória após uso (opcional)
            setTimeout(() => {
              clearPreloadedData(atendimento._id);
            }, 5000);

            return;
          }

          // Se não tiver pré-carregado, buscar normalmente
          const response = await fetch(
            `${NEST_RELATORIO_FUNCIONARIO}${atendimento._id}`,
          );

          if (!response.ok) {
            const text = await response.text();

            console.error(`Erro ao receber detalhes do funcionário ${text}`);
          }

          const json = await response.json();

          setSelectedAtendimento(json);
        } catch (error) {
          console.error("Erro ao carregar detalhes:", error);
        } finally {
          setModalLoading(false);
          setLoadingDetailsId(null);
        }
      });
    },
    [onOpen, openModalWithDebounce, preloadedData, clearPreloadedData],
  );

  // Fechar modal
  const handleCloseModal = useCallback(() => {
    setSelectedAtendimento(null);
    setLoadingDetailsId(null);
    onClose();
  }, [onClose]);

  // Atualizar atendimento após upload
  const handleUpdateSchedulingFromModal = useCallback((updated: Scheduling) => {
    setSelectedAtendimento((current) => {
      if (current && current._id === updated._id) {
        return updated;
      }

      return current;
    });

    setFilteredAtendimentos((prev) => {
      const foundIndex = prev.findIndex((p) => p._id === updated._id);

      if (foundIndex === -1) return prev;

      const copy = [...prev];

      copy[foundIndex] = updated;

      return copy;
    });
  }, []);

  // Renderização otimizada do modal
  const renderModalContent = useMemo(() => {
    if (!selectedAtendimento) return null;

    return (
      <Suspense fallback={<LightModalSkeleton />}>
        <LazyModalContent
          atendimento={selectedAtendimento}
          userApp={userApp}
          onClose={handleCloseModal}
          onUpdateScheduling={handleUpdateSchedulingFromModal}
        />
      </Suspense>
    );
  }, [selectedAtendimento, handleCloseModal, handleUpdateSchedulingFromModal]);

  // Contador de filtros ativos - MOVER PARA CIMA TAMBÉM
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(
      (value) => value !== null && value !== "",
    ).length;
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-100 mb-8">
      <HeaderApp
        children={<h2>Relatórios de Atendimento</h2>}
        onLogout={() => {
          logout();
          router.push("/");
        }}
      />

      {/* Filtros */}
      <Card className="m-6 p-4 border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Filtros de atendimento
              </h2>
              <p className="text-sm text-gray-500">
                {activeFiltersCount > 0
                  ? `${activeFiltersCount} filtro(s) ativo(s)`
                  : "Configure os filtros para buscar atendimentos"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="font-medium text-white"
              color="success"
              isDisabled={!hasActiveFilters}
              isLoading={isFiltering}
              onPress={handleApplyFilters}
            >
              Aplicar Filtros
            </Button>
            <Button
              color="primary"
              isDisabled={!hasActiveFilters}
              startContent={<XIcon size={16} />}
              variant="light"
              onPress={handleClearFilters}
            >
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Busca por Nome do Funcionário */}
            <div className="lg:col-span-2 xl:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Buscar por Funcionário
              </label>
              <Input
                isClearable
                aria-label="Buscar por nome do funcionário"
                placeholder="Digite o nome do funcionário..."
                size="lg"
                startContent={
                  <SearchIcon className="text-gray-400" size={16} />
                }
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value.trimStart())}
                onBlur={(e) => handleFilterChange("search", e.target.value.trim())}
                onClear={() => handleFilterChange("search", "")}
              />
            </div>

            {/* Data Início */}
            <div className="space-y-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Data Início
              </label>
              <Input
                aria-label="Data início"
                placeholder="Selecione a data início"
                type="date"
                value={filters.dataInicio}
                onChange={(e) =>
                  handleFilterChange("dataInicio", e.target.value)
                }
                onClear={() => handleFilterChange("dataInicio", "")}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Data Fim
              </label>
              <Input
                aria-label="Data fim"
                placeholder="Selecione a data fim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange("dataFim", e.target.value)}
                onClear={() => handleFilterChange("dataFim", "")}
              />
            </div>

            {/* Empresa */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Empresa
              </label>
              <Autocomplete
                allowsCustomValue={false}
                allowsEmptyCollection={false}
                aria-label="Selecionar empresa"
                className="w-full"
                defaultItems={empresas.map((empresa) => ({
                  id: empresa,
                  name: empresa,
                }))}
                placeholder="Digite ou selecione uma empresa"
                selectedKey={filters.empresa}
                size="lg"
                onSelectionChange={(key) =>
                  handleFilterChange("empresa", (key as string) || "")
                }
              >
                {(item) => (
                  <AutocompleteItem key={item.id} textValue={item.name}>
                    <span className="text-xs truncate">{item.name}</span>
                  </AutocompleteItem>
                )}
              </Autocomplete>
            </div>

            {/* Grupo de Exame */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Grupo de Exame
              </label>
              <Select
                aria-label="Selecionar grupo de exame"
                className="w-full"
                selectedKeys={filters.grupoExame ? [filters.grupoExame] : []}
                size="lg"
                onSelectionChange={(keys) =>
                  handleFilterChange("grupoExame", Array.from(keys)[0] || "")
                }
              >
                {gruposExames.map((grupo) => (
                  <SelectItem key={grupo}>{grupo}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Tipo de Exame */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tipo de Exame
              </label>
              <Select
                aria-label="Selecionar tipo de exame"
                className="w-full"
                selectedKeys={filters.tipoExame ? [filters.tipoExame] : []}
                size="lg"
                onSelectionChange={(keys) =>
                  handleFilterChange("tipoExame", Array.from(keys)[0] || "")
                }
              >
                {tiposExame.map((tipo) => (
                  <SelectItem key={tipo}>{tipo}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <Select
                aria-label="Selecionar status"
                className="w-full"
                selectedKeys={filters.status ? [filters.status] : []}
                size="lg"
                onSelectionChange={(keys) =>
                  handleFilterChange("status", Array.from(keys)[0] || "")
                }
              >
                {Object.values(AtendimentoStatus).map((status) => (
                  <SelectItem key={status}>
                    {status
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Profissional */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Profissional
              </label>
              <Select
                aria-label="Selecionar profissional"
                className="w-full"
                selectedKeys={
                  filters.profissional ? [filters.profissional] : []
                }
                size="lg"
                onSelectionChange={(keys) =>
                  handleFilterChange("profissional", Array.from(keys)[0] || "")
                }
              >
                {profissionais.map((profissional) => (
                  <SelectItem key={profissional}>{profissional}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Sala */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sala</label>
              <Select
                aria-label="Selecionar sala"
                className="w-full"
                selectedKeys={filters.sala ? [filters.sala] : []}
                size="lg"
                onSelectionChange={(keys) =>
                  handleFilterChange("sala", Array.from(keys)[0] || "")
                }
              >
                {salas.map((sala) => (
                  <SelectItem key={sala}>{sala}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Unidade de Atendimento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Unidade de Atendimento
              </label>
              <Select
                aria-label="Selecionar unidade de atendimento"
                className="w-full"
                selectedKeys={
                  filters.unidadeAtendimento ? [filters.unidadeAtendimento] : []
                }
                size="lg"
                onSelectionChange={(keys) =>
                  handleFilterChange(
                    "unidadeAtendimento",
                    Array.from(keys)[0] || "",
                  )
                }
              >
                {unidadesAtendimento.map((unidade) => (
                  <SelectItem key={unidade}>{unidade}</SelectItem>
                ))}
              </Select>
            </div>

            {/* Atendente */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Atendente
              </label>
              <Select
                aria-label="Selecionar atendente"
                className="w-full"
                selectedKeys={filters.atendente ? [filters.atendente] : []}
                size="lg"
                onSelectionChange={(keys) =>
                  handleFilterChange("atendente", Array.from(keys)[0] || "")
                }
              >
                {atendentes.map((atendente) => (
                  <SelectItem key={atendente}>{atendente}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabela de Resultados */}
      {showResults && (
        <div ref={tableRef}>
          <Card className="m-6 p-4 border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Resultados
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {totalRecords} atendimento(s): {totalManha} manhã,{" "}
                  {totalTarde} tarde, {totalIndefinido} indefinido.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">
                    Página {page} de {totalPages}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {isFiltering ? (
                <div className="flex justify-center py-12">
                  <Spinner
                    color="success"
                    label="Buscando atendimentos..."
                    size="lg"
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-auto">
                    <Table
                      removeWrapper
                      aria-label="Tabela de atendimentos"
                      classNames={{
                        base: "min-w-full",
                        th: "bg-gray-50 text-gray-700 font-semibold text-xs px-3 py-2 border-b",
                        td: "px-3 py-2 border-b border-gray-100 text-sm",
                        tr: "hover:bg-gray-50 transition-colors",
                      }}
                    >
                      <TableHeader>
                        <TableColumn className="w-50">FUNCIONÁRIO</TableColumn>
                        <TableColumn className="w-50">EMPRESA</TableColumn>
                        <TableColumn className="w-40">CARGO</TableColumn>
                        <TableColumn className="w-30">EXAME</TableColumn>
                        <TableColumn className="w-10">STATUS</TableColumn>
                        <TableColumn className="w-20">UNIDADE</TableColumn>
                        <TableColumn className="w-10">AÇÕES</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {filteredAtendimentos.map((atendimento) => (
                          <TableRow
                            key={
                              atendimento._id || atendimento.CODIGOPRONTUARIO
                            }
                            onMouseEnter={() =>
                              handleMouseEnterRow(atendimento._id)
                            }
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-xs text-gray-900">
                                  {atendimento.NOME.toUpperCase()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  CPF: {formatCPF(atendimento.CPFFUNCIONARIO)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-700">
                                {atendimento.NOMEEMPRESA}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-700">
                                {atendimento.NOMECARGO}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-700">
                                  {atendimento.TIPOEXAMENOME}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {atendimento.DATAAGENDAMENTO} -{" "}
                                  {atendimento.HORARIO}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Chip
                                aria-label={`Status: ${atendimento.ATENDIMENTOSTATUS}`}
                                classNames={{
                                  content: "text-xs font-medium",
                                }}
                                color={getStatusColor(
                                  atendimento.ATENDIMENTOSTATUS,
                                )}
                                size="sm"
                                variant="flat"
                              >
                                {atendimento.ATENDIMENTOSTATUS.replace(
                                  /_/g,
                                  " ",
                                )
                                  .toLowerCase()
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Chip>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-700">
                                {atendimento.UNIDADEATENDIMENTO}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                isIconOnly
                                aria-label={`Visualizar detalhes do atendimento de ${atendimento.NOME}`}
                                className="text-blue-600 hover:text-blue-700"
                                isLoading={loadingDetailsId === atendimento._id}
                                size="sm"
                                variant="light"
                                onPress={() => viewDetails(atendimento)}
                              >
                                {loadingDetailsId !== atendimento._id && (
                                  <EyeIcon size={16} />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center p-4 border-t border-gray-100">
                      <Pagination
                        showControls
                        aria-label="Navegação de páginas"
                        className="hover:cursor-pointer"
                        page={page}
                        size="lg"
                        total={totalPages}
                        onChange={handlePageChange}
                      />
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Estado inicial - instruções */}
      {!showResults && !loading && (
        <Card className="mx-6 border border-gray-200 shadow-sm">
          <CardBody className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FilterIcon className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Nenhum filtro aplicado
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Configure os filtros acima e clique em "Aplicar Filtros" para
              visualizar os atendimentos.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Loading inicial */}
      {loading && (
        <Card className="mx-6">
          <CardBody className="text-center py-16">
            <Spinner
              color="success"
              label="Carregando parâmetros..."
              size="lg"
            />
          </CardBody>
        </Card>
      )}

      {/* Modal de Detalhes */}
      <Modal
        aria-label="Modal de detalhes do atendimento"
        classNames={{
          base: "max-h-[90vh] border border-[#104e35]/20",
          wrapper: "z-[500]",
          backdrop: "z-[400]",
        }}
        isOpen={isOpen}
        scrollBehavior="inside"
        size="5xl"
        onClose={handleCloseModal}
      >
        <ModalContent>
          {modalLoading || isModalOpening ? (
            <LightModalSkeleton />
          ) : (
            renderModalContent
          )}
        </ModalContent>
      </Modal>

      {/* Modal de Alerta */}
      <Modal
        disableAnimation
        classNames={{
          base: "z-[1100]",
          wrapper: "z-[1100]",
          backdrop: "z-[1099]",
        }}
        isDismissable={false}
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ ...alertModal, open: false })}
      >
        <ModalContent className="border border-[#104e35]/20">
          <ModalHeader
            className={
              alertModal.type === "success"
                ? "text-green-600"
                : alertModal.type === "error"
                  ? "text-red-600"
                  : "text-yellow-600"
            }
          >
            {alertModal.type === "success"
              ? "Sucesso"
              : alertModal.type === "error"
                ? "Erro"
                : "Atenção"}
          </ModalHeader>
          <ModalBody>
            <p>{alertModal.message}</p>
          </ModalBody>
          <ModalFooter>
            <Button
              className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white"
              onPress={() => setAlertModal({ ...alertModal, open: false })}
            >
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
