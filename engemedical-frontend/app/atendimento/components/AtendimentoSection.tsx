import type { ExamToogle } from "@/lib/exames/utils/exames-helper";

import React from "react";
import { Card, Badge } from "@heroui/react";
import { Socket } from "socket.io-client";
import { Users, AlertTriangle, ClipboardList } from "lucide-react";

import AtendimentoCard from "./AtendimentoCard";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface SenhasSectionProps {
  title: string;
  senhas: Scheduling[];
  emptyMessage: string;
  socket: Socket;
  salaSelecionada: string;
  codigosDeAtendimento: Set<string>;
  unidadeSelecionada: string;
  onHandleModal: (
    atendimento: Scheduling,
    modalType: "exams" | "ticket",
  ) => void;
  setFuncionarioSelecionado: (funcionario: Scheduling | null) => void;
  exameSelecionado: string;
  pendingActions: Record<
    number,
    {
      action: string;
      startedAt: number;
      phase: "pending" | "acknowledged" | "resync";
    }
  >;
  startPendingAction: (ticketId: number, action: string) => void;
  onIniciarAutenticacao?: (
    atendimento: Scheduling,
    metodo: "BIOMETRIA" | "FACIAL",
  ) => void;
  onIniciarTeleatendimento?: (atendimento: Scheduling) => void;
  onViewRelatorio?: (atendimento: Scheduling) => void;
  examesGrouped: Record<string, ExamToogle[]>;
}

// Helper para determinar ícone e cor baseado no tipo de seção
const getSectionStyle = (
  title: string,
): { icon: React.ReactNode; color: string; bgColor: string } => {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("preferencial")) {
    return {
      icon: <Users className="w-4 h-4" />,
      color: "text-warning",
      bgColor: "bg-warning-100",
    };
  }
  if (lowerTitle.includes("agendados")) {
    return {
      icon: <ClipboardList className="w-4 h-4" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    };
  }
  if (lowerTitle.includes("prioridade") || lowerTitle.includes("prefixo")) {
    return {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-primary",
      bgColor: "bg-primary-100",
    };
  }

  return {
    icon: <ClipboardList className="w-4 h-4" />,
    color: "text-success",
    bgColor: "bg-success-100",
  };
};

// Componente para o estado vazio - CORRIGIDO
const EmptySection: React.FC<{ title: string; emptyMessage: string }> = ({
  title,
  emptyMessage,
}) => {
  const sectionId = `section-${title.toLowerCase().replace(/\s/g, "-")}`;
  const style = getSectionStyle(title);

  return (
    <section aria-atomic="true" aria-labelledby={sectionId} aria-live="polite">
      {/* Título melhorado com estilo corporativo */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className={`${style.color}`}>{style.icon}</span>
        <h3 className="text-base font-semibold text-gray-700" id={sectionId}>
          {title.replace(/\(\d+\)$/, "").trim()}
        </h3>
        <Badge
          className={style.bgColor}
          color="default"
          size="sm"
          variant="flat"
        >
          {title.match(/\((\d+)\)$/)?.[1] || "0"}
        </Badge>
      </div>
      <Card
        aria-describedby={`${sectionId}-description`}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center"
        role="status"
      >
        <p className="text-sm text-gray-500" id={`${sectionId}-description`}>
          {emptyMessage}
        </p>
      </Card>
    </section>
  );
};

// Componente principal - CORRIGIDO
const AtendimentoSection: React.FC<SenhasSectionProps> = ({
  title,
  senhas,
  emptyMessage,
  socket,
  salaSelecionada,
  codigosDeAtendimento: _codigosDeAtendimento,
  unidadeSelecionada,
  onHandleModal,
  setFuncionarioSelecionado,
  exameSelecionado,
  pendingActions,
  startPendingAction,
  onIniciarAutenticacao,
  onIniciarTeleatendimento,
  onViewRelatorio,
  examesGrouped,
}) => {
  const sectionId = `section-${title.toLowerCase().replace(/\s/g, "-")}`;
  const style = getSectionStyle(title);

  if (senhas.length === 0) {
    return <EmptySection emptyMessage={emptyMessage} title={title} />;
  }

  return (
    <section
      aria-atomic="true"
      aria-labelledby={sectionId}
      aria-live="polite"
      className="space-y-4"
    >
      {/* Título melhorado com estilo corporativo */}
      <div className="flex items-center justify-center gap-2 pb-2 border-b border-gray-200">
        <span className={`${style.color}`}>{style.icon}</span>
        <h3 className="text-base font-semibold text-gray-800" id={sectionId}>
          {title.replace(/\(\d+\)$/, "").trim()}
        </h3>
        <Badge
          className={style.bgColor}
          color="default"
          size="sm"
          variant="solid"
        >
          {title.match(/\((\d+)\)$/)?.[1] || senhas.length}
        </Badge>
      </div>
      <div
        aria-label={`Lista de ${title.toLowerCase()}`}
        className="space-y-4"
        role="list"
      >
        {senhas.map((atendimento, index) => {
          // Verifica se o atendimento tem _id válido
          const hasValidId = atendimento._id && atendimento._id.toString();
          const key = hasValidId
            ? atendimento._id.toString()
            : `atendimento-${index}-${atendimento.CODIGOPRONTUARIO || ""}`;

          return (
            <div
              key={key}
              aria-label={`Atendimento de ${atendimento.NOME || "Paciente"}`}
              role="listitem"
            >
              <AtendimentoCard
                key={key}
                atendimento={atendimento}
                exameSelecionado={exameSelecionado}
                examesGrouped={examesGrouped}
                salaSelecionada={salaSelecionada}
                socket={socket}
                startPendingAction={startPendingAction}
                unidadeSelecionada={unidadeSelecionada}
                onHandleModal={onHandleModal}
                onIniciarAutenticacao={onIniciarAutenticacao}
                onIniciarTeleatendimento={onIniciarTeleatendimento}
                onViewRelatorio={onViewRelatorio}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AtendimentoSection;
