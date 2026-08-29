import React from "react";
import { Card } from "@heroui/react";
import { Socket } from "socket.io-client";
import { AlertCircle, Zap, Users, Clock } from "lucide-react";

import SenhaCard from "./SenhaCard";

import { PreparationRequest, Ticket } from "@/lib/ticket/ticket";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { EventType } from "@/lib/websocket/events/events";

// Mapeamento de ícones por título
const getSectionConfig = (title: string) => {
  const configs: Record<
    string,
    { icon: React.ReactNode; color: string; bgColor: string }
  > = {
    Preferencial: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    Agendados: {
      icon: <Clock className="w-5 h-5" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    Prioridade: {
      icon: <Zap className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    Atendimento: {
      icon: <Users className="w-5 h-5" />,
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    },
    "Em preparação": {
      icon: <Clock className="w-5 h-5" />,
      color: "text-gray-500",
      bgColor: "bg-gray-100",
    },
  };

  return (
    configs[title] || {
      icon: null,
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    }
  );
};

// Componente de badge de contador
const CountBadge = ({
  count,
  textColor,
}: {
  count: number;
  textColor: string;
}) => (
  <span
    className={`inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full ${textColor} text-sm font-bold`}
  >
    {count}
  </span>
);

// Interface para tipagem robusta
interface SenhasSectionProps {
  /** Título da seção (ex: "Senhas Preferenciais") */
  title: string;
  /** Lista de tickets (senhas) a serem exibidos */
  senhas: Ticket[];
  /** Mensagem exibida quando a lista está vazia */
  emptyMessage: string;
  // /** ID do dropdown aberto (se houver) */
  // dropdownAguardarAberto: string | null;
  // /** Callback para definir o dropdown aberto */
  // setDropdownAguardarAberto: (value: string | null) => void;
  /** Instância do socket */
  socket: Socket;
  /** Sala atualmente selecionada */
  salaSelecionada: string;
  /** Unidade atualmente selecionada */
  unidadeSelecionada: string;

  agendamentos: Scheduling[];
  onHandleModal: (state: Boolean) => void;
  setTicketSelecionado: (ticket: Ticket | null) => void;
  onPreparationRequests: PreparationRequest[];
  preparacoesFinalizadas: PreparationRequest[];
}

// Componente para o estado vazio
const EmptySection: React.FC<{
  title: string;
  emptyMessage: string;
  count: number;
}> = ({ title, emptyMessage, count }) => {
  const config = getSectionConfig(title);

  return (
    <section
      aria-labelledby={`section-${title.toLowerCase().replace(/\s/g, "-")}`}
      className="scroll-mt-6"
      id={`ticket-group-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <h3
          className={`text-base font-semibold ${config.color}`}
          id={`section-${title.toLowerCase().replace(/\s/g, "-")}`}
        >
          {title}
        </h3>
        <CountBadge count={count} textColor={config.color} />
      </div>
      <Card
        aria-describedby="empty-section-description"
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center"
        role="alert"
      >
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </Card>
    </section>
  );
};

// Componente principal
const SenhasSection: React.FC<SenhasSectionProps> = ({
  title,
  senhas,
  emptyMessage,
  socket,
  salaSelecionada,
  unidadeSelecionada,
  agendamentos,
  onHandleModal,
  setTicketSelecionado,
  onPreparationRequests,
  preparacoesFinalizadas,
}) => {
  const onDeleteTicketNumber = async (id: number) => {
    const confirmResponse = confirm("Deseja excluir o ticket?");

    if (confirmResponse) {
      socket.emit(EventType.TICKET_DELETE, {
        ticketId: id,
        unidade: unidadeSelecionada,
      });
    }
  };

  if (senhas.length === 0) {
    return <EmptySection count={0} emptyMessage={emptyMessage} title={title} />;
  }

  const config = getSectionConfig(title);

  return (
    <section
      aria-labelledby={`section-${title.toLowerCase().replace(/\s/g, "-")}`}
      className="space-y-3 scroll-mt-6"
      id={`ticket-group-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-3">
        <h3
          className={`text-base font-semibold ${config.color}`}
          id={`section-${title.toLowerCase().replace(/\s/g, "-")}`}
        >
          {title}
        </h3>
        <CountBadge count={senhas.length} textColor={config.color} />
      </div>
      <div className="space-y-4">
        {senhas.map((senha) => (
          <SenhaCard
            key={senha.id?.toString()}
            agendamentos={agendamentos}
            preparacoesFinalizadas={preparacoesFinalizadas}
            salaSelecionada={salaSelecionada}
            setTicketSelecionado={setTicketSelecionado}
            socket={socket}
            ticket={senha}
            unidadeSelecionada={unidadeSelecionada}
            onDeleteTicketNumber={onDeleteTicketNumber}
            onHandleModal={onHandleModal}
            onPreparationRequests={onPreparationRequests}
          />
        ))}
      </div>
    </section>
  );
};

export default SenhasSection;
