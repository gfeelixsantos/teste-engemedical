import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, RadioGroup, Radio, Spinner, Textarea } from "@heroui/react";
import { FileText } from "lucide-react";

import HeaderExame from "./HeaderExame";

import { useUser } from "@/hooks/useUser";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface PsicossocialProps {
  atendimento: any;
  exame: string;
  formulario: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

interface PsicossocialData {
  // Saúde Mental e Hábitos
  transtornoEmocional: string;
  medicamentosControlados: string;
  usoAlcoolDrogas: string;

  // Condições Clínicas e Sensoriais
  tonturaDesmaios: string;
  problemasSensoriais: string;
  hipertensaoDiabetes: string;

  // Aspectos Psicossociais
  relacionamentoFamiliar: string;
  medoAlturaEspacos: string;
  experienciaAlturaConfinado: string;

  // Autoavaliação
  autoAvaliacaoAltura: string;
  autoAvaliacaoConfinado: string;

  // Conclusão
  observacoes: string;
}

const Psicossocial: React.FC<PsicossocialProps> = ({
  atendimento,
  exame,
  formulario,
  onSave,
  onClose,
}) => {
  const user = useUser();
  const [agendamento, setAgendamento] = useState<Scheduling>();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<PsicossocialData>({
    // Saúde Mental e Hábitos
    transtornoEmocional: "Não",
    medicamentosControlados: "Não",
    usoAlcoolDrogas: "Não",

    // Condições Clínicas e Sensoriais
    tonturaDesmaios: "Não",
    problemasSensoriais: "Não",
    hipertensaoDiabetes: "Não",

    // Aspectos Psicossociais
    relacionamentoFamiliar: "Sim",
    medoAlturaEspacos: "Não",
    experienciaAlturaConfinado: "Não",

    // Autoavaliação
    autoAvaliacaoAltura: "Sim",
    autoAvaliacaoConfinado: "Sim",

    // Conclusão
    observacoes: "",
  });

  // Preenchimento automático dos dados do atendimento
  useEffect(() => {
    if (atendimento) {
      setAgendamento(atendimento);
    }

    if (formulario) {
      setFormData((prev) => ({ ...prev, ...formulario }));
    }
  }, [atendimento, formulario]);

  const handleInputChange = useCallback(
    (field: keyof PsicossocialData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      await onSave?.(formData);
    } finally {
      setIsLoading(false);
    }
  }, [formData, onSave]);

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
      <HeaderExame agendamento={agendamento} exame={exame} />

      {/* 2. Saúde Mental e Hábitos */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="2" title="Saúde Mental e Hábitos" />

        <div className="space-y-6">
          <div className=" p-4">
            <div className="space-y-4">
              {[
                {
                  label:
                    "Você tem ou já teve algum transtorno emocional (depressão, ansiedade, insônia)?",
                  field: "transtornoEmocional" as keyof PsicossocialData,
                  options: [
                    { value: "Não", label: "Não" },
                    { value: "Sim", label: "Sim" },
                    { value: "Teve no passado", label: "Teve no passado" },
                  ],
                },
                {
                  label:
                    "Faz uso atual de medicamentos controlados (sono, ansiedade, humor)?",
                  field: "medicamentosControlados" as keyof PsicossocialData,
                  options: [
                    { value: "Não", label: "Não" },
                    { value: "Sim", label: "Sim" },
                  ],
                },
                {
                  label: "Faz uso frequente de álcool ou drogas?",
                  field: "usoAlcoolDrogas" as keyof PsicossocialData,
                  options: [
                    { value: "Não", label: "Não" },
                    { value: "Sim", label: "Sim" },
                    { value: "Usou no passado", label: "Usou no passado" },
                  ],
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {item.label}
                  </label>
                  <RadioGroup
                    classNames={{ wrapper: "flex gap-6" }}
                    color="success"
                    orientation="horizontal"
                    value={formData[item.field] as string}
                    onValueChange={(value) =>
                      handleInputChange(item.field, value)
                    }
                  >
                    {item.options.map((option) => (
                      <Radio key={option.value} value={option.value}>
                        {option.label}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Condições Clínicas e Sensoriais */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="3" title="Condições Clínicas e Sensoriais" />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              {[
                {
                  label: "Já teve tontura, desmaios ou convulsões?",
                  field: "tonturaDesmaios" as keyof PsicossocialData,
                },
                {
                  label:
                    "Tem labirintite, problema de visão ou audição que dificulte o trabalho?",
                  field: "problemasSensoriais" as keyof PsicossocialData,
                },
                {
                  label: "Possui hipertensão ou diabetes sob controle?",
                  field: "hipertensaoDiabetes" as keyof PsicossocialData,
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {item.label}
                  </label>
                  <RadioGroup
                    classNames={{ wrapper: "flex gap-6" }}
                    color="success"
                    orientation="horizontal"
                    value={formData[item.field] as string}
                    onValueChange={(value) =>
                      handleInputChange(item.field, value)
                    }
                  >
                    <Radio value="Sim">Sim</Radio>
                    <Radio value="Não">Não</Radio>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Aspectos Psicossociais */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="4" title="Aspectos Psicossociais" />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seu relacionamento familiar e social é satisfatório?
                </label>
                <RadioGroup
                  classNames={{ wrapper: "flex gap-6" }}
                  color="success"
                  orientation="horizontal"
                  value={formData.relacionamentoFamiliar}
                  onValueChange={(value) =>
                    handleInputChange("relacionamentoFamiliar", value)
                  }
                >
                  <Radio value="Sim">Sim</Radio>
                  <Radio value="Com dificuldades">Com dificuldades</Radio>
                </RadioGroup>
              </div>

              {[
                {
                  label:
                    "Já sentiu medo ou ansiedade em locais altos ou fechados?",
                  field: "medoAlturaEspacos" as keyof PsicossocialData,
                },
                {
                  label: "Já trabalhou em altura ou em espaço confinado antes?",
                  field: "experienciaAlturaConfinado" as keyof PsicossocialData,
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {item.label}
                  </label>
                  <RadioGroup
                    classNames={{ wrapper: "flex gap-6" }}
                    color="success"
                    orientation="horizontal"
                    value={formData[item.field] as string}
                    onValueChange={(value) =>
                      handleInputChange(item.field, value)
                    }
                  >
                    <Radio value="Sim">Sim</Radio>
                    <Radio value="Não">Não</Radio>
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Autoavaliação */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="5" title="Autoavaliação" />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              {[
                {
                  label: "Você se considera apto para trabalhar em altura?",
                  field: "autoAvaliacaoAltura" as keyof PsicossocialData,
                  options: [
                    { value: "Sim", label: "Sim" },
                    { value: "Não", label: "Não" },
                    { value: "Indefinido", label: "Indefinido" },
                  ],
                },
                {
                  label:
                    "Você se considera apto para trabalhar em espaço confinado?",
                  field: "autoAvaliacaoConfinado" as keyof PsicossocialData,
                  options: [
                    { value: "Sim", label: "Sim" },
                    { value: "Não", label: "Não" },
                    { value: "Indefinido", label: "Indefinido" },
                  ],
                },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {item.label}
                  </label>
                  <RadioGroup
                    classNames={{ wrapper: "flex gap-6" }}
                    color="success"
                    orientation="horizontal"
                    value={formData[item.field] as string}
                    onValueChange={(value) =>
                      handleInputChange(item.field, value)
                    }
                  >
                    {item.options.map((option) => (
                      <Radio key={option.value} value={option.value}>
                        {option.label}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 6. Conclusão */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="6" title="Conclusão" />

        <div className="space-y-6">
          <div className="p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações do avaliador:
              </label>
              <Textarea
                className="bg-white border-gray-300"
                placeholder="Observações sobre a avaliação psicossocial..."
                rows={3}
                value={formData.observacoes}
                onChange={(e) =>
                  handleInputChange("observacoes", e.target.value)
                }
              />
            </div>
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
          {isLoading ? "Salvando..." : "Salvar / Concluir Avaliação"}
        </Button>
      </div>
    </div>
  );
};

export default Psicossocial;
