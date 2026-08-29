import type { ExamToogle } from "@/lib/exames/utils/exames-helper";

import React, { useMemo } from "react";
import { Socket } from "socket.io-client";

import DisconnectedState from "../../recepcao/components/DisconnectedState";

import AtendimentoList from "./AtendimentoList";

import { TicketGroups } from "@/lib/ticket/ticket";
import {
  ExamRegister,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
import { belongsToOtherOperationalContext } from "@/lib/atendimento/operational-context";
import { ExamStatus } from "@/lib/scheduling/enum/scheduling.enum";
import ContentLoading from "@/app/atendimento/components/ContentLoading";
import { ESTIMATIVA_EXAMES } from "@/config/constants";

interface MainContentProps {
  conectado: boolean;
  aguardandoPrimeirosAtendimentos: boolean;
  agendamentos: Scheduling[];
  socket: Socket;
  salaSelecionada: string;
  codigosDeAtendimento: Set<string>;
  unidadeSelecionada: string;
  operationalUserName?: string;
  setFuncionarioSelecionado: (funcionario: Scheduling | null) => void;
  onHandleModal: (
    atendimento: Scheduling,
    modalType: "exams" | "ticket",
  ) => void;
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
  onViewRelatorio?: (atendimento: Scheduling) => void;
  examesGrouped: Record<string, ExamToogle[]>;
}

const AtendimentoContent: React.FC<MainContentProps> = ({
  conectado,
  aguardandoPrimeirosAtendimentos,
  agendamentos,
  socket,
  salaSelecionada,
  codigosDeAtendimento,
  unidadeSelecionada,
  operationalUserName,
  onHandleModal,
  setFuncionarioSelecionado,
  exameSelecionado,
  pendingActions,
  startPendingAction,
  onIniciarAutenticacao,
  onViewRelatorio,
  examesGrouped,
}) => {
  const calcularTempoEstimado = (exames: ExamRegister[] = []) => {
    return exames
      .filter((ex) => ex.status !== ExamStatus.FINALIZADO)
      .reduce((total, ex) => {
        return total + (ESTIMATIVA_EXAMES[ex.grupo ?? ""] ?? 20);
      }, 0);
  };

  const AtendimentosOrdenados = useMemo(() => {
    if (!Array.isArray(agendamentos) || agendamentos.length === 0) {
      return [];
    }

    const JANELA_TOLERANCIA = 10 * 60 * 1000;

    return agendamentos
      .map((a) => {
        const ticketTime = a.TICKET?.emissao
          ? new Date(a.TICKET.emissao).getTime()
          : Number.MAX_SAFE_INTEGER;

        const examesPendentes =
          a.EXAMES?.filter((ex) => ex.status !== ExamStatus.FINALIZADO) ?? [];

        return {
          ...a,
          ticketTime,
          examesRestantes: examesPendentes.length,
          tempoEstimado: calcularTempoEstimado(examesPendentes),
        };
      })
      .sort((a, b) => {
        const deltaTicket = a.ticketTime - b.ticketTime;

        if (Math.abs(deltaTicket) > JANELA_TOLERANCIA) {
          return deltaTicket;
        }

        if (a.tempoEstimado !== b.tempoEstimado) {
          return a.tempoEstimado - b.tempoEstimado;
        }

        return deltaTicket;
      });
  }, [agendamentos]);

  const AgendamentosComInfoDeOutrasSalas = useMemo(() => {
    if (!agendamentos || agendamentos.length === 0) return new Map();

    return new Map(
      agendamentos
        .filter(
          (t) =>
            t.TICKET &&
            t.TICKET.grupo === TicketGroups.EXAME &&
            belongsToOtherOperationalContext(t.TICKET, {
              sala: salaSelecionada,
              profissional: operationalUserName,
            }),
        )
        .map((t) => [
          t.TICKET.id,
          {
            status: t.TICKET.status,
            sala: t.TICKET.sala,
          },
        ]),
    );
  }, [agendamentos, operationalUserName, salaSelecionada]);

  const atendimentoOutrasSalas = useMemo(() => {
    return AtendimentosOrdenados.filter(
      (a) => a?.TICKET && AgendamentosComInfoDeOutrasSalas.has(a.TICKET.id),
    ).map((a) => {
      const infoTicketOutraSala = AgendamentosComInfoDeOutrasSalas.get(
        a.TICKET.id,
      )!;

      return {
        ...a,
        TICKET: {
          ...a.TICKET,
          status: infoTicketOutraSala.status,
          sala: infoTicketOutraSala.sala,
        },
      };
    });
  }, [AtendimentosOrdenados, AgendamentosComInfoDeOutrasSalas]);

  const prontuariosEmAtendimento = useMemo(
    () => new Set(atendimentoOutrasSalas.map((p) => p.CODIGOPRONTUARIO)),
    [atendimentoOutrasSalas],
  );

  const naoEstaEmOutrasSalas = useMemo(
    () => (atendimento: Scheduling) =>
      !prontuariosEmAtendimento.has(atendimento.CODIGOPRONTUARIO),
    [prontuariosEmAtendimento],
  );

  const [senhasPreferenciais, senhasAgendados, senhasComPrefixo, senhasNormais] = useMemo(() => {
    if (!AtendimentosOrdenados || AtendimentosOrdenados.length === 0) {
      return [[], [], [], []];
    }

    const preferenciais = AtendimentosOrdenados.filter(
      (s) => s.TICKET?.preferencial && naoEstaEmOutrasSalas(s),
    );

    const agendados = AtendimentosOrdenados.filter(
      (s) =>
        s.TICKET?.prefixo?.trim().toUpperCase() === "C" && !s.TICKET?.preferencial && naoEstaEmOutrasSalas(s),
    );

    const comPrefixo = AtendimentosOrdenados.filter(
      (s) =>
        s.TICKET?.prefixo && s.TICKET?.prefixo.trim().toUpperCase() !== "C" && !s.TICKET?.preferencial && naoEstaEmOutrasSalas(s),
    );

    const normais = AtendimentosOrdenados.filter(
      (s) =>
        !s.TICKET?.preferencial &&
        !s.TICKET?.prefixo &&
        naoEstaEmOutrasSalas(s),
    );

    return [preferenciais, agendados, comPrefixo, normais];
  }, [AtendimentosOrdenados, naoEstaEmOutrasSalas]);

  if (!conectado) {
    return <DisconnectedState />;
  }

  const totalAtendimentos = AtendimentosOrdenados.length;
  const totalPreferenciais = senhasPreferenciais.length;
  const totalComPrefixo = senhasComPrefixo.length;
  const totalNormais = senhasNormais.length;
  const totalOutrasSalas = atendimentoOutrasSalas.length;
  const deveExibirLoading = aguardandoPrimeirosAtendimentos || !agendamentos;

  if (deveExibirLoading) {
    return (
      <ContentLoading
        description="Aguarde enquanto recebemos os atendimentos da unidade."
        title="Recebendo atendimentos"
      />
    );
  }

  const ariaLabelMain = `Sistema de atendimento medico - ${totalAtendimentos} pacientes aguardando: ${totalPreferenciais} preferenciais, ${totalComPrefixo} com prioridade, ${totalNormais} normais. ${totalOutrasSalas} em atendimento em outras salas.`;

  return (
    <main aria-label={ariaLabelMain} role="main">
      <div
        aria-atomic="true"
        aria-live="polite"
        aria-relevant="additions removals"
        className="sr-only"
      >
        {totalAtendimentos > 0
          ? `Lista de atendimentos carregada com ${totalAtendimentos} pacientes.`
          : "Nenhum paciente aguardando atendimento."}
      </div>

      <AtendimentoList
        codigosDeAtendimento={codigosDeAtendimento}
        exameSelecionado={exameSelecionado}
        examesGrouped={examesGrouped}
        pendingActions={pendingActions}
        salaSelecionada={salaSelecionada}
        senhasAgendados={senhasAgendados}
        senhasComPrefixo={senhasComPrefixo}
        senhasEmAtendimento={atendimentoOutrasSalas}
        senhasNormais={senhasNormais}
        senhasOrdenadas={AtendimentosOrdenados}
        senhasPreferenciais={senhasPreferenciais}
        setFuncionarioSelecionado={setFuncionarioSelecionado}
        socket={socket}
        startPendingAction={startPendingAction}
        unidadeSelecionada={unidadeSelecionada}
        onHandleModal={onHandleModal}
        onIniciarAutenticacao={onIniciarAutenticacao}
        onViewRelatorio={onViewRelatorio}
      />
    </main>
  );
};

export default AtendimentoContent;
