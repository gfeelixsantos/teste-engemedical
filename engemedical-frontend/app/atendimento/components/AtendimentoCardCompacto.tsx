import React, { useCallback } from "react";
import { Card, Progress, Chip, Tooltip } from "@heroui/react";
import { Clock, User, Ticket as Senha } from "lucide-react";
import { Socket } from "socket.io-client";

import { TicketActionType, TicketStatus } from "@/lib/ticket/ticket";
import {
  ExamRegister,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
import { ExamStatus } from "@/lib/scheduling/enum/scheduling.enum";
import { useSchedulingEntityManager } from "@/hooks/SchedulingEntityManager";

interface AtendimentoCardProps {
  atendimento: Scheduling;
  socket: Socket;
}

// Tema visual por status
const getStatusVisual = (status: string) => {
  switch (status) {
    case TicketStatus.AGUARDANDO:
      return { border: "border-l-4 border-l-green-500", bg: "bg-white" };
    case TicketStatus.EM_CHAMADA:
      return { border: "border-l-4 border-l-amber-500", bg: "bg-amber-50" };
    case TicketStatus.EM_ATENDIMENTO:
      return { border: "border-l-4 border-l-red-500", bg: "bg-red-50" };
    case TicketStatus.FINALIZADO:
      return { border: "border-l-4 border-l-gray-400", bg: "bg-gray-100" };
    default:
      return { border: "border-l-4 border-l-gray-300", bg: "bg-white" };
  }
};

// Cores do badge de status
const getStatusColorBackground = (status: string) => {
  switch (status) {
    case TicketStatus.AGUARDANDO:
      return "bg-green-100 text-green-800";
    case TicketStatus.EM_CHAMADA:
      return "bg-amber-100 text-amber-800";
    case TicketStatus.EM_ATENDIMENTO:
      return "bg-red-100 text-red-800";
    case TicketStatus.FINALIZADO:
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Progresso dos exames
const useExamProgress = (exames: ExamRegister[]) => {
  if (!exames || exames.length === 0)
    return { progress: 0, completed: 0, total: 0 };

  const completed = exames.filter(
    (exame) =>
      exame.status === ExamStatus.FINALIZADO ||
      exame.status === ExamStatus.AGUARDANDO_RESULTADO,
  ).length;

  const total = exames.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { progress, completed, total };
};

// Componente compacto
const AtendimentoCardCompacto: React.FC<AtendimentoCardProps> = ({
  atendimento,
  socket,
}) => {
  const { executarAtendimentoAcao } = useSchedulingEntityManager([]);
  const { border, bg } = getStatusVisual(atendimento.TICKET.status);
  const { progress, completed, total } = useExamProgress(
    atendimento.EXAMES || [],
  );

  const formatarTempoEspera = (emissao: string | Date) => {
    const dataEmissao = new Date(emissao);
    const agora = new Date();
    const diferencaMs = agora.getTime() - dataEmissao.getTime();
    const minutos = Math.floor(diferencaMs / 1000 / 60);
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    return horas > 0 ? `${horas}h ${minutosRestantes}m` : `${minutos}m`;
  };

  const forceReturn = useCallback(() => {
    executarAtendimentoAcao(
      atendimento._id,
      atendimento.TICKET.id,
      TicketActionType.RETORNAR,
      atendimento.UNIDADEATENDIMENTO,
      socket,
    );
  }, []);

  // Componente menor e focado (Single Responsibility)
  const ExamesTooltipContent = ({ exames }: { exames: ExamRegister[] }) => (
    <div className="flex flex-col gap-2 shadow-gray-200 p-2 rounded-md max-w-[560px]">
      {exames.map((ex) => (
        <div
          key={ex.codigoExame}
          className="grid grid-cols-2 gap-4 text-xs min-w-[150px]"
        >
          <span className="font-medium">{ex.nomeExame}</span>
          <span className="text-right opacity-80">{ex.status}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Card
      className={`${bg} ${border} rounded-lg p-3 mb-2 hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="space-y-2">
        {/* Header com nome e status */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {atendimento.NOME.toUpperCase()}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
              <span>{atendimento.TIPOEXAMENOME}</span>
            </div>
          </div>

          <Chip
            className={`${getStatusColorBackground(atendimento.TICKET.status)} text-xs text-center p-4`}
            size="sm"
            variant="flat"
          >
            <div>{atendimento.TICKET.status}</div>
            <div className="text-xs">{atendimento.TICKET.sala}</div>
          </Chip>
        </div>

        {/* Empresa e cargo */}
        <div className="text-xs text-gray-600">
          <div className="truncate">{atendimento.NOMEEMPRESA}</div>
        </div>

        {/* Progresso dos exames */}
        {total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <Tooltip
                content={<ExamesTooltipContent exames={atendimento.EXAMES} />}
                placement="bottom"
                size="sm"
              >
                <span>
                  Exames {completed} / {total}
                </span>
              </Tooltip>
              <span>{progress}%</span>
            </div>
            <Progress
              color={
                progress === 100
                  ? "success"
                  : progress >= 50
                    ? "primary"
                    : "warning"
              }
              size="sm"
              value={progress}
            />
          </div>
        )}

        {/* Footer com informações do ticket */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatarTempoEspera(atendimento.TICKET.emissao)}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-20">
                {atendimento.TICKET.profissional?.split(" ")[0] || "N/A"}
              </span>
              <span>{atendimento.TICKET.exame}</span>
            </div>

            <div className="flex items-center gap-1">
              <Senha className="h-3 w-3" />
              <span onClick={() => forceReturn()}>
                {Number(atendimento.TICKET.numero) < 0
                  ? "N/A"
                  : atendimento.TICKET.prefixo + atendimento.TICKET.numero}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default React.memo(AtendimentoCardCompacto);
