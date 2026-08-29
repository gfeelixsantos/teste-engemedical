import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  RadioGroup,
  Radio,
  Checkbox,
  Spinner,
} from "@heroui/react";
import { FileText } from "lucide-react";

import HeaderExame from "./HeaderExame";

import { useUser } from "@/hooks/useUser";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface EspirometriaProps {
  atendimento: any;
  exame: string;
  formulario: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

interface EspirometriaData {
  // Histórico Respiratório e Tabagismo
  tabagismo: boolean;
  tempoParouFumar: string;
  quantidadeCigarrosDia: string;
  fumouHoje: string;

  // Sintomas Respiratórios
  tossePigarroManha: string;
  catarroHabitual: string;
  sibilancia: string;
  faltaArEsforco: string;

  // Doenças Pulmonares e Outras Condições
  doencaPulmonar: string;
  asma: string;
  medicacaoAsma: string;
  cirurgiaToraxPulmao: string;
  doencaCardiacaHipertensao: string;
  proteseDentaria: string;

  // Histórico Ocupacional e Exposição
  exposicaoPoeiraFumaca: string;
  descricaoExposicao: string;
  exposicaoAtual: string;

  // Observações
  observacoes: string;
}

const Espirometria: React.FC<EspirometriaProps> = ({
  atendimento,
  exame,
  formulario,
  onSave,
  onClose,
}) => {
  const user = useUser();
  const [agendamento, setAgendamento] = useState<Scheduling>();
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarQuestionarioTabagismo, setMostrarQuestionarioTabagismo] =

    useState(false);

  const [formData, setFormData] = useState<EspirometriaData>({
    // Histórico Respiratório e Tabagismo
    tabagismo: false,
    tempoParouFumar: "",
    quantidadeCigarrosDia: "Não se aplica",
    fumouHoje: "",

    // Sintomas Respiratórios
    tossePigarroManha: "Não",
    catarroHabitual: "Não",
    sibilancia: "Não",
    faltaArEsforco: "Não",

    // Doenças Pulmonares e Outras Condições
    doencaPulmonar: "Não",
    asma: "Não",
    medicacaoAsma: "Não",
    cirurgiaToraxPulmao: "Não",
    doencaCardiacaHipertensao: "Não",
    proteseDentaria: "Não",

    // Histórico Ocupacional e Exposição
    exposicaoPoeiraFumaca: "Não",
    descricaoExposicao: "",
    exposicaoAtual: "Não",

    // Observações
    observacoes: "",
  });

  // Preenchimento automático dos dados do atendimento
  useEffect(() => {
    if (atendimento) {
      setAgendamento(atendimento);
    }

    if (formulario) {
      setFormData((prev) => ({ ...prev, ...formulario }));
      // Atualizar visibilidade do questionário de tabagismo baseado nos dados existentes
      if (formulario.tabagismo) {
        setMostrarQuestionarioTabagismo(true);
      }
    }
  }, [atendimento, formulario]);

  const handleInputChange = useCallback(
    (field: keyof EspirometriaData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [setFormData],
  );

  const handleTabagismoChange = useCallback((isChecked: boolean) => {
    setFormData((prev) => ({ ...prev, tabagismo: isChecked }));
    setMostrarQuestionarioTabagismo(isChecked);

    // Resetar campos do questionário de tabagismo quando desmarcado
    if (!isChecked) {
      setFormData((prev) => ({
        ...prev,
        tempoParouFumar: "",
        quantidadeCigarrosDia: "Não se aplica",
        fumouHoje: "",
      }));
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      await onSave?.(formData);
    } finally {
      setIsLoading(false);
    }
  }, [onSave, formData]);

  const SectionTitle: React.FC<{
    number: string;
    title: string;
    icon?: React.ReactNode;
  }> = ({ number, title, icon }) => (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 min-h-screen">
      {/* Header */}
      <HeaderExame agendamento={agendamento} exame={exame} />

      {/* 2. Histórico Respiratório e Tabagismo */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="2" title="Histórico Respiratório e Tabagismo" />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <Checkbox
                  classNames={{ label: "text-sm font-medium text-gray-700" }}
                  color="success"
                  isSelected={formData.tabagismo}
                  onValueChange={handleTabagismoChange}
                >
                  Fuma ou já fumou cigarros?
                </Checkbox>
              </div>

              {mostrarQuestionarioTabagismo && (
                <div className="pl-6 border-l-2 border-gray-300 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tempo desde que parou de fumar:
                      </label>
                      <Input
                        className="bg-white border-gray-300"
                        placeholder="Ex: 2 anos"
                        value={formData.tempoParouFumar}
                        onChange={(e) =>
                          handleInputChange("tempoParouFumar", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantidade média diária:
                      </label>
                      <Select
                        className="w-full"
                        classNames={{
                          trigger: "bg-white border-gray-300",
                        }}
                        selectedKeys={[formData.quantidadeCigarrosDia]}
                        onChange={(e) =>
                          handleInputChange(
                            "quantidadeCigarrosDia",
                            e.target.value,
                          )
                        }
                      >
                        <SelectItem key="Não se aplica">
                          Não se aplica
                        </SelectItem>
                        <SelectItem key="Até 10 cigarros/dia">
                          Até 10 cigarros/dia
                        </SelectItem>
                        <SelectItem key="10 a 20 cigarros/dia">
                          10 a 20 cigarros/dia
                        </SelectItem>
                        <SelectItem key="Mais de 20 cigarros/dia">
                          Mais de 20 cigarros/dia
                        </SelectItem>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fumou hoje? Há quanto tempo?
                    </label>
                    <Input
                      className="bg-white border-gray-300"
                      placeholder="Ex: 2 horas"
                      value={formData.fumouHoje}
                      onChange={(e) =>
                        handleInputChange("fumouHoje", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Sintomas Respiratórios */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="3" title="Sintomas Respiratórios" />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              {[
                {
                  label: "Tosse ou pigarro frequente pela manhã?",
                  field: "tossePigarroManha" as keyof EspirometriaData,
                },
                {
                  label: "Produz catarro habitualmente?",
                  field: "catarroHabitual" as keyof EspirometriaData,
                },
                {
                  label: "Seu peito chia com frequência (sibilância)?",
                  field: "sibilancia" as keyof EspirometriaData,
                },
                {
                  label: "Sente falta de ar com esforço leve?",
                  field: "faltaArEsforco" as keyof EspirometriaData,
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {item.label}
                  </label>
                  <RadioGroup
                    classNames={{ wrapper: "gap-6" }}
                    color="success"
                    orientation="horizontal"
                    value={formData[item.field] as string}
                    onValueChange={(value) =>
                      handleInputChange(item.field, value)
                    }
                  >
                    <Radio classNames={{ label: "text-gray-700" }} value="Sim">
                      Sim
                    </Radio>
                    <Radio classNames={{ label: "text-gray-700" }} value="Não">
                      Não
                    </Radio>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Doenças Pulmonares e Outras Condições */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle
          number="4"
          title="Doenças Pulmonares e Outras Condições"
        />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              {[
                {
                  label:
                    "Já teve alguma doença pulmonar diagnosticada (ex: bronquite, DPOC)?",
                  field: "doencaPulmonar" as keyof EspirometriaData,
                },
                {
                  label: "Tem ou teve asma?",
                  field: "asma" as keyof EspirometriaData,
                },
                {
                  label: "Faz uso atual de medicação para asma ou respiração?",
                  field: "medicacaoAsma" as keyof EspirometriaData,
                },
                {
                  label: "Já realizou cirurgia no tórax ou pulmão?",
                  field: "cirurgiaToraxPulmao" as keyof EspirometriaData,
                },
                {
                  label: "Tem alguma doença cardíaca ou hipertensão?",
                  field: "doencaCardiacaHipertensao" as keyof EspirometriaData,
                },
                {
                  label: "Usa prótese dentária?",
                  field: "proteseDentaria" as keyof EspirometriaData,
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {item.label}
                  </label>
                  <RadioGroup
                    classNames={{ wrapper: "gap-6" }}
                    color="success"
                    orientation="horizontal"
                    value={formData[item.field] as string}
                    onValueChange={(value) =>
                      handleInputChange(item.field, value)
                    }
                  >
                    <Radio classNames={{ label: "text-gray-700" }} value="Sim">
                      Sim
                    </Radio>
                    <Radio classNames={{ label: "text-gray-700" }} value="Não">
                      Não
                    </Radio>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Histórico Ocupacional e Exposição */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="5" title="Histórico Ocupacional e Exposição" />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Já trabalhou em ambiente com poeira, fumaça ou vapores
                  químicos por um ano ou mais?
                </label>
                <RadioGroup
                  classNames={{ wrapper: "gap-6" }}
                  color="success"
                  orientation="horizontal"
                  value={formData.exposicaoPoeiraFumaca}
                  onValueChange={(value) =>
                    handleInputChange("exposicaoPoeiraFumaca", value)
                  }
                >
                  <Radio classNames={{ label: "text-gray-700" }} value="Sim">
                    Sim
                  </Radio>
                  <Radio classNames={{ label: "text-gray-700" }} value="Não">
                    Não
                  </Radio>
                </RadioGroup>
              </div>

              {formData.exposicaoPoeiraFumaca === "Sim" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Se sim, descreva a atividade:
                  </label>
                  <Input
                    className="bg-white border-gray-300"
                    placeholder="Ex: construção civil, soldagem, mineração..."
                    value={formData.descricaoExposicao}
                    onChange={(e) =>
                      handleInputChange("descricaoExposicao", e.target.value)
                    }
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Atualmente trabalha exposto a esses agentes?
                </label>
                <RadioGroup
                  classNames={{ wrapper: "gap-6" }}
                  color="success"
                  orientation="horizontal"
                  value={formData.exposicaoAtual}
                  onValueChange={(value) =>
                    handleInputChange("exposicaoAtual", value)
                  }
                >
                  <Radio classNames={{ label: "text-gray-700" }} value="Sim">
                    Sim
                  </Radio>
                  <Radio classNames={{ label: "text-gray-700" }} value="Não">
                    Não
                  </Radio>
                </RadioGroup>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 6. Observações */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="6" title="Observações" />

        <div className="space-y-6">
          {/* Observações Manuais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações do avaliador:
            </label>
            <Textarea
              className="bg-white border-gray-300"
              placeholder="Digite suas observações adicionais aqui."
              rows={4}
              value={formData.observacoes}
              onChange={(e) => handleInputChange("observacoes", e.target.value)}
            />
          </div>
        </div>
      </Card>

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
          isDisabled={isLoading}
          startContent={isLoading ? <Spinner size="sm" /> : <FileText className="h-4 w-4" />}
          onPress={handleSave}
        >
          {isLoading ? "Salvando..." : "Salvar / Concluir Questionário"}
        </Button>
      </div>
    </div>
  );
};

export default Espirometria;
