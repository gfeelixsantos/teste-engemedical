import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Radio, RadioGroup, Spinner, Textarea } from "@heroui/react";
import { FileText } from "lucide-react";

import HeaderExame from "./HeaderExame";

import {
  ExamRegister,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
interface ExamePadraoProps {
  atendimento: any;
  exame: string;
  formulario: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

const ExamePadrao: React.FC<ExamePadraoProps> = ({
  atendimento,
  exame,
  formulario,
  onSave,
  onClose,
}) => {
  const [agendamento, setAgendamento] = useState<Scheduling>();
  const [examesFiltrados, setExamesFiltrados] = useState<ExamRegister[]>([]);
  const [loading, setLoading] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  // Preenchimento automático dos dados do atendimento
  useEffect(() => {
    if (atendimento) {
      setAgendamento(atendimento);
      filtrarExamesPorGrupo(atendimento, exame);

      // Preenche o campo de observações com o valor existente, se houver
      if (atendimento.ANOTACOES) {
        setObservacoes(atendimento.ANOTACOES);
      }
    }
  }, [atendimento, exame, formulario]);

  // Função para filtrar exames pelo grupo recebido via prop
  const filtrarExamesPorGrupo = useCallback(
    (atendimentoData: any, grupoExame: string) => {
      if (!atendimentoData?.EXAMES || !grupoExame) {
        setExamesFiltrados([]);

        return;
      }

      const examesFiltrados = atendimentoData.EXAMES.filter(
        (exameItem: any) =>
          exameItem.grupo?.toLowerCase() === grupoExame.toLowerCase(),
      ).map((exameItem: any) => ({
        ...exameItem,
        realizado:
          exameItem.status === "PENDENTE"
            ? undefined
            : exameItem.status !== "NAO_REALIZADO",
      }));

      setExamesFiltrados(examesFiltrados);
    },
    [],
  );

  // Função para atualizar o status de realização do exame
  const handleRealizacaoExameChange = useCallback(
    (codigoExame: string, realizado: boolean) => {
      setExamesFiltrados((prev) =>
        prev.map((exame) =>
          exame.codigoExame === codigoExame
            ? { ...exame, realizado }
            : exame,
        ),
      );
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      const anotacoesExistentes = agendamento?.ANOTACOES || "";
      const anotacoesFinais = anotacoesExistentes
        ? `${anotacoesExistentes}\n${observacoes}`
        : observacoes;

      await onSave?.({
        status: "concluded",
        anotacoes: anotacoesFinais,
        examesRealizados: examesFiltrados.map((exame) => ({
          codigoExame: exame.codigoExame,
          sequencialResultadoExame: exame.sequencialResultadoExame,
          realizado: exame.realizado,
          motivoNaoRealizado: exame.realizado === false ? observacoes : undefined,
        })),
      });
    } finally {
      setLoading(false);
    }
  }, [onSave, observacoes, agendamento?.ANOTACOES, examesFiltrados]);

  const SectionTitle: React.FC<{
    number: string;
    title: string;
    icon?: React.ReactNode;
  }> = ({ title, icon }) => (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
      </div>
    </div>
  );

  const todosRespondidos = examesFiltrados.every((exame) => exame.realizado !== undefined);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 min-h-screen">
      {/* Header */}
      <HeaderExame agendamento={agendamento} exame={exame} />

      {/* 2. Exames Filtrados por Grupo */}
      {examesFiltrados.length > 0 && (
        <Card className="p-6 shadow-sm border border-gray-200 bg-white">
          <SectionTitle number="2" title={`Exame(s)`} />

          <div className="space-y-4">
            {examesFiltrados.map((exameItem, index) => (
              <div
                key={exameItem.codigoExame || index.toString()}
                className="rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm mb-1">
                      {exameItem.nomeExame}
                    </h4>
                    {/* <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                      <span>Código: {exameItem.codigoExame}</span>
                      {exameItem.sequencialResultadoExame && (
                        <span>Sequencial: {exameItem.sequencialResultadoExame}</span>
                      )}
                    </div> */}
                  </div>

                  <div className="flex-shrink-0">
                    <RadioGroup
                      classNames={{
                        base: "flex gap-4",
                        label: "text-sm font-medium text-gray-700",
                      }}
                      color="success"
                      label="Exame realizado?"
                      orientation="horizontal"
                      value={exameItem.realizado === undefined ? "" : exameItem.realizado ? "sim" : "nao"}
                      onValueChange={(value) =>
                        handleRealizacaoExameChange(
                          exameItem.codigoExame,
                          value === "sim",
                        )
                      }
                    >
                      <Radio classNames={{ label: "text-sm" }} value="sim">
                        Sim
                      </Radio>
                      <Radio classNames={{ label: "text-sm" }} value="nao">
                        Não
                      </Radio>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            ))}
            <div className="space-y-3">
              <Textarea
                classNames={{
                  base: "w-full",
                  label: "text-sm font-medium text-gray-700",
                }}
                label="Anotações do atendimento"
                minRows={2}
                value={observacoes}
                onValueChange={setObservacoes}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <Button
          className="px-8 border border-gray-300 text-gray-700 hover:bg-gray-50"
          variant="flat"
          onPress={onClose}
        >
          Cancelar
        </Button>
        <Button
          className="px-8 bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover transition-colors"
          color="primary"
          isDisabled={loading || !todosRespondidos}
          startContent={loading ? <Spinner size="sm" /> : <FileText className="h-4 w-4" />}
          onPress={handleSave}
        >
          {loading ? "Salvando..." : "Concluir Atendimento"}
        </Button>
      </div>
    </div>
  );
};

export default React.memo(ExamePadrao);
