import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, RadioGroup, Radio } from "@heroui/react";
import { FileText } from "lucide-react";

import HeaderExame from "./HeaderExame";

import { useUser } from "@/hooks/useUser";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface UltrassomProps {
  atendimento: any;
  exame: string;
  formulario: any;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

interface UltrassomData {
  normal: string;
  observacoes: string;
}

const Ultrassom: React.FC<UltrassomProps> = ({
  atendimento,
  exame,
  formulario,
  onSave,
  onClose,
}) => {
  const user = useUser();
  const [agendamento, setAgendamento] = useState<Scheduling>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<UltrassomData>({
    normal: "Sim",
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
    (field: keyof UltrassomData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSave?.(formData);
    } catch (error) {
      console.error("Erro ao salvar ultrassom:", error);
    } finally {
      setIsSubmitting(false);
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
    <div className="max-w-4xl mx-auto p-6 space-y-6 min-h-screen">
      <HeaderExame agendamento={agendamento} exame={exame} />

      {/* 2. Resultado do Exame */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="2" title="Resultado do Ultrassom" />

        <div className="space-y-6">
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  EXAME NORMAL ?
                </label>
                <RadioGroup
                  classNames={{ wrapper: "flex gap-6" }}
                  color="success"
                  orientation="horizontal"
                  value={formData.normal}
                  onValueChange={(value) => handleInputChange("normal", value)}
                >
                  <Radio value="Sim">Sim</Radio>
                  <Radio value="Não">Não</Radio>
                </RadioGroup>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        <Button
          className="px-8 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          disabled={isSubmitting}
          variant="flat"
          onPress={onClose}
        >
          Cancelar
        </Button>
        <Button
          className="px-8 bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
          color="primary"
          disabled={isSubmitting}
          startContent={isSubmitting ? null : <FileText className="h-4 w-4" />}
          onPress={handleSave}
        >
          {isSubmitting ? "Salvando..." : "Salvar / Concluir Exame"}
        </Button>
      </div>
    </div>
  );
};

export default Ultrassom;
