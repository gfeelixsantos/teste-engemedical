"use client";

import React, { useState, useCallback, lazy, Suspense, useMemo } from "react";
import {
  Chip,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Skeleton,
} from "@heroui/react";
import { VariableSizeList as List } from "react-window";
import { Search, X, Clock, Calendar, Plus } from "lucide-react";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { NEST_RELATORIO_FUNCIONARIO } from "@/config/constants";
import { getStatusColor } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";

// Importar o LazyModalContent
const LazyModalContent = lazy(() => import("@/app/relatorio/LazyModalContent"));

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface AgendamentosListProps {
  agendadosFiltrados: Scheduling[];
  conectado: boolean;
  unidadeSelecionada: string;
}

const StatusBadge: React.FC<{ status: string }> = React.memo(({ status }) => {
  return (
    <Chip
      className="text-xs font-medium"
      color={getStatusColor(status)}
      size="sm"
      variant="flat"
    >
      {status.replace(/_/g, " ")}
    </Chip>
  );
});

StatusBadge.displayName = "StatusBadge";

// Skeleton para o modal de detalhes
const ModalSkeleton = () => (
  <div className="space-y-6">
    <ModalHeader>
      <div className="w-full space-y-3">
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>
    </ModalHeader>
    <ModalBody>
      <div className="space-y-6">
        {/* Informações Gerais Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-32 rounded-lg" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-24 rounded-lg" />
                      <Skeleton className="h-4 w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalBody>
  </div>
);

// Badge para mostrar resumo dos exames no card principal - AGORA ABRE O MODAL COMPLETO
const ExamesBadge: React.FC<{
  exames: any[];
  nomePaciente: string;
  agendamento: Scheduling;
  onOpenDetails: (agendamento: Scheduling) => void;
}> = React.memo(({ exames, nomePaciente, agendamento, onOpenDetails }) => {
  if (!exames || exames.length === 0) return null;

  const examesFinalizados = exames.filter(
    (exame) => exame.status === "FINALIZADO",
  ).length;
  const examesPendentes = exames.filter(
    (exame) => exame.status === "PENDENTE",
  ).length;

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetails(agendamento);
  };

  return (
    <div className="mt-2">
      <span className="flex-1 text-left">
        Exames: {examesFinalizados} finalizado(s), {examesPendentes} pendente(s)
      </span>
    </div>
  );
});

ExamesBadge.displayName = "ExamesBadge";

// Modal de Detalhes Completo
const DetalhesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  atendimento: Scheduling | null;
  loading: boolean;
}> = ({ isOpen, onClose, atendimento, loading }) => {
  const userApp = useUser();

  return (
    <Modal
      aria-label="Modal de detalhes do atendimento"
      classNames={{
        base: "max-h-[90vh] border border-[#44735e]/20",
        wrapper: "z-[1000]",
      }}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onClose={onClose}
    >
      <ModalContent>
        {loading || !atendimento ? (
          <ModalBody className="py-8">
            <ModalSkeleton />
          </ModalBody>
        ) : (
          <Suspense fallback={<ModalSkeleton />}>
            <LazyModalContent
              atendimento={atendimento}
              userApp={userApp}
              onClose={onClose}
              onUpdateScheduling={(updated: any) => {
                // Aqui você pode atualizar o estado se necessário
                console.log("Atendimento atualizado:", updated);
              }}
            />
          </Suspense>
        )}
      </ModalContent>
    </Modal>
  );
};

// Componente memoizado para cada item
const AgendamentoItem = React.memo(
  ({
    agendamento,
    style,
    onSelect,
    onOpenDetails,
    loadingDetailsId,
  }: {
    agendamento: Scheduling;
    style: React.CSSProperties;
    onSelect: (agendamento: Scheduling) => void;
    onOpenDetails: (agendamento: Scheduling) => void;
    loadingDetailsId: string | null;
  }) => {
    const handleClick = useCallback(() => {
      onSelect(agendamento);
    }, [onSelect, agendamento]);

    const handleOpenDetails = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenDetails(agendamento);
      },
      [agendamento, onOpenDetails],
    );

    return (
      <div
        className="rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer p-4 my-2"
        style={style}
        onClick={handleOpenDetails}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {agendamento.NOME}
              </h3>
            </div>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <Clock className="mr-2" size={14} />
              <span>
                {agendamento.HORARIO != "" ? agendamento.HORARIO : "Aguardando"}
              </span>
              <span className="truncate ml-4">{agendamento.TIPOEXAMENOME}</span>
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <StatusBadge status={agendamento.ATENDIMENTOSTATUS} />
          </div>
        </div>

        <div className="text-sm">
          <div className="flex items-center text-gray-700">
            <span className="truncate">{agendamento.NOMEEMPRESA}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <span className="truncate">{agendamento.NOMECARGO}</span>
          </div>

          {/* Observações */}
          {agendamento.OBSERVACOES && (
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 mt-2">
              <p className="text-xs text-amber-700">
                <strong>Observações:</strong> {agendamento.OBSERVACOES}
              </p>
            </div>
          )}

          {/* Badge dos Exames - AGORA ABRE O MODAL COMPLETO */}
          {agendamento.EXAMES && agendamento.EXAMES.length > 0 && (
            <ExamesBadge
              agendamento={agendamento}
              exames={agendamento.EXAMES}
              nomePaciente={agendamento.NOME}
              onOpenDetails={onOpenDetails}
            />
          )}
        </div>
      </div>
    );
  },
);

AgendamentoItem.displayName = "AgendamentoItem";

// Componente principal
const AgendamentosList: React.FC<AgendamentosListProps> = ({
  agendadosFiltrados,
  conectado,
  unidadeSelecionada,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buscaSenha, setBuscaSenha] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] =
    useState<Scheduling | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  const listRef = React.useRef<List>(null);

  // Filtrar agendamentos com base na busca
  const agendamentosFiltrados = useMemo(() => {
    const base = agendadosFiltrados.filter(
      (a) =>
        a.UNIDADEATENDIMENTO === unidadeSelecionada ||
        !a.UNIDADEATENDIMENTO,
    );

    if (!buscaSenha.trim()) return base;

    const termoBusca = normalizeString(buscaSenha.trim());

    return base.filter(
      (agendamento) =>
        normalizeString(agendamento.NOME).includes(termoBusca) ||
        normalizeString(agendamento.NOMEEMPRESA).includes(termoBusca) ||
        (agendamento.NOMECARGO &&
          normalizeString(agendamento.NOMECARGO).includes(termoBusca)),
    );
  }, [agendadosFiltrados, unidadeSelecionada, buscaSenha]);

  // Calcular altura dinâmica para cada item
  const getItemSize = useCallback(
    (index: number) => {
      const agendamento = agendamentosFiltrados[index];
      let height = 180;

      if (agendamento.OBSERVACOES) {
        height += 50;
      }

      if (agendamento.EXAMES && agendamento.EXAMES.length > 0) {
        height += 40;
      }

      return height;
    },
    [agendamentosFiltrados],
  );

  // Resetar as alturas dos itens quando os dados mudarem
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [agendamentosFiltrados]);

  const handleItemSelect = useCallback((agendamento: Scheduling) => {
    setIsOpen(false);
  }, []);

  const handleOpenDetails = useCallback(async (agendamento: Scheduling) => {
    setSelectedAtendimento(agendamento);
    setLoadingDetailsId(agendamento._id);
    setModalLoading(true);
    setModalOpen(true);

    try {
      // Buscar detalhes completos do atendimento
      const response = await fetch(
        `${NEST_RELATORIO_FUNCIONARIO}${agendamento._id}`,
      );

      if (!response.ok) {
        throw new Error(`Erro: ${response.statusText}`);
      }
      const detalhes = await response.json();

      setSelectedAtendimento(detalhes);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setModalLoading(false);
      setLoadingDetailsId(null);
    }
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBuscaSenha(e.target.value);
    },
    [setBuscaSenha],
  );

  const clearSearch = useCallback(() => {
    setBuscaSenha("");
  }, [setBuscaSenha]);

  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <AgendamentoItem
        agendamento={agendamentosFiltrados[index]}
        loadingDetailsId={loadingDetailsId}
        style={style}
        onOpenDetails={handleOpenDetails}
        onSelect={handleItemSelect}
      />
    ),
    [
      agendamentosFiltrados,
      handleItemSelect,
      handleOpenDetails,
      loadingDetailsId,
    ],
  );

  const handleCloseModal = useCallback(() => {
    setSelectedAtendimento(null);
    setLoadingDetailsId(null);
    setModalOpen(false);
  }, []);

  return (
    <>
      <Button
        aria-label="Iniciar atendimento do dia"
        className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl font-medium bg-[#e8f4e3] text-[#104e35] border border-[#104e35]/30 hover:bg-[#d4e8d0] focus:ring-2 focus:ring-[#104e35]/20"
        onPress={() => setIsOpen(true)}
      >
        <Calendar className="h-4 w-4" />
        <span>Agenda</span>
      </Button>

      <Drawer
        disableAnimation={false}
        hideCloseButton={true}
        isDismissable={true}
        isOpen={isOpen}
        placement="left"
        size="md"
      >
        <DrawerContent className="max-w-lg mx-auto">
          <DrawerHeader className="flex flex-col border-b border-gray-200 px-5 py-4 bg-gray-50 rounded-t-xl">
            <div className="flex items-center justify-start gap-4 w-full">
              <Calendar className="w-5 h-5" />
              <h2 className="text-xl font-bold text-gray-900">
                Lista de Agendamentos
              </h2>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {agendamentosFiltrados.length} agendamento(s)
              {buscaSenha && (
                <span className="ml-2 text-blue-600 font-medium">
                  • Busca: "{buscaSenha}"
                </span>
              )}
            </p>
          </DrawerHeader>

          <DrawerBody className="p-5 overflow-hidden bg-gray-100">
            {conectado ? (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-gray-500" size={18} />
                  </div>
                  <input
                    className="w-full pl-11 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      hover:border-gray-400 transition-colors shadow-sm"
                    id="busca-senha"
                    placeholder="Buscar por nome, empresa ou cargo..."
                    type="text"
                    value={buscaSenha}
                    onChange={handleSearchChange}
                  />
                  {buscaSenha && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Button
                        isIconOnly
                        className="text-gray-500"
                        size="sm"
                        variant="light"
                        onPress={clearSearch}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  )}
                </div>

                {agendamentosFiltrados.length > 0 ? (
                  <div className="bg-white rounded-xl p-1 shadow-sm">
                    <List
                      ref={listRef}
                      height={520}
                      itemCount={agendamentosFiltrados.length}
                      itemSize={getItemSize}
                      width="100%"
                    >
                      {renderRow}
                    </List>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
                    <Search className="mb-4 text-gray-400" size={48} />
                    <p className="text-lg font-medium mb-1">
                      {buscaSenha
                        ? "Nenhum agendamento encontrado"
                        : "Nenhum agendamento para hoje"}
                    </p>
                    <p className="text-sm text-center text-gray-600">
                      {buscaSenha
                        ? 'Nenhum agendamento encontrado para a busca "' +
                          buscaSenha +
                          '". Tente ajustar os termos.'
                        : "Não há agendamentos cadastrados para hoje."}
                    </p>
                    {buscaSenha && (
                      <Button
                        className="mt-4"
                        variant="flat"
                        onPress={clearSearch}
                      >
                        Limpar busca
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 text-gray-500 bg-white rounded-xl shadow-sm">
                <div className="rounded-full bg-amber-100 p-4 mb-4">
                  <X className="text-amber-500" size={32} />
                </div>
                <p className="text-lg font-medium mb-1">Não conectado</p>
                <p className="text-sm text-center text-gray-600">
                  Conecte-se para visualizar os agendamentos.
                </p>
              </div>
            )}
          </DrawerBody>

          <DrawerFooter className="border-t border-gray-200 px-5 py-4 bg-gray-50 rounded-b-xl">
            <div className="flex gap-3 justify-end">
              <Button
                className="rounded-lg px-4"
                variant="flat"
                onPress={() => setIsOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Modal de Detalhes Completo */}
      <DetalhesModal
        atendimento={selectedAtendimento}
        isOpen={modalOpen}
        loading={modalLoading}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default React.memo(AgendamentosList);
