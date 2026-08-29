import React from "react";
import { Card } from "@heroui/react";
import { Clock } from "lucide-react";
import { Socket } from "socket.io-client";

import SenhasSection from "./SenhasSection";

import { PreparationRequest, Ticket } from "@/lib/ticket/ticket";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";

// Interface para tipagem robusta
interface SenhasListProps {
  /** Lista ordenada de todas as senhas */
  senhasOrdenadas: Ticket[];
  /** Lista de senhas preferenciais */
  senhasPreferenciais: Ticket[];
  /** Lista de senhas agendadas (prefixo "C") */
  senhasAgendados: Ticket[];
  /** Lista de senhas com prefixo */
  senhasComPrefixo: Ticket[];
  /** Lista de senhas normais */
  senhasNormais: Ticket[];
  /** Lista de senhas com documentação finalizada */
  senhasPrepracao: Ticket[];
  /** Set ticket clicado */
  setTicketSelecionado: (ticket: Ticket | null) => void;
  /** Instância do socket */
  socket: Socket;
  /** Sala atualmente selecionada */
  salaSelecionada: string;
  /** Unidade atualmente selecionada */
  unidadeSelecionada: string;

  agendamentos: Scheduling[];

  onHandleModal: (state: Boolean) => void;

  onPreparationRequests: PreparationRequest[];

  preparacoesFinalizadas: PreparationRequest[];
}

// Componente para o estado vazio
const EmptyState: React.FC<{ buscaSenha?: string }> = ({ buscaSenha }) => (
  <Card
    aria-describedby="empty-senhas-description"
    className="bg-white rounded-lg border border-gray-200 shadow-md p-8 text-center
      transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    role="alertdialog"
  >
    <div className="text-gray-600">
      <Clock
        aria-hidden="true"
        className="h-12 w-12 mx-auto mb-4 text-gray-400"
      />
      <p className="text-lg font-semibold text-gray-900 mb-2">
        Nenhuma senha encontrada
      </p>
      <p className="text-sm">
        {buscaSenha
          ? "Tente uma busca diferente"
          : "Ajuste os filtros para ver mais resultados"}
      </p>
    </div>
  </Card>
);

// Componente principal
const SenhasList: React.FC<SenhasListProps> = ({
  senhasOrdenadas,
  senhasPreferenciais,
  senhasAgendados,
  senhasComPrefixo,
  senhasNormais,
  senhasPrepracao,
  setTicketSelecionado,
  socket,
  salaSelecionada,
  unidadeSelecionada,
  agendamentos,
  onHandleModal,
  onPreparationRequests,
  preparacoesFinalizadas,
}) => {
  if (senhasOrdenadas.length === 0) {
    return <EmptyState />;
  }

  return (
    <section
      aria-label="Lista de senhas organizadas por categoria"
      className="space-y-6 p-4 bg-gray-50 rounded-lg grid grid-cols-5 gap-4"
    >
      <SenhasSection
        agendamentos={agendamentos}
        emptyMessage="Nenhuma"
        preparacoesFinalizadas={preparacoesFinalizadas}
        salaSelecionada={salaSelecionada}
        senhas={senhasPreferenciais}
        setTicketSelecionado={setTicketSelecionado}
        socket={socket}
        title="Preferencial"
        unidadeSelecionada={unidadeSelecionada}
        onHandleModal={onHandleModal}
        onPreparationRequests={onPreparationRequests}
      />
      <SenhasSection
        agendamentos={agendamentos}
        emptyMessage="Nenhuma"
        preparacoesFinalizadas={preparacoesFinalizadas}
        salaSelecionada={salaSelecionada}
        senhas={senhasComPrefixo}
        setTicketSelecionado={setTicketSelecionado}
        socket={socket}
        title="Prioridade"
        unidadeSelecionada={unidadeSelecionada}
        onHandleModal={onHandleModal}
        onPreparationRequests={onPreparationRequests}
      />
      <SenhasSection
        agendamentos={agendamentos}
        emptyMessage="Nenhuma"
        preparacoesFinalizadas={preparacoesFinalizadas}
        salaSelecionada={salaSelecionada}
        senhas={senhasAgendados}
        setTicketSelecionado={setTicketSelecionado}
        socket={socket}
        title="Agendados"
        unidadeSelecionada={unidadeSelecionada}
        onHandleModal={onHandleModal}
        onPreparationRequests={onPreparationRequests}
      />
      <SenhasSection
        agendamentos={agendamentos}
        emptyMessage="Nenhuma"
        preparacoesFinalizadas={preparacoesFinalizadas}
        salaSelecionada={salaSelecionada}
        senhas={senhasNormais}
        setTicketSelecionado={setTicketSelecionado}
        socket={socket}
        title="Atendimento"
        unidadeSelecionada={unidadeSelecionada}
        onHandleModal={onHandleModal}
        onPreparationRequests={onPreparationRequests}
      />
      <SenhasSection
        agendamentos={agendamentos}
        emptyMessage="Nenhuma"
        preparacoesFinalizadas={preparacoesFinalizadas}
        salaSelecionada={salaSelecionada}
        senhas={senhasPrepracao}
        setTicketSelecionado={setTicketSelecionado}
        socket={socket}
        title="Em preparação"
        unidadeSelecionada={unidadeSelecionada}
        onHandleModal={onHandleModal}
        onPreparationRequests={onPreparationRequests}
      />
    </section>
  );
};

export default SenhasList;
