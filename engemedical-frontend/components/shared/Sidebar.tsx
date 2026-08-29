"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Wifi, WifiOff, Users } from "lucide-react";
import { Button } from "@heroui/react";

import AgendamentosList from "../../app/recepcao/components/AgendamentosList";


import type { ExamToogle } from "@/lib/exames/utils/exames-helper";
import {
  UNIDADES_ATENDIMENTO,
  SALAS_EXAMES,
  SALAS_RECEPCAO,
} from "@/config/constants";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { Ticket } from "@/lib/ticket/ticket";
import { useUnits } from "@/lib/config/useUnits";

interface SidebarRecepcaoProps {
  unidadeSelecionada: string;
  setUnidadeSelecionada: (value: string) => void;
  salaSelecionada: string;
  setSalaSelecionada: (value: string) => void;
  statusSelecionado: string;
  setStatusSelecionado: (value: string) => void;
  conectado: boolean;
  handleConectar: () => void;
  agendadosFiltrados: Scheduling[];
  onLoading: boolean;
  setTicketSelecionado: (ticket: Ticket | null) => void;
  onHandleModal: (state: boolean) => void;
  exameSelecionado: string;
  onHandleExameSelecionado: (exame: string) => void;
  pscStatusElement?: React.ReactNode;
  pscAuthButtonElement?: React.ReactNode;
  isReconnecting?: boolean;
  examesGrouped?: Record<string, ExamToogle[]>;
  isTelemedicinaModo?: boolean;
  toggleTelemedicinaModo?: () => void;
}

/* SelectField CMSO */
const SelectField = ({
  id,
  label,
  value,
  options,
  onChange,
  conectado,
}: {
  id: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  conectado: boolean;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-700" htmlFor={id}>
      {label}
      {conectado && (
        <span className="text-[10px] text-gray-500 ml-1">(somente leitura)</span>
      )}
    </label>

    <div className="relative">
      <select
        aria-label={label}
        className={`w-full px-2 py-1.5 border rounded-lg text-xs shadow-sm focus:outline-none transition-colors appearance-none ${
          conectado
            ? "bg-white border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-white border-gray-300 text-gray-800 hover:border-[#104e35] focus:ring-2 focus:ring-[#104e35]"
        }`}
        disabled={conectado}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M19 9l-7 7-7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>
    </div>
  </div>
);

/* Botão Novo Atendimento */
const ActionButtonGroup = ({
  onAddAtendimento,
}: {
  onAddAtendimento: () => void;
}) => (
  <div className="flex flex-col gap-1 mt-3">
    <Button
      aria-label="Iniciar atendimento do dia"
      className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold shadow-sm bg-[#104e35] text-white hover:bg-[#7FA830] focus:ring-2 focus:ring-[#104e35]/40"
      onPress={onAddAtendimento}
    >
      <Users className="h-4 w-4" />
      <span>Novo Atendimento</span>
    </Button>
  </div>
);

export function SidebarRecepcao({
  unidadeSelecionada,
  setUnidadeSelecionada,
  salaSelecionada,
  setSalaSelecionada,
  conectado,
  handleConectar,
  agendadosFiltrados,
  onLoading,
  setTicketSelecionado,
  onHandleModal,
  exameSelecionado,
  onHandleExameSelecionado,
  pscStatusElement,
  isReconnecting = false,
  pscAuthButtonElement,
  examesGrouped,
  isTelemedicinaModo = false,
  toggleTelemedicinaModo,
}: SidebarRecepcaoProps) {
  const pathname = usePathname();
  const isAtendimento = pathname?.includes("atendimento") ?? false;
  const { units } = useUnits(undefined, true);
  const [salaOpcoes, setSalaOpcoes] = useState<string[]>(SALAS_RECEPCAO);
  const unidadeOptions = useMemo(
    () =>
      isAtendimento
        ? UNIDADES_ATENDIMENTO
        : units.map((u) => u.nome),
    [isAtendimento, units],
  );

  const examesAtendimento = useMemo(() =>
    Object.keys(examesGrouped || {}).sort((a, b) => a.localeCompare(b, "pt-BR")),
  [examesGrouped]);

  /* Atualiza opções de sala baseadas na unidade selecionada + caminho */
  useEffect(() => {
    if (!pathname) return;

    const selectedUnit = units.find((u) => u.nome === unidadeSelecionada);

    setSalaOpcoes(
      isAtendimento
        ? (selectedUnit?.salas?.exames ?? SALAS_EXAMES)
        : (selectedUnit?.salas?.recepcao ?? SALAS_RECEPCAO),
    );
  }, [pathname, units, unidadeSelecionada]);

  const handleAddAtendimento = useCallback(() => {
    setTicketSelecionado(null);
    onHandleModal(true);
  }, [setTicketSelecionado, onHandleModal]);

  return (
    <aside
      aria-label="Painel lateral de filtros e controles"
      className="w-68 bg-white border-r border-gray-200 shadow-lg h-full overflow-y-auto transition-all relative"
      role="complementary"
    >
      <main className="p-4 pt-4">
        {/* Header */}
        <header className="mb-4">
          <h2 className="text-sm font-bold text-[#104e35] mb-3">Controles</h2>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[85px_minmax(0,1fr)] items-center gap-x-2">
              <span className="text-sm font-medium text-gray-700 text-left">
                Servidor:
              </span>
              <div className="justify-self-end flex items-center gap-2">
                {conectado && !onLoading && isReconnecting ? (
                  <>
                    <div className="w-2 h-2 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-amber-600">Reconectando...</span>
                  </>
                ) : conectado && !onLoading ? (
                  <>
                    <Wifi className="w-3 h-3 text-[#104e35]" />
                    <span className="text-sm text-[#104e35] font-semibold">Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-500" />
                    <span className="text-sm text-red-600">Desconectado</span>
                  </>
                )}
              </div>
            </div>

            {pscStatusElement && (
              <div className="grid grid-cols-[85px_minmax(0,1fr)] items-center gap-x-2">
                <span className="text-sm font-medium text-gray-700 text-left pt-1">
                  Assinatura:
                </span>
                <div className="justify-self-end flex items-center gap-2">
                  {pscStatusElement}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Botão Autenticar Assinatura - abaixo da seção Assinatura */}
        {pscAuthButtonElement && (
          <div className="mb-4 w-full px-5">
            {pscAuthButtonElement}
          </div>
        )}

        {/* Filtros */}
        <section className="space-y-2 mb-3">
          {/* Unidade */}
          <SelectField
            conectado={conectado}
            id="unidade"
            label="Unidade"
            options={[
              { label: "Selecione uma unidade", value: "" },
              ...(unidadeOptions.length > 0
                ? unidadeOptions.map((nome) => ({ label: nome, value: nome }))
                : []),
            ]}
            value={unidadeSelecionada}
            onChange={setUnidadeSelecionada}
          />

          {/* Sala */}
          <SelectField
            conectado={conectado}
            id="sala"
            label="Sala"
            options={[
              { label: "Selecione uma sala", value: "" },
              ...salaOpcoes.map((s) => ({ label: s, value: s })),
            ]}
            value={salaSelecionada}
            onChange={setSalaSelecionada}
          />

          {/* Exames - aparece só no atendimento */}
          {pathname && pathname.includes("atendimento") && (
            <SelectField
              conectado={conectado}
              id="exames"
              label="Exames"
              options={[
                { label: "Selecione um exame", value: "" },
                ...examesAtendimento.map((s) => ({ label: s, value: s })),
              ]}
              value={exameSelecionado}
              onChange={(value) => {
                console.log("Sidebar selecionou exame:", value);
                onHandleExameSelecionado(value);
              }}
            />
          )}
        </section>

        {/* Botão Conectar */}
        <div className="mb-3">
          <Button
            aria-pressed={conectado}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
              conectado
                ? "bg-white text-[#104e35] hover:bg-[#e8f4e3]"
                : "bg-[#104e35] text-white hover:bg-[#7FA830] hover:text-white"
            }`}
            disabled={onLoading}
            isLoading={onLoading}
            onPress={() => !onLoading && handleConectar()}
          >
            {onLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Conectando...
              </>
            ) : conectado ? (
              <>
                <WifiOff className="w-4 h-4" />
                Desconectar
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Conectar
              </>
            )}
          </Button>
        </div>

        {/* Botão Novo Atendimento - só na recepção */}
        {conectado && pathname?.includes("recepcao") && (
          <ActionButtonGroup onAddAtendimento={handleAddAtendimento} />
        )}

        {/* Botão Vídeochamada - só no atendimento */}
        {conectado && pathname?.includes("atendimento") && toggleTelemedicinaModo && (
          <div className="flex flex-col gap-1 mt-3 mb-3">
            <Button
              aria-label="Ativar Vídeochamada"
              className="flex w-full items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-[#e8f4e3] text-[#104e35] border border-[#104e35]/30 hover:bg-[#d4e8d0] focus:ring-2 focus:ring-[#104e35]/20"
              onPress={toggleTelemedicinaModo}
            >
              <Users className="h-4 w-4" />
              <span>{isTelemedicinaModo ? "Fechar Vídeochamada" : "Vídeochamada"}</span>
            </Button>
          </div>
        )}

        {/* Lista de Agendamentos */}
        {conectado && (
          <aside aria-label="Lista de agendamentos" className="mt-3">
            <AgendamentosList
              agendadosFiltrados={agendadosFiltrados}
              conectado={conectado}
              unidadeSelecionada={unidadeSelecionada}
            />
          </aside>
        )}

      </main>
    </aside>
  );
}
