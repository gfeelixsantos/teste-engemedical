import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Textarea,
  Checkbox,
  Radio,
  RadioGroup,
  Spinner,
} from "@heroui/react";
import { FileText, TriangleAlert } from "lucide-react";

import HeaderExame from "./HeaderExame";

import { IUserInfo, useUser } from "@/hooks/useUser";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { getCurrentUser } from "@/lib/utils";

interface FichaAssistencialProps {
  atendimento: any;
  exame: string;
  formulario: any;
  operationalUser?: IUserInfo | null;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

interface RegistroPa {
  valor: string;
  horario: string;
  profissional: string;
}

export interface FichaAssistencialData {
  // Sinais Vitais
  pressaoArterial: RegistroPa[];
  peso: string;
  altura: string;
  imc: string;
  resultadoImc: string;

  // Informações Clínicas
  queixaPrincipal: string;
  historiaDoencaAtual: string;
  hipoteseDiagnostica: string;
  antecedentesPessoais: string;
  exameFisico: string;
  resultadoExame: string;
  condutaMedica: string;

  // Aspectos Ocupacionais e Conduta
  nexoOcupacional: "Sim" | "Não" | "Inconclusivo";
  descricaoNexo: string;
  restricaoLaboral: "Sim" | "Não";
  descricaoRestricao: string;

  // Retorno
  retorno: "Sim" | "Não";
  retornoDias: string;

  // Identificação do Profissional
  codigoMedico: string;
  medico: string;
}

const VALOR_INICIAL: FichaAssistencialData = {
  pressaoArterial: [],
  peso: "",
  altura: "",
  imc: "",
  resultadoImc: "",
  queixaPrincipal: "",
  historiaDoencaAtual: "",
  hipoteseDiagnostica: "",
  antecedentesPessoais: "",
  exameFisico: "",
  nexoOcupacional: "Não",
  descricaoNexo: "",
  resultadoExame: "",
  condutaMedica: "",
  restricaoLaboral: "Não",
  descricaoRestricao: "",
  retorno: "Não",
  retornoDias: "",
  codigoMedico: "",
  medico: "",
};

// Componente de seção de título
const SectionTitle: React.FC<{ title: string; icon?: React.ReactNode }> =
  React.memo(({ title, icon }) => (
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-gray-600">{title}</span>
      </div>
    </div>
  ));

// Utilitários de cálculo e formatação
class ClinicaCalculator {
  static classificarIMC(imc: number): string {
    if (imc < 18.5) return "Abaixo do peso";
    if (imc < 25) return "Peso normal";
    if (imc < 30) return "Sobrepeso";
    if (imc < 35) return "Obesidade grau I";
    if (imc < 40) return "Obesidade grau II";
    return "Obesidade grau III";
  }

  static calcularIMC(
    peso: string,
    altura: string,
  ): { imc: string; resultado: string } {
    const pesoNum = parseFloat(peso.replace(",", "."));
    const alturaNum = parseFloat(altura.replace(",", "."));

    if (!isNaN(pesoNum) && !isNaN(alturaNum) && alturaNum > 0) {
      const imcValue = pesoNum / (alturaNum * alturaNum);
      const imc = imcValue.toFixed(2);
      const resultado = this.classificarIMC(imcValue);
      return { imc, resultado };
    }

    return { imc: "", resultado: "" };
  }

  static formatarPressaoArterial(value: string): string {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) {
      return numbers;
    }
    const parte1 = numbers.slice(0, 3);
    const parte2 = numbers.slice(3, 6);
    return parte2 ? `${parte1}/${parte2}` : parte1;
  }

  static formatarAltura(value: string): string {
    const cleaned = value.replace(/[^\d,]/g, "");
    if (cleaned.includes(",")) {
      return cleaned;
    }
    if (cleaned.length === 3) {
      return `${cleaned.slice(0, 1)},${cleaned.slice(1)}`;
    }
    return cleaned;
  }

  static verificarPressaoAlterada(pressao: string): boolean {
    if (!pressao || !pressao.includes("/")) return false;
    const [sistolica, diastolica] = pressao.split("/").map(Number);
    if (isNaN(sistolica) || isNaN(diastolica)) return false;
    return (
      sistolica < 90 || sistolica > 139 || diastolica < 60 || diastolica > 89
    );
  }
}

const FichaAssistencial: React.FC<FichaAssistencialProps> = ({
  atendimento,
  exame,
  formulario,
  operationalUser,
  onSave,
  onClose,
}) => {
  const user = useUser();
  const effectiveUser = operationalUser ?? getCurrentUser() ?? user;
  const [agendamento, setAgendamento] = useState<Scheduling>();
  const [pressaoAlterada, setPressaoAlterada] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FichaAssistencialData>(VALOR_INICIAL);
  const [showMedicoWarning, setShowMedicoWarning] = useState(false);

  const codigoMedicoFinal =
    formData.codigoMedico ||
    formulario?.codigoMedico ||
    effectiveUser?.codigo ||
    "";
  const medicoFinal =
    formData.medico ||
    formulario?.medico ||
    effectiveUser?.nome ||
    atendimento?.MEDICO ||
    "";
  const missingMedicoData = !codigoMedicoFinal || !medicoFinal;
  const formularioPreCarregado =
    !!formulario &&
    typeof formulario === "object" &&
    Object.keys(formulario).length > 0;

  useEffect(() => {
    if (atendimento) {
      setAgendamento(atendimento);
    }

    if (formulario) {
      setFormData((prev) => ({
        ...prev,
        ...formulario,
      }));
    }
  }, [atendimento, formulario]);

  // Verificar pressão arterial alterada (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const pressures = Array.isArray(formData.pressaoArterial)
        ? formData.pressaoArterial
        : [];
      const temPressaoAlterada = pressures.some(
        (pa) =>
          pa.valor && ClinicaCalculator.verificarPressaoAlterada(pa.valor),
      );
      setPressaoAlterada(temPressaoAlterada);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [formData.pressaoArterial]);

  // Cálculo do IMC (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const { imc, resultado } = ClinicaCalculator.calcularIMC(
        formData.peso,
        formData.altura,
      );

      setFormData((prev) => {
        if (prev.imc === imc && prev.resultadoImc === resultado) {
          return prev;
        }
        return {
          ...prev,
          imc,
          resultadoImc: resultado,
        };
      });
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [formData.peso, formData.altura]);

  useEffect(() => {
    if (!missingMedicoData) {
      setShowMedicoWarning(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      setShowMedicoWarning(true);
    }, 700);
    return () => clearTimeout(timeoutId);
  }, [missingMedicoData]);

  // Handlers
  const handleInputChange = useCallback(
    (field: keyof FichaAssistencialData, value: any) => {
      let formattedValue = value;
      if (field === "altura") {
        formattedValue = ClinicaCalculator.formatarAltura(value);
      }
      setFormData((prev) => ({ ...prev, [field]: formattedValue }));
      if (formErrors[field]) {
        setFormErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [formErrors],
  );

  const handlePressaoArterialChange = useCallback(
    (index: number, value: string) => {
      const formatted = ClinicaCalculator.formatarPressaoArterial(value);
      setFormData((prev) => {
        const novas = [
          ...(Array.isArray(prev.pressaoArterial) ? prev.pressaoArterial : []),
        ];
        if (novas[index]) {
          novas[index] = { ...novas[index], valor: formatted };
        }
        return { ...prev, pressaoArterial: novas };
      });
    },
    [],
  );

  const handleAddPressaoArterial = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      pressaoArterial: [
        ...(Array.isArray(prev.pressaoArterial) ? prev.pressaoArterial : []),
        {
          valor: "",
          horario: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          profissional: effectiveUser?.nome ?? "",
        },
      ],
    }));
  }, [effectiveUser?.nome]);

  const handleRemovePressaoArterial = useCallback((index: number) => {
    setFormData((prev) => {
      const novas = [
        ...(Array.isArray(prev.pressaoArterial) ? prev.pressaoArterial : []),
      ];
      novas.splice(index, 1);
      return { ...prev, pressaoArterial: novas };
    });
  }, []);

  // Validação do formulário
  const validateForm = useCallback(
    (codigo: string, nome: string): boolean => {
      const errors: Record<string, string> = {};

      // 1. Validação da Pressão Arterial
      const pressoes = Array.isArray(formData.pressaoArterial)
        ? formData.pressaoArterial
        : [];
      if (pressoes.length === 0) {
        errors.pressaoArterial =
          "Pelo menos uma aferição de pressão arterial é obrigatória";
      } else {
        const temAfericaoValida = pressoes.some(
          (pa) => pa.valor && pa.valor.trim() && pa.valor.includes("/"),
        );
        if (!temAfericaoValida) {
          errors.pressaoArterial =
            "É necessário preencher o valor da pressão arterial (formato: 120/80)";
        }
      }

      // 2. Validação de Peso e Altura
      if (!formData.peso.trim()) {
        errors.peso = "Peso é obrigatório";
      }
      if (!formData.altura.trim()) {
        errors.altura = "Altura é obrigatória";
      }

      // 3. Validação do Médico
      if (!codigo || !nome) {
        errors.medico =
          "Dados do médico não encontrados. Por favor, atualize a página ou faça login novamente.";
      }

      // 4. Validação Condicional do Nexo Ocupacional
      if (
        (formData.nexoOcupacional === "Sim" ||
          formData.nexoOcupacional === "Inconclusivo") &&
        !formData.descricaoNexo.trim()
      ) {
        errors.descricaoNexo =
          "Descrição do nexo ocupacional é obrigatória para Sim ou Inconclusivo";
      }

      // 5. Validação Condicional da Restrição Laboral
      if (
        formData.restricaoLaboral === "Sim" &&
        !formData.descricaoRestricao.trim()
      ) {
        errors.descricaoRestricao =
          "Descrição da restrição laboral é obrigatória quando há restrição";
      }

      // 6. Validação Condicional do Retorno
      if (formData.retorno === "Sim" && !formData.retornoDias.trim()) {
        errors.retornoDias =
          "Quantidade de dias de retorno é obrigatória";
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [formData],
  );

  const handleSave = useCallback(async () => {
    if (!validateForm(codigoMedicoFinal, medicoFinal)) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave?.({
        ...formData,
        codigoMedico: codigoMedicoFinal,
        medico: medicoFinal,
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, onSave, validateForm, codigoMedicoFinal, medicoFinal]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4 min-h-screen">
      <HeaderExame
        agendamento={agendamento}
        exame={exame}
        formularioPreCarregado={formularioPreCarregado}
      />

      {missingMedicoData && !showMedicoWarning && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg flex items-center gap-3">
          <Spinner color="default" size="sm" />
          <p className="text-sm">Carregando dados do médico responsável...</p>
        </div>
      )}

      {missingMedicoData && showMedicoWarning && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
          <TriangleAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">
              Atenção: Dados do médico não carregados
            </h3>
            <p className="text-sm mt-1">
              As informações do médico responsável (código e nome) não puderam
              ser identificadas. Não será possível salvar a ficha. Por favor,
              atualize a página ou faça login novamente.
            </p>
          </div>
        </div>
      )}

      {/* 1. SINAIS VITAIS */}
      <Card className="p-6 shadow-none border border-gray-200 bg-white">
        <div className="flex justify-between items-center mb-4">
          <SectionTitle title="Sinais Vitais e Medidas" />
          <Button
            color="success"
            size="sm"
            variant="flat"
            onPress={handleAddPressaoArterial}
          >
            + Adicionar Aferição PA
          </Button>
        </div>

        {/* Histórico PA */}
        <div className="p-2 space-y-2">
          {formErrors.pressaoArterial && (
            <p className="text-xs text-red-600 mb-2">{formErrors.pressaoArterial}</p>
          )}

          {formData.pressaoArterial.map((pa, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-gray-50/50 p-3 rounded-lg border border-gray-100"
            >
              <div>
                <Input
                  label="Valor (mmHg)"
                  maxLength={7}
                  placeholder="120/80"
                  value={pa.valor}
                  variant="bordered"
                  size="sm"
                  onChange={(e) =>
                    handlePressaoArterialChange(index, e.target.value)
                  }
                />
              </div>
              <div>
                <Input
                  label="Horário"
                  readOnly
                  type="time"
                  value={pa.horario}
                  variant="bordered"
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 truncate max-w-[120px]" title={pa.profissional}>
                  {pa.profissional}
                </span>
                <Button
                  color="danger"
                  size="sm"
                  variant="light"
                  onPress={() => handleRemovePressaoArterial(index)}
                >
                  Remover
                </Button>
              </div>

              {pa.valor && ClinicaCalculator.verificarPressaoAlterada(pa.valor) && (
                <div className="col-span-3 flex items-center gap-2 text-red-600">
                  <TriangleAlert className="w-4 h-4" />
                  <span className="text-xs font-medium">Pressão arterial alterada</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Peso, Altura, IMC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <Input
              label="Peso (kg)"
              placeholder="80,5"
              value={formData.peso}
              variant="bordered"
              onChange={(e) => handleInputChange("peso", e.target.value)}
            />
            {formErrors.peso && (
              <p className="text-xs text-red-600 mt-1">{formErrors.peso}</p>
            )}
          </div>

          <div>
            <Input
              label="Altura (m)"
              placeholder="1,75"
              value={formData.altura}
              variant="bordered"
              onChange={(e) => handleInputChange("altura", e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Vírgula colocada automaticamente</p>
            {formErrors.altura && (
              <p className="text-xs text-red-600 mt-1">{formErrors.altura}</p>
            )}
          </div>

          <div>
            <Input
              isReadOnly
              label="IMC"
              placeholder="Cálculo automático"
              value={formData.imc}
              variant="bordered"
            />
            {formData.resultadoImc && (
              <p
                className={`text-xs font-semibold mt-1 ${
                  formData.resultadoImc.includes("normal")
                    ? "text-green-600"
                    : formData.resultadoImc.includes("Abaixo")
                    ? "text-amber-600"
                    : "text-orange-600"
                }`}
              >
                {formData.resultadoImc}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* 2. ANAMNESE CLINICA */}
      <Card className="p-6 shadow-none border border-gray-200 bg-white space-y-4">
        <SectionTitle title="Anamnese e Informações Clínicas" />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Queixa Principal (QP)
            </label>
            <Textarea
              placeholder="Descreva a queixa principal apresentada pelo colaborador..."
              value={formData.queixaPrincipal}
              variant="bordered"
              rows={3}
              onChange={(e) => handleInputChange("queixaPrincipal", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              História da Doença Atual (HDA)
            </label>
            <Textarea
              placeholder="Descreva o histórico detalhado da queixa atual..."
              value={formData.historiaDoencaAtual}
              variant="bordered"
              rows={4}
              onChange={(e) => handleInputChange("historiaDoencaAtual", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Antecedentes Pessoais Relevantes
            </label>
            <Textarea
              placeholder="Doenças prévias, cirurgias, uso contínuo de medicamentos, histórico familiar relevante..."
              value={formData.antecedentesPessoais}
              variant="bordered"
              rows={3}
              onChange={(e) => handleInputChange("antecedentesPessoais", e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* 3. AVALIAÇÃO MÉDICA E CONDUTA */}
      <Card className="p-6 shadow-none border border-gray-200 bg-white space-y-4">
        <SectionTitle title="Exame Físico e Conduta Médica" />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exame Físico
            </label>
            <Textarea
              placeholder="Resultados do exame físico realizado..."
              value={formData.exameFisico}
              variant="bordered"
              rows={4}
              onChange={(e) => handleInputChange("exameFisico", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resultado de Exames
            </label>
            <Textarea
              placeholder="Resultado de exames laboratoriais ou de imagem avaliados..."
              value={formData.resultadoExame}
              variant="bordered"
              rows={3}
              onChange={(e) => handleInputChange("resultadoExame", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conduta Médica / Prescrição
            </label>
            <Textarea
              placeholder="Orientações médicas, condutas, receitas e prescrições terapêuticas..."
              value={formData.condutaMedica}
              variant="bordered"
              rows={4}
              onChange={(e) => handleInputChange("condutaMedica", e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* 4. ASPECTOS OCUPACIONAIS E RETORNO */}
      <Card className="p-6 shadow-none border border-gray-200 bg-white space-y-4">
        <SectionTitle title="Aspectos Ocupacionais e Planejamento" />

        <div className="grid grid-cols-1 gap-6 border-b border-gray-100 pb-4">
          {/* Nexo Ocupacional */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Nexo ocupacional suspeito?
            </label>
            <RadioGroup
              orientation="horizontal"
              color="success"
              value={formData.nexoOcupacional}
              onValueChange={(val) => handleInputChange("nexoOcupacional", val)}
            >
              <Radio value="Sim">Sim</Radio>
              <Radio value="Não">Não</Radio>
              <Radio value="Inconclusivo">Inconclusivo</Radio>
            </RadioGroup>

            {(formData.nexoOcupacional === "Sim" || formData.nexoOcupacional === "Inconclusivo") && (
              <div className="mt-2 pl-4 border-l-2 border-emerald-500">
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  Justificativa/Descrição do Nexo *
                </label>
                <Textarea
                  placeholder="Descreva a suspeita de nexo ou a justificativa da inconclusão..."
                  value={formData.descricaoNexo}
                  variant="bordered"
                  size="sm"
                  rows={2}
                  onChange={(e) => handleInputChange("descricaoNexo", e.target.value)}
                />
                {formErrors.descricaoNexo && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.descricaoNexo}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-b border-gray-100 pb-4">
          {/* Restrição Laboral */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Restrição Laboral?
            </label>
            <RadioGroup
              orientation="horizontal"
              color="success"
              value={formData.restricaoLaboral}
              onValueChange={(val) => handleInputChange("restricaoLaboral", val)}
            >
              <Radio value="Sim">Sim</Radio>
              <Radio value="Não">Não</Radio>
            </RadioGroup>

            {formData.restricaoLaboral === "Sim" && (
              <div className="mt-2 pl-4 border-l-2 border-emerald-500">
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  Descrição e Orientações de Restrição *
                </label>
                <Textarea
                  placeholder="Descreva detalhadamente as restrições laborais..."
                  value={formData.descricaoRestricao}
                  variant="bordered"
                  size="sm"
                  rows={3}
                  onChange={(e) => handleInputChange("descricaoRestricao", e.target.value)}
                />
                {formErrors.descricaoRestricao && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.descricaoRestricao}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Retorno */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Necessita Retorno?
            </label>
            <RadioGroup
              orientation="horizontal"
              color="success"
              value={formData.retorno}
              onValueChange={(val) => handleInputChange("retorno", val)}
            >
              <Radio value="Sim">Sim</Radio>
              <Radio value="Não">Não</Radio>
            </RadioGroup>

            {formData.retorno === "Sim" && (
              <div className="mt-2 pl-4 border-l-2 border-emerald-500 flex items-center gap-4">
                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">
                    Retorno em (dias) *
                  </label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={formData.retornoDias}
                    variant="bordered"
                    size="sm"
                    className="w-32"
                    onChange={(e) => handleInputChange("retornoDias", e.target.value)}
                  />
                  {formErrors.retornoDias && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.retornoDias}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hipótese Diagnóstica */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hipótese Diagnóstica (HD)
          </label>
          <Textarea
            placeholder="Hipótese Diagnóstica ou CID correspondente..."
            value={formData.hipoteseDiagnostica}
            variant="bordered"
            rows={2}
            onChange={(e) => handleInputChange("hipoteseDiagnostica", e.target.value)}
          />
        </div>
      </Card>

      {/* AÇÕES */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        {(formErrors.pressaoArterial || formErrors.medico) && (
          <div className="flex-1 p-3 bg-red-50 border border-red-200 rounded-md">
            {formErrors.pressaoArterial && (
              <p className="text-sm text-red-600 flex items-center gap-2 mb-1">
                <TriangleAlert className="w-4 h-4" />
                {formErrors.pressaoArterial}
              </p>
            )}
            {formErrors.medico && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <TriangleAlert className="w-4 h-4" />
                {formErrors.medico}
              </p>
            )}
          </div>
        )}

        <Button
          className="px-8 border border-gray-300 text-gray-700 hover:bg-gray-50"
          isDisabled={isLoading}
          variant="flat"
          onPress={onClose}
        >
          Cancelar
        </Button>
        
        <Button
          className="px-8 bg-[#104e35] text-white shadow-sm hover:bg-[#0d3d29] transition-colors"
          color="success"
          isDisabled={isLoading || missingMedicoData}
          isLoading={isLoading}
          startContent={
            isLoading ? null : <FileText className="h-4 w-4" />
          }
          onPress={handleSave}
        >
          Concluir Ficha Assistencial
        </Button>
      </div>
    </div>
  );
};

export default React.memo(FichaAssistencial);
