import type { ExamToogle } from "@/lib/exames/utils/exames-helper";

import React from "react";
import { Card } from "@heroui/react";
import { Clock } from "lucide-react";
import { Socket } from "socket.io-client";

import AtendimentoSection from "./AtendimentoSection";
import AtendimentoCardCompacto from "./AtendimentoCardCompacto";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface SenhasListProps {
  senhasOrdenadas: Scheduling[];
  senhasPreferenciais: Scheduling[];
  senhasAgendados: Scheduling[];
  senhasComPrefixo: Scheduling[];
  senhasNormais: Scheduling[];
  senhasEmAtendimento: Scheduling[];
  setFuncionarioSelecionado: (funcionario: Scheduling | null) => void;
  socket: Socket;
  salaSelecionada: string;
  codigosDeAtendimento: Set<string>;
  unidadeSelecionada: string;
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
  onIniciarTeleatendimento?: (atendimento: Scheduling) => void;
  onViewRelatorio?: (atendimento: Scheduling) => void;
  examesGrouped: Record<string, ExamToogle[]>;
}

// Componente para o estado vazio - CORRIGIDO
const EmptyState: React.FC<{ buscaSenha?: string }> = ({ buscaSenha }) => (
  <Card
    aria-describedby="empty-senhas-description"
    className="bg-white rounded-lg border border-gray-200 shadow-md p-8 text-center 
      transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    role="status" // Alterado de alertdialog para status
  >
    <div className="text-gray-600">
      <Clock
        aria-hidden="true"
        className="h-12 w-12 mx-auto mb-4 text-gray-400"
      />
      <p
        className="text-lg font-semibold text-gray-900 mb-2"
        id="empty-senhas-description"
      >
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

const AtendimentoList: React.FC<SenhasListProps> = ({
  senhasOrdenadas,
  senhasPreferenciais,
  senhasAgendados,
  senhasComPrefixo,
  senhasNormais,
  senhasEmAtendimento,
  socket,
  salaSelecionada,
  codigosDeAtendimento,
  unidadeSelecionada,
  setFuncionarioSelecionado,
  onHandleModal,
  exameSelecionado,
  pendingActions,
  startPendingAction,
  onIniciarAutenticacao,
  onIniciarTeleatendimento,
  onViewRelatorio,
  examesGrouped,
}) => {
  // Correção: Verificar todas as listas, não apenas a principal
  const todasSenhasVazias =
    senhasOrdenadas.length === 0 &&
    senhasPreferenciais.length === 0 &&
    senhasAgendados.length === 0 &&
    senhasComPrefixo.length === 0 &&
    senhasNormais.length === 0 &&
    senhasEmAtendimento.length === 0;

  if (todasSenhasVazias) {
    return <EmptyState />;
  }

  // Calcular totais para aria-labels
  const totalGeral = senhasOrdenadas.length;
  const totalEmAtendimento = senhasEmAtendimento.length;

  return (
    <div
      aria-label={`Painel de atendimento - ${totalGeral} pacientes aguardando, ${totalEmAtendimento} em atendimento`}
      className="space-y-6 p-4 bg-gray-50 rounded-lg"
      role="main"
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Coluna principal - senhas aguardando */}
        <div className="space-y-6 w-full lg:w-[720px] lg:shrink-0">
          <h2 className="sr-only">Senhas aguardando atendimento</h2>

          {senhasPreferenciais.length > 0 && (
            <AtendimentoSection
              key="senhas-preferenciais"
              codigosDeAtendimento={codigosDeAtendimento}
              emptyMessage="Nenhuma senha preferencial"
              exameSelecionado={exameSelecionado}
              examesGrouped={examesGrouped}
              pendingActions={pendingActions}
              salaSelecionada={salaSelecionada}
              senhas={senhasPreferenciais}
              setFuncionarioSelecionado={setFuncionarioSelecionado}
              socket={socket}
              startPendingAction={startPendingAction}
              title={`Preferencial (${senhasPreferenciais.length})`}
              unidadeSelecionada={unidadeSelecionada}
              onHandleModal={onHandleModal}
              onIniciarAutenticacao={onIniciarAutenticacao}
              onIniciarTeleatendimento={onIniciarTeleatendimento}
              onViewRelatorio={onViewRelatorio}
            />
          )}

          {senhasComPrefixo.length > 0 && (
            <AtendimentoSection
              key="senhas-prioridade"
              codigosDeAtendimento={codigosDeAtendimento}
              emptyMessage="Nenhuma senha com prioridade"
              exameSelecionado={exameSelecionado}
              examesGrouped={examesGrouped}
              pendingActions={pendingActions}
              salaSelecionada={salaSelecionada}
              senhas={senhasComPrefixo}
              setFuncionarioSelecionado={setFuncionarioSelecionado}
              socket={socket}
              startPendingAction={startPendingAction}
              title={`Prioridade (${senhasComPrefixo.length})`}
              unidadeSelecionada={unidadeSelecionada}
              onHandleModal={onHandleModal}
              onIniciarAutenticacao={onIniciarAutenticacao}
              onIniciarTeleatendimento={onIniciarTeleatendimento}
              onViewRelatorio={onViewRelatorio}
            />
          )}

          {senhasAgendados.length > 0 && (
            <AtendimentoSection
              key="senhas-agendados"
              codigosDeAtendimento={codigosDeAtendimento}
              emptyMessage="Nenhuma senha agendada"
              exameSelecionado={exameSelecionado}
              examesGrouped={examesGrouped}
              pendingActions={pendingActions}
              salaSelecionada={salaSelecionada}
              senhas={senhasAgendados}
              setFuncionarioSelecionado={setFuncionarioSelecionado}
              socket={socket}
              startPendingAction={startPendingAction}
              title={`Agendados (${senhasAgendados.length})`}
              unidadeSelecionada={unidadeSelecionada}
              onHandleModal={onHandleModal}
              onIniciarAutenticacao={onIniciarAutenticacao}
              onIniciarTeleatendimento={onIniciarTeleatendimento}
              onViewRelatorio={onViewRelatorio}
            />
          )}

          {senhasNormais.length > 0 && (
            <AtendimentoSection
              key="senhas-normais"
              codigosDeAtendimento={codigosDeAtendimento}
              emptyMessage="Nenhuma senha normal"
              exameSelecionado={exameSelecionado}
              examesGrouped={examesGrouped}
              pendingActions={pendingActions}
              salaSelecionada={salaSelecionada}
              senhas={senhasNormais}
              setFuncionarioSelecionado={setFuncionarioSelecionado}
              socket={socket}
              startPendingAction={startPendingAction}
              title={`Atendimento (${senhasNormais.length})`}
              unidadeSelecionada={unidadeSelecionada}
              onHandleModal={onHandleModal}
              onIniciarAutenticacao={onIniciarAutenticacao}
              onIniciarTeleatendimento={onIniciarTeleatendimento}
              onViewRelatorio={onViewRelatorio}
            />
          )}
        </div>

        {/* Coluna lateral - senhas em atendimento */}
        {senhasEmAtendimento.length > 0 && (
          <div className="lg:w-96 lg:shrink-0 space-y-4">
            <div
              aria-label={`Pacientes em atendimento (${senhasEmAtendimento.length})`}
              className="p-4 shadow-sm"
              role="complementary"
            >
              <h3
                className="text-lg font-semibold text-gray-900 mb-4"
                id="em-atendimento-title"
              >
                Em Atendimento ({senhasEmAtendimento.length})
              </h3>

              <div
                aria-labelledby="em-atendimento-title"
                className="space-y-3"
                role="list"
              >
                {senhasEmAtendimento.map((atendimento, index) => {
                  const key =
                    atendimento._id?.toString() ||
                    `atendimento-compacto-${index}`;

                  return (
                    <div
                      key={key}
                      aria-label={`${atendimento.NOME || "Paciente"} em atendimento`}
                      role="listitem"
                    >
                      <AtendimentoCardCompacto
                        atendimento={atendimento}
                        socket={socket}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mensagem de resumo para leitores de tela */}
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {`Total de pacientes: ${totalGeral}. Em atendimento: ${totalEmAtendimento}.`}
      </div>
    </div>
  );
};

export default AtendimentoList;
