import type { ExamToogle } from "@/lib/exames/utils/exames-helper";

import React, { useState, useMemo } from "react";
import {
  Card,
  Button,
  Spinner,
  Tooltip,
  Badge,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@heroui/react";
import {
  Clock,
  FileText,
  Phone,
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  FilePlus,
  ChevronDown,
  ChevronUp,
  Pin,
  Ticket as Senha,
  Eye,
  Paperclip,
  Fingerprint,
  Camera,
  Globe,
} from "lucide-react";
import { Socket } from "socket.io-client";

import { buildViewerUrl, buildDocFilename } from "@/lib/blob/blob-proxy";
import { FALLBACK_EXAMES_GROUPED } from "@/lib/exames/utils/fallback-exames";
import { getCurrentUser } from "@/lib/utils";
import { Ticket, TicketActionType, TicketStatus } from "@/lib/ticket/ticket";
import {
  Scheduling,
  ExamRegister,
} from "@/lib/scheduling/interface/scheduling";
import { belongsToOtherOperationalContext } from "@/lib/atendimento/operational-context";
import { ExamStatus } from "@/lib/scheduling/enum/scheduling.enum";
import { useSchedulingEntityManager } from "@/hooks/SchedulingEntityManager";

interface AtendimentoCardProps {
  atendimento: Scheduling;
  exameSelecionado: string;
  salaSelecionada: string;
  unidadeSelecionada: string;
  socket: Socket;
  onHandleModal: (
    atendimento: Scheduling,
    modalType: "exams" | "ticket",
  ) => void;
  startPendingAction: (ticketId: number, action: string) => void;
  onIniciarTeleatendimento?: (atendimento: Scheduling) => void;
  onIniciarAutenticacao?: (
    atendimento: Scheduling,
    metodo: "BIOMETRIA" | "FACIAL",
  ) => void;
  onViewRelatorio?: (atendimento: Scheduling) => void;
  examesGrouped: Record<string, ExamToogle[]>;
}

// Hook para cálculo de progresso dos exames (memorizado para performance)
const useExamProgress = (exames: ExamRegister[]) => {
  return useMemo(() => {
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
  }, [exames]);
};

// Função para calcular idade a partir da data de nascimento
const calcularIdade = (dataNascimento: string | null): string => {
  if (!dataNascimento) return "";

  // Verifica se está no formato DD/MM/YYYY
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataNascimento)) {
    return "";
  }

  const [dia, mes, ano] = dataNascimento.split("/").map(Number);

  // Validação de números (dia 1-31, mês 1-12, ano > 1900)
  if (!dia || !mes || !ano || ano < 1900 || mes > 12 || dia > 31) {
    return "";
  }

  // Cria a data de nascimento como Date JS
  const nascimento = new Date(ano, mes - 1, dia);

  if (isNaN(nascimento.getTime())) return "";

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();

  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const mesNasc = nascimento.getMonth();
  const diaNasc = nascimento.getDate();

  // Ajusta caso não tenha feito aniversário ainda
  if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) {
    idade--;
  }

  // Proteção final
  if (idade < 0 || isNaN(idade)) return "";

  return `${idade} anos`;
};

// Função para determinar a cor do avatar baseado no ticket
const getAvatarColor = (ticket: Ticket): string => {
  if (ticket.preferencial) {
    return "bg-gradient-to-br from-red-500 to-red-600"; // Vermelho para preferencial
  } else if (ticket.prefixo?.trim().toUpperCase() === "C") {
    return "bg-gradient-to-br from-orange-500 to-orange-600"; // Laranja para prefixo C (Agendados)
  } else if (ticket.prefixo && ticket.prefixo.trim() !== "") {
    return "bg-gradient-to-br from-blue-500 to-blue-600"; // Azul para outros prefixos (Prioridade)
  } else {
    return "bg-gradient-to-br from-green-500 to-green-600"; // Verde para normal
  }
};

// Função para determinar a cor do texto do avatar
const getAvatarTextColor = (_ticket: Ticket): string => {
  return "text-white"; // Texto branco para todos os casos (bom contraste)
};

// Função para formatar o número do ticket para o avatar
const getTicketNumberForAvatar = (ticket: Ticket): string => {
  if (Number(ticket.numero) < 0) {
    return "N/A";
  }

  if (ticket.prefixo && ticket.prefixo.trim() !== "") {
    return `${ticket.prefixo}${ticket.numero}`;
  }

  return ticket.numero.toString();
};

// Componente para o avatar do funcionário
const EmployeeAvatar: React.FC<{ atendimento: Scheduling }> = ({
  atendimento,
}) => {
  const avatarColor = getAvatarColor(atendimento.TICKET);
  const textColor = getAvatarTextColor(atendimento.TICKET);
  const ticketNumber = getTicketNumberForAvatar(atendimento.TICKET);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex-shrink-0 w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center font-semibold text-xs ${textColor}`}
      >
        <span className="text-lg">{ticketNumber}</span>
      </div>
      <div>
        {atendimento.TICKET.preferencial && atendimento.TICKET.preferencialTipo && (
          <div className={`text-xs text-red-600 font-bold`}>
            {atendimento.TICKET.preferencialTipo}
          </div>
        )}
      </div>
    </div>
  );
};

type BiometriaStatusType = NonNullable<
  NonNullable<Scheduling["ASOINFO"]>["BIOMETRIA"]
>["status"];

const BiometriaIndicator = ({ status }: { status: BiometriaStatusType }) => {
  const configs = {
    nao_cadastrado: {
      color: "text-gray-400",
      bg: "bg-gray-100",
      label: "Biometria não cadastrada",
      icon: <Fingerprint className="h-3 w-3" />,
    },
    cadastrado: {
      color: "text-blue-600",
      bg: "bg-blue-50",
      label: "Biometria cadastrada",
      icon: <Fingerprint className="h-3 w-3" />,
    },
    validado_hoje: {
      color: "text-green-600",
      bg: "bg-green-50",
      label: "Biometria validada hoje",
      icon: <Fingerprint className="h-3 w-3" />,
    },
    falha_validacao: {
      color: "text-red-600",
      bg: "bg-red-50",
      label: "Falha na validação",
      icon: <Fingerprint className="h-3 w-3" />,
    },
  };

  const config = configs[status] || configs.nao_cadastrado;

  return (
    <Tooltip color="foreground" content={config.label} placement="top">
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.color} border border-current/20`}
      >
        {config.icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {status === "nao_cadastrado" ? "NÃO CAD" : status.replace("_", " ")}
        </span>
      </div>
    </Tooltip>
  );
};

// Componente para informações do funcionário - AJUSTADO
const EmployeeInfo: React.FC<{ atendimento: Scheduling }> = ({
  atendimento,
}) => {
  const idade = calcularIdade(atendimento.DATANASCIMENTO);

  return (
    <div className="flex-1 flex items-start gap-3 min-w-0">
      <EmployeeAvatar atendimento={atendimento} />

      <div className="flex-1 min-w-0 overflow-hidden">
        <h3
          className="font-semibold text-gray-900 truncate text-md"
          title={atendimento.NOME}
        >
          {atendimento.NOME.toUpperCase()}
        </h3>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
          {atendimento.TIPOEXAMENOME && (
            <div className="flex items-center gap-1">
              <span>{atendimento.TIPOEXAMENOME}:</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="truncate" title={atendimento.NOMECARGO}>
              {atendimento.NOMECARGO}
            </span>
          </div>

          {idade && (
            <div className="flex items-center gap-1">
              <span title={atendimento.DATANASCIMENTO ?? ""}>
                {" "}
                - {!idade.includes("NaN") ? idade : ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600 overflow-hidden mt-1">
          <span
            className="truncate block max-w-full"
            title={atendimento.NOMEEMPRESA}
          >
            {atendimento.NOMEEMPRESA}
          </span>
        </div>
      </div>
    </div>
  );
};

// Componente para a barra de progresso dos exames
const ExamProgress: React.FC<{ exames: ExamRegister[] }> = ({ exames }) => {
  const { progress, completed, total } = useExamProgress(exames);

  if (!exames || exames.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span>Nenhum exame agendado</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <span>Exames:</span>
          <span className="text-xs text-gray-500">
            {total - completed} restantes
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {completed}/{total} concluídos <span>{progress}% </span>
        </span>
      </div>

      <Progress
        className="w-full"
        color={
          progress === 100 ? "success" : progress >= 50 ? "primary" : "warning"
        }
        size="sm"
        value={progress}
      />
    </div>
  );
};

// Função para buscar o nome do exame baseado no código
const getExamNameByCode = (
  codigoExame: string,
  examesGrouped?: Record<string, ExamToogle[]>,
): string => {
  const examGroups = examesGrouped ?? FALLBACK_EXAMES_GROUPED;

  for (const [categoriaName, exames] of Object.entries(examGroups)) {
    for (const exame of exames) {
      if (exame.codigos.includes(codigoExame)) {
        return exame.nome || categoriaName;
      }
    }
  }

  for (const [categoriaName, exames] of Object.entries(
    FALLBACK_EXAMES_GROUPED,
  )) {
    for (const exame of exames) {
      if (exame.codigos.includes(codigoExame)) {
        return exame.nome || categoriaName;
      }
    }
  }

  return codigoExame;
};

// Função para formatar apenas o horário do exame
const formatExamTime = (dateString: string | null): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const shouldShowCompletedTime = (exame: ExamRegister): boolean => {
  return (
    !!exame.dataExame &&
    (exame.status === ExamStatus.FINALIZADO ||
      exame.status === ExamStatus.AGUARDANDO_RESULTADO)
  );
};

// Função para obter a cor do status
const getStatusColor = (status: string) => {
  switch (status) {
    case "AGENDADO":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "REALIZADO":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      };
    case "EM ANDAMENTO":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      };
    case "CANCELADO":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      };
    case "FINALIZADO":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      };
    case "PENDENTE":
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      };
  }
};

// Hook para ordenar exames alfabeticamente
const useSortedExams = (
  exames: ExamRegister[],
  examesGrouped?: Record<string, ExamToogle[]>,
) => {
  return useMemo(() => {
    if (!exames || exames.length === 0) return [];

    return [...exames].sort((a, b) => {
      const nameA =
        getExamNameByCode(a.codigoExame, examesGrouped) ||
        a.nomeExame ||
        a.grupo ||
        a.codigoExame;
      const nameB =
        getExamNameByCode(b.codigoExame, examesGrouped) ||
        b.nomeExame ||
        b.grupo ||
        b.codigoExame;

      return nameA.toLowerCase().localeCompare(nameB.toLowerCase(), "pt-BR");
    });
  }, [exames, examesGrouped]);
};

// Componente para detalhes dos exames em tabela
const ExamDetails: React.FC<{
  exames: ExamRegister[];
  examesGrouped?: Record<string, ExamToogle[]>;
  employeeNome?: string;
}> = ({ exames, examesGrouped, employeeNome }) => {
  const sortedExams = useSortedExams(exames, examesGrouped);

  const formatDateCompact = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("pt-BR");
    } catch {
      return "";
    }
  };

  const handleViewResult = (url: string | undefined, exame?: ExamRegister) => {
    if (!url) return;
    const displayName =
      exame && employeeNome
        ? buildDocFilename([
            "CMSO_RESULTADO",
            exame.nomeExame || exame.codigoExame || "EXAME",
            employeeNome,
            formatDateCompact(exame.dataExame),
          ])
        : undefined;
    const viewerUrl = buildViewerUrl(url, displayName);

    if (viewerUrl) {
      window.open(viewerUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-3">
      {/* Tabela para desktop */}
      <div className="hidden lg:block">
        <Table
          removeWrapper
          aria-label="Tabela de exames"
          classNames={{
            base: "max-h-none",
            table: "min-w-full",
            th: "bg-gray-50 text-gray-700 font-semibold text-xs uppercase border-b py-2 px-3",
            td: "border-b border-gray-100 py-2 px-3",
          }}
        >
          <TableHeader>
            <TableColumn className="text-left">Exame</TableColumn>
            <TableColumn className="text-center">Status</TableColumn>
            <TableColumn className="text-center">Profissional</TableColumn>
            <TableColumn className="text-center">Sala</TableColumn>
            <TableColumn className="text-center">Finalizado</TableColumn>
            <TableColumn className="text-center">Resultado</TableColumn>
          </TableHeader>
          <TableBody>
            {sortedExams.map((exame, index) => {
              const examName =
                getExamNameByCode(exame.codigoExame, examesGrouped) ||
                exame.nomeExame ||
                exame.grupo ||
                exame.codigoExame;
              const formattedTime = shouldShowCompletedTime(exame)
                ? formatExamTime(exame.dataExame ?? null)
                : "";

              return (
                <TableRow
                  key={exame.codigoExame || index.toString()}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs text-gray-900">
                        {examName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <span className="font-medium text-xs text-gray-900 text-center">
                        {exame.status?.replace(/_/g, " ") ?? "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-xs text-gray-700 text-left">
                        {exame.profissional?.split(" ")[0] || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-left whitespace-nowrap">
                      <span className="text-xs text-gray-700">
                        {exame.sala || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {formattedTime ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <span className="text-xs">{formattedTime}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {exame.url ? (
                        <Tooltip
                          color="foreground"
                          content="Visualizar resultado"
                          placement="top"
                        >
                          <Button
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 min-w-20"
                            size="sm"
                            startContent={<Eye className="h-3 w-3" />}
                            variant="light"
                            onPress={() => handleViewResult(exame.url, exame)}
                          >
                            Ver
                          </Button>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Versão mobile responsiva */}
      <div className="lg:hidden space-y-2">
        {sortedExams.map((exame, index) => {
          const statusColors = getStatusColor(exame.status ?? "");
          const examName =
            getExamNameByCode(exame.codigoExame, examesGrouped) ||
            exame.nomeExame ||
            exame.grupo ||
            exame.codigoExame;
          const formattedTime = shouldShowCompletedTime(exame)
            ? formatExamTime(exame.dataExame ?? null)
            : "";

          return (
            <div
              key={exame.codigoExame || index.toString()}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <span className="font-semibold text-gray-900">
                    {examName}
                  </span>
                </div>
                <div className="col-span-2">
                  <Badge
                    className={`${statusColors.bg} ${statusColors.text} border-0 text-xs font-medium`}
                    size="sm"
                    variant="flat"
                  >
                    {exame.status ?? "-"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-xs">
                    {exame.profissional || "Não atribuído"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <span className="text-xs">
                    {exame.sala || "Não definida"}
                  </span>
                </div>
                {formattedTime && (
                  <div className="col-span-2 flex items-center gap-1 pt-1 border-t border-gray-200 mt-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {formattedTime}
                    </span>
                  </div>
                )}
                <div className="col-span-2 flex justify-center pt-2">
                  {exame.url ? (
                    <Button
                      className="text-blue-600 hover:text-blue-800"
                      size="sm"
                      startContent={<Eye className="h-3 w-3" />}
                      variant="light"
                      onPress={() => handleViewResult(exame.url, exame)}
                    >
                      Ver Resultado
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Resultado indisponível
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Componente para anexos do atendimento
const Anexos: React.FC<{ anexos: any[]; employeeNome?: string }> = ({
  anexos,
  employeeNome,
}) => {
  if (!anexos || anexos.length === 0) return null;

  const handleOpenAnexo = (url: string, nome: string) => {
    const ext = nome.match(/\.[^.]+$/)?.[0] || ".pdf";
    const base = nome.replace(/\.[^.]+$/, "");
    const displayName = employeeNome
      ? buildDocFilename(["CMSO_ANEXO", employeeNome, base], ext)
      : buildDocFilename(["CMSO_ANEXO", base], ext);
    const viewerUrl = buildViewerUrl(url, displayName);

    if (viewerUrl) {
      window.open(viewerUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {anexos.map((anexo, index) => (
        <Chip
          key={`${anexo.Name}-${index}`}
          className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-300 text-xs hover:cursor-pointer"
          color="warning"
          size="sm"
          variant="dot"
          onClick={() => handleOpenAnexo(anexo.StoragePath, anexo.Name)}
        >
          <span className="text-xs max-w-20 truncate">{anexo.Name}</span>
        </Chip>
      ))}
    </div>
  );
};

// Componente para observações e anotações (sempre visível)
const Observations: React.FC<{ atendimento: Scheduling }> = ({
  atendimento,
}) => {
  const hasObservations = atendimento.ANOTACOES || atendimento.OBSERVACOES;

  if (!hasObservations) return null;

  return (
    <div className="space-y-2">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="space-y-2 text-xs text-gray-700">
          {atendimento.ANOTACOES && (
            <div>
              <span className="font-medium block text-xs text-yellow-800 mb-1">
                Anotações internas:
              </span>
              <p className="text-xs whitespace-pre-line">
                {atendimento.ANOTACOES}
              </p>
            </div>
          )}
          {atendimento.OBSERVACOES && (
            <div>
              <span className="font-medium block text-xs text-yellow-800 mb-1">
                Observações cliente:
              </span>
              <p className="text-xs whitespace-pre-line">
                {atendimento.OBSERVACOES}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Tema visual por status (baseado no SenhaCard)
const getStatusVisual = (status: string) => {
  switch (status) {
    case TicketStatus.AGUARDANDO:
      return {
        cardBg: "bg-white",
        border: "border-2 border-green-500",
        hoverBg: "hover:bg-green-50",
        textColor: "text-gray-900",
        pillBg: "bg-green-500 text-white",
      };
    case TicketStatus.EM_CHAMADA:
      return {
        cardBg: "bg-amber-50",
        border: "border-2 border-amber-500",
        hoverBg: "hover:bg-amber-100",
        textColor: "text-gray-900",
        pillBg: "bg-amber-500 text-white",
      };
    case TicketStatus.EM_ATENDIMENTO:
      return {
        cardBg: "bg-red-50",
        border: "border-2 border-red-500",
        hoverBg: "hover:bg-red-100",
        textColor: "text-gray-900",
        pillBg: "bg-red-500 text-white",
      };
    case TicketStatus.EM_PREPARACAO:
    case TicketStatus.ENCAMINHADO_RX:
      return {
        cardBg: "bg-blue-100",
        border: "border-2 border-blue-400",
        hoverBg: "hover:bg-blue-200",
        textColor: "text-blue-500",
        pillBg: "bg-blue-400 text-white",
      };
    case TicketStatus.FINALIZADO:
      return {
        cardBg: "bg-gray-100",
        border: "border-2 border-gray-400",
        hoverBg: "hover:bg-gray-200",
        textColor: "text-gray-500",
        pillBg: "bg-gray-400 text-white",
      };
    default:
      return {
        cardBg: "bg-white",
        border: "border-2 border-gray-200",
        hoverBg: "hover:bg-gray-100",
        textColor: "text-gray-900",
        pillBg: "bg-gray-300 text-gray-700",
      };
  }
};

// Badge de status com spinner para estados ativos
const StatusBadge: React.FC<{ status: string; pillBg: string }> = ({
  status,
  pillBg,
}) => {
  return (
    <div
      className={`flex items-center gap-1 px-3 py-1 rounded-full ${pillBg} shadow-sm`}
    >
      {(status === TicketStatus.EM_PREPARACAO ||
        status === TicketStatus.ENCAMINHADO_RX ||
        status === TicketStatus.EM_CHAMADA ||
        status === TicketStatus.EM_ATENDIMENTO) && (
        <Spinner className="mr-1" color="white" size="sm" variant="simple" />
      )}
      <span className="text-xs font-semibold uppercase truncate">{status}</span>
    </div>
  );
};

// Componente para as ações do ticket
const TicketActions: React.FC<{
  ticket: Ticket;
  salaSelecionada: string;
  unidadeSelecionada: string;
  socket: Socket;
  atendimento: Scheduling;
  onHandleModal: (
    atendimento: Scheduling,
    modalType: "exams" | "ticket",
  ) => void;
  exameSelecionado: string;
  startPendingAction: (ticketId: number, action: string) => void;
  onIniciarAutenticacao?: (
    atendimento: Scheduling,
    metodo: "BIOMETRIA" | "FACIAL",
  ) => void;
  onViewRelatorio?: (atendimento: Scheduling) => void;
}> = ({
  ticket,
  salaSelecionada,
  unidadeSelecionada,
  socket,
  atendimento,
  onHandleModal,
  exameSelecionado,
  startPendingAction,
  onIniciarAutenticacao,
  onViewRelatorio,
}) => {
  const { executarAtendimentoAcao } = useSchedulingEntityManager([]);
  const [firstClickMap, setFirstClickMap] = useState<Record<number, boolean>>(
    {},
  );

  const handleExecutarAcao = (
    atendimento: Scheduling,
    action: TicketActionType,
  ) => {
    const currentUser = getCurrentUser();

    startPendingAction(ticket.id, action);
    executarAtendimentoAcao(
      atendimento._id,
      ticket.id,
      action,
      unidadeSelecionada,
      socket,
      salaSelecionada,
      exameSelecionado,
      currentUser?.nome,
      atendimento.NOME,
    );
  };

  const handleAtender = (
    ticket: Ticket,
    action: TicketActionType,
    funcionario: Scheduling,
  ) => {
    const currentUser = getCurrentUser();

    if (
      ticket.status === TicketStatus.EM_ATENDIMENTO &&
      firstClickMap[ticket.id]
    ) {
      onHandleModal(funcionario, "exams");
      setFirstClickMap((prev) => {
        const updated = { ...prev };

        delete updated[ticket.id];

        return updated;
      });

      return;
    }

    startPendingAction(ticket.id, action);
    if (
      !firstClickMap[ticket.id] ||
      ticket.status !== TicketStatus.EM_ATENDIMENTO
    ) {
      executarAtendimentoAcao(
        atendimento._id,
        ticket.id,
        action,
        unidadeSelecionada,
        socket,
        salaSelecionada,
        exameSelecionado,
        currentUser?.nome,
      );
      setFirstClickMap((prev) => ({ ...prev, [ticket.id]: true }));
    }
  };

  const handleRetornar = (
    atendimento: Scheduling,
    action: TicketActionType,
  ) => {
    setFirstClickMap((prev) => {
      const updated = { ...prev };

      delete updated[ticket.id];

      return updated;
    });
    startPendingAction(ticket.id, action);

    return executarAtendimentoAcao(
      atendimento._id,
      ticket.id,
      action,
      unidadeSelecionada,
      socket,
    );
  };

  const handleDisabledStatus = (ticket: Ticket) => {
    const currentUser = getCurrentUser();

    if (ticket.status === TicketStatus.FINALIZADO) return true;

    return belongsToOtherOperationalContext(ticket, {
      sala: salaSelecionada,
      profissional: currentUser?.nome,
    });
  };

  const isDisabled = handleDisabledStatus(ticket);
  const authInfo = atendimento.AUTENTICACAOATENDIMENTO;
  const isAuthenticated = authInfo?.status === "VALIDADO";

  return (
    <div
      aria-label="Ações do ticket"
      className="flex items-center gap-2"
      role="group"
    >
      <Tooltip color="foreground" content="Chamar" placement="bottom">
        <Button
          isIconOnly
          aria-label="Chamar paciente"
          className="min-w-8 h-8 bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition-all disabled:bg-gray-300 disabled:opacity-50"
          disabled={isDisabled}
          size="md"
          onPress={() =>
            handleExecutarAcao(atendimento, TicketActionType.CHAMAR)
          }
        >
          <Phone className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Tooltip color="foreground" content="Atender" placement="bottom">
        <Button
          isIconOnly
          aria-label="Atender paciente"
          className="min-w-8 h-8 bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all disabled:bg-gray-300 disabled:opacity-50"
          disabled={isDisabled}
          size="md"
          onPress={() =>
            handleAtender(ticket, TicketActionType.ATENDER, atendimento)
          }
        >
          <FilePlus className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Tooltip color="foreground" content="Retornar" placement="bottom">
        <Button
          isIconOnly
          aria-label="Retornar paciente à fila"
          className="min-w-8 h-8 bg-gray-500 hover:bg-gray-600 text-white shadow-lg transition-all disabled:bg-gray-300 disabled:opacity-50"
          disabled={isDisabled}
          size="md"
          onPress={() => handleRetornar(atendimento, TicketActionType.RETORNAR)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Tooltip>
      {/* Dropdown Ferramentas temporariamente comentado
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button
            isIconOnly
            aria-label="Ferramentas"
            title="Ferramentas"
            className="min-w-8 h-8 bg-sky-400 hover:bg-sky-500 text-white shadow-lg transition-all"
            isDisabled={isDisabled}
            size="md"
          >
            <Wrench className="h-4 w-4" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Ferramentas do atendimento"
          onAction={(key) => {
            if (key === "RELATORIO") {
              onViewRelatorio?.(atendimento);
              return;
            }
            onIniciarAutenticacao?.(
              atendimento,
              key as "BIOMETRIA" | "FACIAL",
            );
          }}
          disabledKeys={isAuthenticated ? ["BIOMETRIA", "FACIAL"] : []}
        >
          <DropdownItem
            key="RELATORIO"
            description="Ver atendimento completo"
            startContent={<FileText className="h-4 w-4" />}
          >
            Atendimento
          </DropdownItem>
          <DropdownItem
            key="BIOMETRIA"
            description={
              isAuthenticated
                ? "Autenticação já realizada"
                : "Captura pelo leitor biométrico"
            }
            startContent={<Fingerprint className="h-4 w-4" />}
          >
            Biometria
          </DropdownItem>
          <DropdownItem
            key="FACIAL"
            description={
              isAuthenticated
                ? "Autenticação já realizada"
                : "Abrir captura facial do funcionário"
            }
            startContent={<Camera className="h-4 w-4" />}
          >
            Facial
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
      */}
    </div>
  );
};

const AtendimentoCard = ({
  atendimento,
  exameSelecionado,
  unidadeSelecionada,
  salaSelecionada,
  socket,
  onHandleModal,
  startPendingAction,
  onIniciarAutenticacao,
  onViewRelatorio,
  examesGrouped,
}: AtendimentoCardProps) => {
  const [showExamDetails, setShowExamDetails] = useState(false);
  const { cardBg, border, hoverBg, textColor, pillBg } = getStatusVisual(
    atendimento.TICKET?.status,
  );
  const authInfo = atendimento.AUTENTICACAOATENDIMENTO;
  const isAuthenticated =
    authInfo?.status === "VALIDADO" || authInfo?.metodo === "SOC";
  const authDescriptor = !authInfo?.metodo
    ? null
    : authInfo.metodo === "SOC"
      ? {
          label: "SOC",
          icon: <Globe aria-hidden="true" className="h-4 w-4 text-gray-400" />,
        }
      : authInfo.metodo === "BIOMETRIA" && authInfo.status === "VALIDADO"
        ? {
            label: "Biometria",
            icon: (
              <Fingerprint
                aria-hidden="true"
                className="h-4 w-4 text-gray-400"
              />
            ),
          }
        : authInfo.metodo === "FACIAL" && authInfo.status === "VALIDADO"
          ? {
              label: "Facial",
              icon: (
                <Camera aria-hidden="true" className="h-4 w-4 text-gray-400" />
              ),
            }
          : null;

  const formatarTempoEspera = (emissao: string | Date) => {
    const dataEmissao = new Date(emissao);
    const agora = new Date();
    const diferencaMs = agora.getTime() - dataEmissao.getTime();
    const minutos = Math.floor(diferencaMs / 1000 / 60);
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    return horas > 0 ? `${horas}h ${minutosRestantes}m` : `${minutos}m`;
  };

  return (
    <Card
      aria-label={`Atendimento de ${atendimento.NOME}`}
      className={`${cardBg} ${border} ${hoverBg} rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-4`}
      role="article"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <EmployeeInfo atendimento={atendimento} />

          <div className="flex flex-col gap-2 flex-shrink-0 ml-2 items-end">
            <StatusBadge pillBg={pillBg} status={atendimento.TICKET?.status} />
            <TicketActions
              atendimento={atendimento}
              exameSelecionado={exameSelecionado}
              salaSelecionada={salaSelecionada}
              socket={socket}
              startPendingAction={startPendingAction}
              ticket={atendimento.TICKET}
              unidadeSelecionada={unidadeSelecionada}
              onHandleModal={onHandleModal}
              onIniciarAutenticacao={onIniciarAutenticacao}
              onViewRelatorio={onViewRelatorio}
            />
          </div>
        </div>

        <Observations atendimento={atendimento} />

        {atendimento.EXAMES && atendimento.EXAMES.length > 0 && (
          <Button
            aria-expanded={showExamDetails}
            aria-label={`${showExamDetails ? "Ocultar" : "Mostrar"} detalhes dos exames`}
            className="w-full text-xs"
            color="success"
            endContent={
              showExamDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )
            }
            size="lg"
            variant="light"
            onPress={() => setShowExamDetails(!showExamDetails)}
          >
            <ExamProgress exames={atendimento.EXAMES} />
          </Button>
        )}

        {showExamDetails && (
          <ExamDetails
            employeeNome={atendimento.NOME}
            exames={atendimento.EXAMES}
            examesGrouped={examesGrouped}
          />
        )}

        <div
          aria-label="Informações adicionais do atendimento"
          className="space-y-3 pt-4 border-t border-gray-200"
          role="contentinfo"
        >
          {atendimento.ANEXOS && atendimento.ANEXOS.length > 0 && (
            <div className="flex gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Paperclip className="h-3 w-3" />
                <span className="font-medium">Anexos:</span>
              </div>
              <Anexos
                anexos={atendimento.ANEXOS}
                employeeNome={atendimento.NOME}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div
              aria-label="Detalhes do ticket"
              className="flex items-center gap-2 text-xs text-gray-500"
            >
              <Clock aria-hidden="true" className="h-4 w-4" />
              <span>{formatarTempoEspera(atendimento.TICKET.emissao)}</span>
              <User aria-hidden="true" className="h-4 w-4 text-gray-400" />
              <span className="truncate">
                {atendimento.TICKET.atendente?.split(" ")[0] || "Não atribuído"}
              </span>
              <Senha aria-hidden="true" className="h-4 w-4 text-gray-400" />
              {Number(atendimento.TICKET.numero) < 0
                ? "N/A"
                : (atendimento.TICKET.prefixo || "") +
                  atendimento.TICKET.numero}
              <Pin aria-hidden="true" className="h-4 w-4 text-gray-400" />
              {atendimento.TICKET.unidade}
              {authDescriptor && (
                <>
                  {authDescriptor.icon}
                  <span>{authDescriptor.label}</span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-400">{exameSelecionado}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default React.memo(AtendimentoCard);
