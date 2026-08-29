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
  Image,
} from "@heroui/react";
import { FileText, TriangleAlert } from "lucide-react";

import HeaderExame from "./HeaderExame";

import { IUserInfo, useUser } from "@/hooks/useUser";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { getCurrentUser } from "@/lib/utils";

interface FichaClinicaProps {
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

interface RestricoesMedicas {
  evitarCarregarPeso: boolean;
  pesoMaximoKg?: string;
  evitarElevacaoBracos: boolean;
  tipoElevacaoBracos?: "direito" | "esquerdo" | "ambos";
  evitarCurvarTronco: boolean;
  evitarEscadas: boolean;
  evitarLongasCaminhadas: boolean;
  evitarAlterarPostura: boolean;
  outros: boolean;
  descricaoOutros?: string;
}

interface TestesArticulares {
  // 1 - PUNHOS
  testePhalen?: "Positivo" | "Negativo";
  testeFinkelstein?: "Positivo" | "Negativo";

  // 2 - COTOVELOS
  cotovelosMovimentacao?: "Normal" | "Alterado";
  cotovelosObservacoes?: string;

  // 3 - OMBROS
  testeJobe?: "Positivo" | "Negativo";
  testeGerber?: "Positivo" | "Negativo";
  testeNeer?: "Positivo" | "Negativo";
  testeYocum?: "Positivo" | "Negativo";
  amplitudeMovimentosArticulares?: "Normal" | "Alterado";
  amplitudeAlteradoEm?: string;

  // 4 - COLUNA LOMBAR
  // Desvios
  desviosCifose?: boolean;
  desviosLordose?: boolean;
  desviosEscoliose?: boolean;
  desviosNaoIdentificados?: boolean;

  // Alongamento
  alongamentoBoaAmplitude?: boolean;
  alongamentoFlexaoLimitada?: boolean;
  alongamentoFlexaoLimitadaGraus?: string;

  // Lasegue
  laseguePositivo?: boolean;
  lasegueNegativo?: boolean;

  // Andar nas pontas dos pés (S1)
  andarPontasPesSim?: boolean;
  andarPontasPesComDificuldade?: boolean;
  andarPontasPesNaoConsegue?: boolean;

  // Andar em calcanhares (L5)
  andarCalcanharesSim?: boolean;
  andarCalcanharesComDificuldade?: boolean;
  andarCalcanharesNaoConsegue?: boolean;

  // Presença de cicatrizes articulares ou em coluna
  cicatrizesArticularesPresente?: boolean;
  cicatrizesArticularesEspecifique?: string;

  // Presença de nódulos/cistos articulares
  nodulosCistosPresente?: boolean;
  nodulosCistosEspecifique?: string;
}

export interface FichaClinicaData {
  doencasFamiliares: string[];
  doencasPessoais: string[];
  afastamento: string;
  observacaoAfastamento: string;
  tabagismo: string;
  etilismo: string;
  atividadeFisica: string;
  acimaPeso: string;
  ultimaMenstruacao: string;
  trabalhoAltura: string;
  trabalhoEspacoConfinado: string;
  capacidadeCarregarPeso: string;
  aptoOperarVeiculos: string;
  cabecaPescoco: string;
  torax: string;
  abdome: string;
  coluna: string;
  membrosSuperiores: string;
  membrosInferiores: string;
  pressaoArterial: RegistroPa[];
  peso: string;
  altura: string;
  imc: string;
  resultadoImc: string;
  conclusao: string;
  observacoesMedicas: string;
  codigoMedico: string;
  medico: string;
  observacoesDoencasPessoais: string;
  restricoes?: RestricoesMedicas;
  duracaoRestricaoDias?: string;
  dataInicioRestricao?: string;
  informacaoAguardarAvaliacao?: string;
  testesArticulares?: TestesArticulares;
}

// Constantes otimizadas
const DOENCAS_FAMILIARES_OPTIONS = [
  "Cardiopatias / Hipertensão",
  "Diabetes",
  "Câncer",
  "Doenças psiquiátricas",
  "Doenças respiratórias",
  "Nenhuma",
] as const;

const DOENCAS_PESSOAIS_OPTIONS = [
  "Hipertensão",
  "Diabetes",
  "Doenças osteomusculares (DORT / lombalgia)",
  "Asma / Doença pulmonar",
  "Depressão / Ansiedade",
  "Cirurgias prévias",
  "Uso de medicação",
  "Outros",
] as const;

const TABAGISMO_OPTIONS = [
  { value: "Não", label: "Não" },
  { value: "Sim - até 10 cigarros/dia", label: "Sim - até 10 cigarros/dia" },
  { value: "Sim - >10 cigarros/dia", label: "Sim - >10 cigarros/dia" },
] as const;

const ETILISMO_OPTIONS = [
  { value: "Não", label: "Não" },
  { value: "Social", label: "Social" },
  { value: "Frequente", label: "Frequente" },
] as const;

const ATIVIDADE_FISICA_OPTIONS = [
  { value: "Não", label: "Não" },
  { value: "Ocasionalmente", label: "Ocasionalmente" },
  { value: "Regularmente", label: "Regularmente" },
] as const;

const ACIMA_PESO_OPTIONS = [
  { value: "Não", label: "Não" },
  { value: "Sim", label: "Sim" },
] as const;

const APTIDAO_OPTIONS = [
  { value: "Apto", label: "Apto" },
  { value: "Inapto", label: "Inapto" },
  { value: "Indefinido", label: "Indefinido" },
] as const;

const CONCLUSAO_OPTIONS = [
  { value: "Apto", label: "Apto" },
  { value: "Apto com restrições", label: "Apto com restrições" },
  { value: "Inapto Temporariamente", label: "Inapto Temporariamente" },
  { value: "Inapto", label: "Inapto" },
  { value: "Aguardar Avaliação", label: "Aguardar Avaliação" },
] as const;

const normalizarConclusaoClinica = (conclusao?: string): string | undefined => {
  if (!conclusao) return undefined;

  const normalizarTexto = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();

  const valorNormalizado = normalizarTexto(conclusao);
  const opcao = CONCLUSAO_OPTIONS.find(
    (item) => normalizarTexto(item.value) === valorNormalizado,
  );

  return opcao?.value ?? conclusao;
};
const TESTE_ARTICULAR_PADRAO: TestesArticulares = {
  // 1 - PUNHOS
  testePhalen: "Negativo",
  testeFinkelstein: "Negativo",

  // 2 - COTOVELOS
  cotovelosMovimentacao: "Normal",
  cotovelosObservacoes: "",

  // 3 - OMBROS
  testeJobe: "Negativo",
  testeGerber: "Negativo",
  testeNeer: "Negativo",
  testeYocum: "Negativo",
  amplitudeMovimentosArticulares: "Normal",
  amplitudeAlteradoEm: "",

  // 4 - COLUNA LOMBAR
  desviosCifose: false,
  desviosLordose: false,
  desviosEscoliose: false,
  desviosNaoIdentificados: true,

  alongamentoBoaAmplitude: true,
  alongamentoFlexaoLimitada: false,
  alongamentoFlexaoLimitadaGraus: "",

  laseguePositivo: false,
  lasegueNegativo: true,

  andarPontasPesSim: true,
  andarPontasPesComDificuldade: false,
  andarPontasPesNaoConsegue: false,

  andarCalcanharesSim: true,
  andarCalcanharesComDificuldade: false,
  andarCalcanharesNaoConsegue: false,

  cicatrizesArticularesPresente: false,
  cicatrizesArticularesEspecifique: "",

  nodulosCistosPresente: false,
  nodulosCistosEspecifique: "",
};

const VALOR_INICIAL: FichaClinicaData = {
  doencasFamiliares: ["Nenhuma"],
  doencasPessoais: [],
  afastamento: "Não",
  observacaoAfastamento: "",
  tabagismo: "Não",
  etilismo: "Não",
  atividadeFisica: "Não",
  acimaPeso: "Não",
  ultimaMenstruacao: "",
  trabalhoAltura: "Apto",
  trabalhoEspacoConfinado: "Apto",
  capacidadeCarregarPeso: "Apto",
  aptoOperarVeiculos: "Apto",
  cabecaPescoco: "Normal",
  torax: "Normal",
  abdome: "Normal",
  coluna: "Normal",
  membrosSuperiores: "Normal",
  membrosInferiores: "Normal",
  pressaoArterial: [],
  peso: "",
  altura: "",
  imc: "",
  resultadoImc: "",
  conclusao: "Apto",
  observacoesMedicas: "",
  codigoMedico: "",
  medico: "",
  observacoesDoencasPessoais: "",
  restricoes: {
    evitarCarregarPeso: false,
    pesoMaximoKg: "",
    evitarElevacaoBracos: false,
    tipoElevacaoBracos: undefined,
    evitarCurvarTronco: false,
    evitarEscadas: false,
    evitarLongasCaminhadas: false,
    evitarAlterarPostura: false,
    outros: false,
    descricaoOutros: "",
  },
  duracaoRestricaoDias: "",
  dataInicioRestricao: "",
  informacaoAguardarAvaliacao: "",
  testesArticulares: { ...TESTE_ARTICULAR_PADRAO },
};

// Componente de input otimizado
const FormattedInput = React.memo(
  ({
    value,
    onChange,
    placeholder = "",
    type = "text",
    className = "",
    maxLength,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    maxLength?: number;
  }) => {
    return (
      <input
        className={`h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        maxLength={maxLength}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
);

// Componente de seção
const SectionTitle: React.FC<{ title: string; icon?: React.ReactNode }> =
  React.memo(({ title, icon }) => (
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-gray-600">{title}</span>
      </div>
    </div>
  ));

// Serviço de cálculos e formatações
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

  static formatarData(value: string): string {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 2) {
      return numbers;
    }

    if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
    }

    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
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

const FichaClinicaOcupacional: React.FC<FichaClinicaProps> = ({
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
  const [tipoAdmissional, setTipoAdmissional] = useState<boolean>(false);
  const [pressaoAlterada, setPressaoAlterada] = useState<boolean>(false);
  const [aplicarTesteArticular, setAplicarTesteArticular] =
    useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<FichaClinicaData>({
    ...VALOR_INICIAL,
  });

  const [showObservacoesPessoais, setShowObservacoesPessoais] =
    useState<boolean>(false);
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
        conclusao:
          normalizarConclusaoClinica(formulario?.conclusao) ?? prev.conclusao,
      }));
    }

    // Tipo exame (numérico/string) — normaliza também
    const tipoExame = String(atendimento?.TIPOEXAME ?? "");

    if (tipoExame === "1") {
      setTipoAdmissional(true);
    } else {
      setTipoAdmissional(false);
    }
  }, [atendimento, formulario]);

  // Verificar pressão arterial alterada - DEBOUNCED
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

  // Cálculo do IMC - DEBOUNCED
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

  // Handlers otimizados
  const handleInputChange = useCallback(
    (field: keyof FichaClinicaData, value: any) => {
      let formattedValue = value;

      if (field === "altura") {
        formattedValue = ClinicaCalculator.formatarAltura(value);
      } else if (field === "ultimaMenstruacao") {
        formattedValue = ClinicaCalculator.formatarData(value);
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
    [formData.pressaoArterial],
  );

  const handleMultiSelectChange = useCallback(
    (field: keyof FichaClinicaData, value: string) => {
      setFormData((prev) => {
        const currentValues = prev[field] as string[];

        if (field === "doencasPessoais") {
          const newValues = currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value];

          setShowObservacoesPessoais(newValues.length > 0);

          return { ...prev, [field]: newValues };
        }

        const newValues = currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value];

        return { ...prev, [field]: newValues };
      });
    },
    [],
  );

  const handleRestricoesChange = useCallback(
    (field: keyof RestricoesMedicas, value: any) => {
      setFormData((prev) => ({
        ...prev,
        restricoes: {
          ...prev.restricoes!,
          [field]: value,
        },
      }));
    },
    [],
  );

  const handleTestesArticularesChange = useCallback(
    (field: keyof TestesArticulares, value: any) => {
      setFormData((prev) => ({
        ...prev,
        testesArticulares: {
          ...prev.testesArticulares!,
          [field]: value,
        },
      }));
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
  // Validação do formulário - VERSÃO CORRIGIDA
  const validateForm = useCallback(
    (codigo: string, nome: string): boolean => {
      const errors: Record<string, string> = {};

      // 1. VALIDAÇÃO DA PRESSÃO ARTERIAL (OBRIGATÓRIO)
      const pressoesArteriais = Array.isArray(formData.pressaoArterial)
        ? formData.pressaoArterial
        : [];

      if (pressoesArteriais.length === 0) {
        errors.pressaoArterial =
          "Pelo menos uma aferição de pressão arterial é obrigatória";
      } else {
        // Verifica se há pelo menos uma aferição com valor válido (formato 120/80)
        const temAfericaoValida = pressoesArteriais.some((pa) => {
          if (!pa.valor || !pa.valor.trim()) return false;

          // Valida o formato da pressão arterial (ex: 120/80)
          const partes = pa.valor.split("/");

          if (partes.length !== 2) return false;

          const sistolica = parseInt(partes[0]);
          const diastolica = parseInt(partes[1]);

          return (
            !isNaN(sistolica) &&
            !isNaN(diastolica) &&
            sistolica > 0 &&
            diastolica > 0
          );
        });

        if (!temAfericaoValida) {
          errors.pressaoArterial =
            "É necessário preencher pelo menos uma aferição de pressão arterial válida (formato: 120/80)";
        }
      }

      // 2. VALIDAÇÃO DO PESO (OBRIGATÓRIO)
      const pesoValor = formData.peso.trim();

      if (!pesoValor) {
        errors.peso = "Peso é obrigatório";
      } else {
        // Valida se o peso é um número válido
        const pesoNum = parseFloat(pesoValor.replace(",", "."));

        if (isNaN(pesoNum) || pesoNum <= 0 || pesoNum > 300) {
          errors.peso = "Informe um peso válido (ex: 70,5)";
        }
      }

      // 3. VALIDAÇÃO DA ALTURA (OBRIGATÓRIO)
      const alturaValor = formData.altura.trim();

      if (!alturaValor) {
        errors.altura = "Altura é obrigatória";
      } else {
        // Valida se a altura é um número válido
        const alturaNum = parseFloat(alturaValor.replace(",", "."));

        if (isNaN(alturaNum) || alturaNum <= 0 || alturaNum > 3) {
          errors.altura = "Informe uma altura válida (ex: 1,75)";
        }
      }

      // 4. VALIDAÇÃO DO MÉDICO (OBRIGATÓRIO)
      if (!codigo || !nome) {
        errors.medico =
          "Dados do médico não encontrados. Por favor, atualize a pagina ou faca login novamente.";
      }

      // 5. Validações existentes (mantidas sem alteração)
      if (
        showObservacoesPessoais &&
        !formData.observacoesDoencasPessoais.trim()
      ) {
        errors.observacoesDoencasPessoais =
          "Observações são obrigatórias quando há doenças pessoais selecionadas";
      }

      if (formData.conclusao === "Apto com restrições") {
        if (!formData.duracaoRestricaoDias?.trim()) {
          errors.duracaoRestricaoDias =
            "Duração provável é obrigatória para apto com restrições";
        }
        if (!formData.dataInicioRestricao?.trim()) {
          errors.dataInicioRestricao =
            "Data de início é obrigatória para apto com restrições";
        }
      }

      if (
        formData.conclusao === "Aguardar Avaliação" &&
        !formData.informacaoAguardarAvaliacao?.trim()
      ) {
        errors.informacaoAguardarAvaliacao =
          "Informação médica é obrigatória para aguardar avaliação";
      }

      setFormErrors(errors);

      return Object.keys(errors).length === 0;
    },
    [formData, showObservacoesPessoais],
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

  // Componentes reutilizáveis otimizados
  const SimNaoCheckboxGroup = useCallback(
    ({
      field,
      label,
      options,
    }: {
      field: keyof FichaClinicaData;
      label: string;
      options: readonly { value: string; label: string }[];
    }) => (
      <div className="p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
        <div className="flex gap-6">
          {options.map((option) => (
            <Checkbox
              key={option.value}
              classNames={{
                base: "hover:bg-gray-100 rounded-lg p-2 transition-colors",
                label: "text-sm font-medium text-gray-700",
              }}
              color="success"
              isSelected={formData[field] === option.value}
              onValueChange={(checked) => {
                if (checked) {
                  handleInputChange(field, option.value);
                }
              }}
            >
              {option.label}
            </Checkbox>
          ))}
        </div>
      </div>
    ),
    [formData, handleInputChange],
  );

  const MultiSelectCheckboxGroup = useCallback(
    ({
      field,
      label,
      options,
    }: {
      field: keyof FichaClinicaData;
      label: string;
      options: readonly string[];
    }) => (
      <div className=" p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((option) => (
            <Checkbox
              key={option}
              classNames={{
                base: "w-full max-w-full hover:bg-gray-100 rounded-lg p-2 transition-colors",
                label: "text-sm text-gray-700",
              }}
              color="success"
              isSelected={(formData[field] as string[]).includes(option)}
              onValueChange={() => handleMultiSelectChange(field, option)}
            >
              {option}
            </Checkbox>
          ))}
        </div>
      </div>
    ),
    [formData, handleMultiSelectChange],
  );

  const AptidaoCheckboxGroup = useCallback(
    ({ field, label }: { field: keyof FichaClinicaData; label: string }) => (
      <div className="p-4 grid grid-cols-2">
        <span className="text-sm align-center font-medium text-gray-700">
          {label}
        </span>
        <div className="flex gap-6">
          {APTIDAO_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              classNames={{
                label: "text-sm text-gray-700",
              }}
              color={
                option.value === "Apto"
                  ? "success"
                  : option.value === "Inapto"
                    ? "danger"
                    : "default"
              }
              isSelected={formData[field] === option.value}
              onValueChange={(checked) => {
                if (checked) {
                  handleInputChange(field, option.value);
                }
              }}
            >
              {option.label}
            </Checkbox>
          ))}
        </div>
      </div>
    ),
    [formData, handleInputChange],
  );

  const ExameClinicoItem = useCallback(
    ({ label, field }: { label: string; field: keyof FichaClinicaData }) => (
      <div className="p-4">
        <span className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </span>
        <div className="flex gap-4">
          <Checkbox
            classNames={{
              label: "text-gray-700",
            }}
            color="success"
            isSelected={formData[field] === "Normal"}
            onValueChange={(checked) =>
              handleInputChange(field, checked ? "Normal" : "Alterado")
            }
          >
            Normal
          </Checkbox>
          <Checkbox
            classNames={{
              label: "text-gray-700",
            }}
            color="danger"
            isSelected={formData[field] === "Alterado"}
            onValueChange={(checked) =>
              handleInputChange(field, checked ? "Alterado" : "Normal")
            }
          >
            Alterado
          </Checkbox>
        </div>
      </div>
    ),
    [formData, handleInputChange],
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-3 min-h-screen">
      <HeaderExame
        agendamento={agendamento}
        exame={exame}
        formularioPreCarregado={formularioPreCarregado}
      />

      {missingMedicoData && !showMedicoWarning && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-lg flex items-center gap-3">
          <Spinner color="default" size="sm" />
          <p className="text-sm">Carregando dados do medico responsavel...</p>
        </div>
      )}

      {missingMedicoData && showMedicoWarning && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
          <TriangleAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">
              Atencao: Dados do medico nao carregados
            </h3>
            <p className="text-sm mt-1">
              As informacoes do medico responsavel (codigo e nome) nao puderam
              ser identificadas. Nao sera possivel salvar a ficha clinica. Por
              favor, atualize a pagina ou faca login novamente.
            </p>
          </div>
        </div>
      )}

      {/* 2. Anamnese e Histórico Familiar */}
      {tipoAdmissional && !exame.includes("Triagem") && (
        <>
          <Card className="p-6 shadow-none border border-gray-200 bg-white">
            <SectionTitle title="Anamnese e Histórico Familiar" />

            <div className="space-y-6">
              <MultiSelectCheckboxGroup
                field="doencasFamiliares"
                label="Doenças familiares relevantes:"
                options={DOENCAS_FAMILIARES_OPTIONS}
              />

              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Doenças pessoais / antecedentes
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DOENCAS_PESSOAIS_OPTIONS.map((doenca) => (
                    <Checkbox
                      key={doenca}
                      classNames={{
                        base: "w-full max-w-full hover:bg-gray-100 rounded-lg p-2 transition-colors",
                        label: "text-sm text-gray-700",
                      }}
                      color="success"
                      isSelected={formData.doencasPessoais.includes(doenca)}
                      onValueChange={() =>
                        handleMultiSelectChange("doencasPessoais", doenca)
                      }
                    >
                      {doenca}
                    </Checkbox>
                  ))}
                </div>

                {showObservacoesPessoais && (
                  <div className="mt-4 p-4">
                    <label className="block text-sm font-medium text-blue-700 mb-2">
                      Observações - Doenças Pessoais
                      <span className="text-blue-500 ml-1">*</span>
                    </label>
                    <Textarea
                      className={`w-full border-blue-300 focus:border-blue-400 ${
                        formErrors.observacoesDoencasPessoais
                          ? "border-red-500"
                          : ""
                      }`}
                      placeholder="Descreva as observações sobre as doenças pessoais/antecedentes selecionados..."
                      rows={3}
                      value={formData.observacoesDoencasPessoais}
                      onChange={(e) =>
                        handleInputChange(
                          "observacoesDoencasPessoais",
                          e.target.value,
                        )
                      }
                    />
                    {formErrors.observacoesDoencasPessoais && (
                      <p className="text-xs text-red-600 mt-1">
                        {formErrors.observacoesDoencasPessoais}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Já sofreu acidente ou afastamento {">"} 15 dias?
                </label>
                <RadioGroup
                  classNames={{
                    wrapper: "gap-6",
                  }}
                  color="success"
                  orientation="horizontal"
                  value={formData.afastamento}
                  onValueChange={(value) =>
                    handleInputChange("afastamento", value)
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

              {formData.afastamento === "Sim" && (
                <div className="p-4">
                  <label className="block text-sm font-medium text-amber-700 mb-2">
                    Observação - Motivo do Acidente/Afastamento:
                  </label>
                  <Textarea
                    className="w-full border-amber-300 focus:border-amber-400"
                    placeholder="Descreva o motivo do acidente ou afastamento prolongado..."
                    rows={3}
                    value={formData.observacaoAfastamento}
                    onChange={(e) =>
                      handleInputChange("observacaoAfastamento", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </Card>

          {/* 3. Hábitos e Condições Gerais */}
          <Card className="p-6 shadow-none border border-gray-200 bg-white">
            <SectionTitle title="Hábitos e Condições Gerais" />

            <div>
              <SimNaoCheckboxGroup
                field="tabagismo"
                label="Tabagismo:"
                options={TABAGISMO_OPTIONS}
              />

              <SimNaoCheckboxGroup
                field="etilismo"
                label="Etilismo:"
                options={ETILISMO_OPTIONS}
              />

              <SimNaoCheckboxGroup
                field="atividadeFisica"
                label="Pratica atividade física?"
                options={ATIVIDADE_FISICA_OPTIONS}
              />

              <SimNaoCheckboxGroup
                field="acimaPeso"
                label="Considera-se acima do peso?"
                options={ACIMA_PESO_OPTIONS}
              />
            </div>
          </Card>
        </>
      )}

      {/* Seção de preenchimento médico */}
      {!exame.includes("Triagem") && (
        <div>
          {/* 4. Aptidões Funcionais */}
          <Card className="p-6 shadow-none border border-gray-200 bg-white mb-6">
            <SectionTitle title="Aptidões Funcionais" />

            <div className="space-y-4">
              <AptidaoCheckboxGroup
                field="trabalhoAltura"
                label="Trabalho em altura"
              />
              <AptidaoCheckboxGroup
                field="trabalhoEspacoConfinado"
                label="Trabalho em espaço confinado"
              />
              <AptidaoCheckboxGroup
                field="capacidadeCarregarPeso"
                label="Capacidade para carregar peso"
              />
              <AptidaoCheckboxGroup
                field="aptoOperarVeiculos"
                label="Apto a operar veículos"
              />
            </div>
          </Card>

          {/* 5. Exame Clínico */}
          <Card className="p-6 shadow-none border border-gray-200 bg-white">
            <SectionTitle title="Exame Clínico" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ExameClinicoItem
                field="cabecaPescoco"
                label="Cabeça / Pescoço"
              />
              <ExameClinicoItem field="torax" label="Tórax" />
              <ExameClinicoItem field="abdome" label="Abdome" />
              <ExameClinicoItem field="coluna" label="Coluna" />
              <ExameClinicoItem
                field="membrosSuperiores"
                label="Membros Superiores"
              />
              <ExameClinicoItem
                field="membrosInferiores"
                label="Membros Inferiores"
              />
            </div>

            {(atendimento?.SEXO === "Feminino" ||
              atendimento?.TIPOEXAMENOME === "DEMISSIONAL") && (
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data da última menstruação:
                </label>
                <FormattedInput
                  maxLength={10}
                  placeholder="DD/MM/AAAA"
                  value={formData.ultimaMenstruacao}
                  onChange={(value) =>
                    handleInputChange("ultimaMenstruacao", value)
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato automático: DD/MM/AAAA
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
      {/* 6. TESTES CLÍNICOS ARTICULARES/COLUNA */}
      {!exame.includes("Triagem") && (
        <Card className="mt-6 p-6 shadow-none border border-gray-200 bg-white">
          <SectionTitle title="Testes Clínicos Articulares/Coluna" />

          {/* 1 - PUNHOS */}
          <div className="mb-6 p-4 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-4">
              1 - PUNHOS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Teste de Phalen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  TESTE DE PHALEN
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-40 h-40  rounded flex items-center justify-center text-xs text-gray-500">
                    {/* Placeholder para imagem do teste de Phalen */}
                    <Image src="/images/articulares/phalen.jpg" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="danger"
                    isSelected={
                      formData.testesArticulares?.testePhalen === "Positivo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testePhalen",
                        checked ? "Positivo" : "Negativo",
                      )
                    }
                  >
                    Positivo
                  </Checkbox>
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="success"
                    isSelected={
                      formData.testesArticulares?.testePhalen === "Negativo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testePhalen",
                        checked ? "Negativo" : "Positivo",
                      )
                    }
                  >
                    Negativo
                  </Checkbox>
                </div>
              </div>

              {/* Teste de Finkelstein */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  TESTE DE FINKELSTEIN
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-40 h-40 rounded flex items-center justify-center text-xs text-gray-500">
                    {/* Placeholder para imagem do teste de Finkelstein */}
                    <Image src="/images/articulares/finkelstein.jpg" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="danger"
                    isSelected={
                      formData.testesArticulares?.testeFinkelstein ===
                      "Positivo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeFinkelstein",
                        checked ? "Positivo" : "Negativo",
                      )
                    }
                  >
                    Positivo
                  </Checkbox>
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="success"
                    isSelected={
                      formData.testesArticulares?.testeFinkelstein ===
                      "Negativo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeFinkelstein",
                        checked ? "Negativo" : "Positivo",
                      )
                    }
                  >
                    Negativo
                  </Checkbox>
                </div>
              </div>
            </div>
          </div>

          {/* 2 - COTOVELOS */}
          <div className="mb-6 p-4 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-4">
              2 - COTOVELOS
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                MOVIMENTAÇÃO ATIVA E CONTRA RESISTÊNCIA
              </label>
              <div className="flex gap-4 mb-3">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    formData.testesArticulares?.cotovelosMovimentacao ===
                    "Normal"
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "cotovelosMovimentacao",
                      checked ? "Normal" : "Alterado",
                    )
                  }
                >
                  Normal
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="danger"
                  isSelected={
                    formData.testesArticulares?.cotovelosMovimentacao ===
                    "Alterado"
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "cotovelosMovimentacao",
                      checked ? "Alterado" : "Normal",
                    )
                  }
                >
                  Alterado
                </Checkbox>
              </div>

              {formData.testesArticulares?.cotovelosMovimentacao ===
                "Alterado" && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-600 mb-1">
                    Observações:
                  </label>
                  <Textarea
                    className="w-full bg-white border-gray-300"
                    placeholder="Descreva as alterações encontradas..."
                    rows={2}
                    value={
                      formData.testesArticulares?.cotovelosObservacoes || ""
                    }
                    onChange={(e) =>
                      handleTestesArticularesChange(
                        "cotovelosObservacoes",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3 - OMBROS */}
          <div className="mb-6 p-4  rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-4">
              3 - OMBROS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Teste de Jobe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  TESTE JOBE
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-40 h-40 rounded flex items-center justify-center text-xs text-gray-500">
                    {/* Placeholder para imagem */}
                    <Image src="/images/articulares/jobe.jpg" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="danger"
                    isSelected={
                      formData.testesArticulares?.testeJobe === "Positivo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeJobe",
                        checked ? "Positivo" : "Negativo",
                      )
                    }
                  >
                    Positivo
                  </Checkbox>
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="success"
                    isSelected={
                      formData.testesArticulares?.testeJobe === "Negativo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeJobe",
                        checked ? "Negativo" : "Positivo",
                      )
                    }
                  >
                    Negativo
                  </Checkbox>
                </div>
              </div>

              {/* Teste de Gerber */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  TESTE GERBER
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-40 h-40 rounded flex items-center justify-center text-xs text-gray-500">
                    {/* Placeholder para imagem */}
                    <Image src="/images/articulares/gerber.jpg" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="danger"
                    isSelected={
                      formData.testesArticulares?.testeGerber === "Positivo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeGerber",
                        checked ? "Positivo" : "Negativo",
                      )
                    }
                  >
                    Positivo
                  </Checkbox>
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="success"
                    isSelected={
                      formData.testesArticulares?.testeGerber === "Negativo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeGerber",
                        checked ? "Negativo" : "Positivo",
                      )
                    }
                  >
                    Negativo
                  </Checkbox>
                </div>
              </div>

              {/* Teste de Neer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  TESTE DE NEER
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-40 h-40  rounded flex items-center justify-center text-xs text-gray-500">
                    {/* Placeholder para imagem */}
                    <Image src="/images/articulares/neer.jpg" width={130} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="danger"
                    isSelected={
                      formData.testesArticulares?.testeNeer === "Positivo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeNeer",
                        checked ? "Positivo" : "Negativo",
                      )
                    }
                  >
                    Positivo
                  </Checkbox>
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="success"
                    isSelected={
                      formData.testesArticulares?.testeNeer === "Negativo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeNeer",
                        checked ? "Negativo" : "Positivo",
                      )
                    }
                  >
                    Negativo
                  </Checkbox>
                </div>
              </div>

              {/* Teste de Yocum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  TESTE DE YOCUM
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-40 h-40 rounded flex items-center justify-center text-xs text-gray-500">
                    {/* Placeholder para imagem */}
                    <Image src="/images/articulares/yocum.jpg" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="danger"
                    isSelected={
                      formData.testesArticulares?.testeYocum === "Positivo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeYocum",
                        checked ? "Positivo" : "Negativo",
                      )
                    }
                  >
                    Positivo
                  </Checkbox>
                  <Checkbox
                    classNames={{ label: "text-sm text-gray-700" }}
                    color="success"
                    isSelected={
                      formData.testesArticulares?.testeYocum === "Negativo"
                    }
                    onValueChange={(checked) =>
                      handleTestesArticularesChange(
                        "testeYocum",
                        checked ? "Negativo" : "Positivo",
                      )
                    }
                  >
                    Negativo
                  </Checkbox>
                </div>
              </div>
            </div>

            {/* Amplitude de Movimentos Articulares */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AMPLITUDE DE MOVIMENTOS ARTICULARES
              </label>
              <div className="flex gap-4 mb-3">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    formData.testesArticulares
                      ?.amplitudeMovimentosArticulares === "Normal"
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "amplitudeMovimentosArticulares",
                      checked ? "Normal" : "Alterado",
                    )
                  }
                >
                  Normal
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="danger"
                  isSelected={
                    formData.testesArticulares
                      ?.amplitudeMovimentosArticulares === "Alterado"
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "amplitudeMovimentosArticulares",
                      checked ? "Alterado" : "Normal",
                    )
                  }
                >
                  Alterado
                </Checkbox>
              </div>

              {formData.testesArticulares?.amplitudeMovimentosArticulares ===
                "Alterado" && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-600 mb-1">
                    Alterado em:
                  </label>
                  <Input
                    className="w-full bg-white border-gray-300"
                    placeholder="Especifique onde está alterado..."
                    value={
                      formData.testesArticulares?.amplitudeAlteradoEm || ""
                    }
                    onChange={(e) =>
                      handleTestesArticularesChange(
                        "amplitudeAlteradoEm",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4 - COLUNA LOMBAR */}
          <div className="mb-6 p-4rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-4">
              4 - COLUNA LOMBAR
            </h3>

            {/* Desvios */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                DESVIOS:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares?.desviosCifose || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange("desviosCifose", checked)
                  }
                >
                  Cifose
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares?.desviosLordose || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange("desviosLordose", checked)
                  }
                >
                  Lordose
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares?.desviosEscoliose || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange("desviosEscoliose", checked)
                  }
                >
                  Escoliose
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    formData.testesArticulares?.desviosNaoIdentificados || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "desviosNaoIdentificados",
                      checked,
                    )
                  }
                >
                  Desvios não identificados
                </Checkbox>
              </div>
            </div>

            {/* Alongamento */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ALONGAMENTO:
              </label>
              <div className="flex gap-4 mb-3">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    formData.testesArticulares?.alongamentoBoaAmplitude || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "alongamentoBoaAmplitude",
                      checked,
                    )
                  }
                >
                  Boa amplitude
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares?.alongamentoFlexaoLimitada ||
                    false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "alongamentoFlexaoLimitada",
                      checked,
                    )
                  }
                >
                  Flexão limitada até
                </Checkbox>
              </div>

              {formData.testesArticulares?.alongamentoFlexaoLimitada && (
                <div className="ml-6 mt-2">
                  <Input
                    className="w-40 bg-white border-gray-300"
                    endContent={
                      <span className="text-xs text-gray-500">GRAUS</span>
                    }
                    placeholder="Graus"
                    type="number"
                    value={
                      formData.testesArticulares
                        ?.alongamentoFlexaoLimitadaGraus || ""
                    }
                    onChange={(e) =>
                      handleTestesArticularesChange(
                        "alongamentoFlexaoLimitadaGraus",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>

            {/* Lasegue */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                LASEGUE:
              </label>
              <div className="flex gap-4">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="danger"
                  isSelected={
                    formData.testesArticulares?.laseguePositivo || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange("laseguePositivo", checked)
                  }
                >
                  Positivo
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    formData.testesArticulares?.lasegueNegativo || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange("lasegueNegativo", checked)
                  }
                >
                  Negativo
                </Checkbox>
              </div>
            </div>

            {/* Andar nas pontas dos pés (S1) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ANDA NAS PONTAS DOS PÉS (S1)?
              </label>
              <div className="flex gap-4">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    formData.testesArticulares?.andarPontasPesSim || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange("andarPontasPesSim", checked)
                  }
                >
                  Sim
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares?.andarPontasPesComDificuldade ||
                    false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "andarPontasPesComDificuldade",
                      checked,
                    )
                  }
                >
                  Com dificuldade
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="danger"
                  isSelected={
                    formData.testesArticulares?.andarPontasPesNaoConsegue ||
                    false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "andarPontasPesNaoConsegue",
                      checked,
                    )
                  }
                >
                  Não consegue
                </Checkbox>
              </div>
            </div>

            {/* Andar em calcanhares (L5) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ANDA EM CALCANHARES (L5)?
              </label>
              <div className="flex gap-4">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    formData.testesArticulares?.andarCalcanharesSim || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "andarCalcanharesSim",
                      checked,
                    )
                  }
                >
                  Sim
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares
                      ?.andarCalcanharesComDificuldade || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "andarCalcanharesComDificuldade",
                      checked,
                    )
                  }
                >
                  Com dificuldade
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="danger"
                  isSelected={
                    formData.testesArticulares?.andarCalcanharesNaoConsegue ||
                    false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "andarCalcanharesNaoConsegue",
                      checked,
                    )
                  }
                >
                  Não consegue
                </Checkbox>
              </div>
            </div>

            {/* Presença de cicatrizes articulares */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                PRESENÇA DE CICATRIZES ARTICULARES OU EM COLUNA?
              </label>
              <div className="flex gap-4 mb-3">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares?.cicatrizesArticularesPresente ||
                    false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "cicatrizesArticularesPresente",
                      checked,
                    )
                  }
                >
                  Sim, especifique:
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    !formData.testesArticulares?.cicatrizesArticularesPresente
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "cicatrizesArticularesPresente",
                      !checked,
                    )
                  }
                >
                  Não
                </Checkbox>
              </div>

              {formData.testesArticulares?.cicatrizesArticularesPresente && (
                <div className="ml-6 mt-2">
                  <Input
                    className="w-full bg-white border-gray-300"
                    placeholder="Especifique a localização das cicatrizes..."
                    value={
                      formData.testesArticulares
                        ?.cicatrizesArticularesEspecifique || ""
                    }
                    onChange={(e) =>
                      handleTestesArticularesChange(
                        "cicatrizesArticularesEspecifique",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>

            {/* Presença de nódulos/cistos */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                PRESENÇA DE NÓDULOS/CISTOS ARTICULARES?
              </label>
              <div className="flex gap-4 mb-3">
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="warning"
                  isSelected={
                    formData.testesArticulares?.nodulosCistosPresente || false
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "nodulosCistosPresente",
                      checked,
                    )
                  }
                >
                  Sim, especifique:
                </Checkbox>
                <Checkbox
                  classNames={{ label: "text-sm text-gray-700" }}
                  color="success"
                  isSelected={
                    !formData.testesArticulares?.nodulosCistosPresente
                  }
                  onValueChange={(checked) =>
                    handleTestesArticularesChange(
                      "nodulosCistosPresente",
                      !checked,
                    )
                  }
                >
                  Não
                </Checkbox>
              </div>

              {formData.testesArticulares?.nodulosCistosPresente && (
                <div className="ml-6 mt-2">
                  <Input
                    className="w-full bg-white border-gray-300"
                    placeholder="Especifique a localização dos nódulos/cistos..."
                    value={
                      formData.testesArticulares?.nodulosCistosEspecifique || ""
                    }
                    onChange={(e) =>
                      handleTestesArticularesChange(
                        "nodulosCistosEspecifique",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 6. Dados Vitais */}
      <Card className="p-6 shadow-none border border-gray-200 bg-white">
        <div className="flex justify-between">
          <SectionTitle title="Dados Vitais e Medidas" />
          <Button
            color="success"
            size="sm"
            variant="flat"
            onPress={handleAddPressaoArterial}
          >
            + Adicionar Aferição
          </Button>
        </div>

        {/* Pressões Arteriais */}
        <div className="p-4">
          {(Array.isArray(formData.pressaoArterial)
            ? formData.pressaoArterial
            : []
          ).map((pa, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 align-center items-center bg-white mb-3"
            >
              <div>
                <Input
                  label={"Valor (mmHg)"}
                  maxLength={7}
                  placeholder="000/00"
                  value={pa.valor}
                  variant="bordered"
                  onChange={(value) =>
                    handlePressaoArterialChange(index, value.target.value)
                  }
                />
              </div>

              <div>
                <Input
                  className="bg-white"
                  label={"Horário"}
                  readOnly={true}
                  type="time"
                  value={pa.horario}
                  variant="bordered"
                />
              </div>

              <div>
                <Button
                  color="danger"
                  variant="light"
                  onPress={() => handleRemovePressaoArterial(index)}
                >
                  Remover
                </Button>
              </div>
              {pa.valor &&
                ClinicaCalculator.verificarPressaoAlterada(pa.valor) && (
                  <div className="flex mt-2 gap-2">
                    <TriangleAlert className="w-5 h-5 text-xs text-red-600" />
                    <p className="text-xs text-red-600 font-medium mt-1">
                      Pressão arterial alterada
                    </p>
                  </div>
                )}
            </div>
          ))}
        </div>

        {/* Peso, altura e IMC */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ">
          <div className="p-4">
            <Input
              className={formErrors.peso ? "border-red-500" : ""}
              label="Peso (kg)"
              placeholder="00,0"
              type="text"
              value={formData.peso}
              variant="bordered"
              onChange={(value) =>
                handleInputChange("peso", value.target.value)
              }
            />
            {formErrors.peso && (
              <p className="text-xs text-red-600 mt-1">{formErrors.peso}</p>
            )}
          </div>

          <div className="p-4">
            <Input
              className={formErrors.altura ? "border-red-500" : ""}
              label="Altura (m)"
              placeholder="0,00"
              type="text"
              value={formData.altura}
              variant="bordered"
              onChange={(value) =>
                handleInputChange("altura", value.target.value)
              }
            />
            <p className="text-xs text-gray-500 mt-1">Vírgula automática</p>
            {formErrors.altura && (
              <p className="text-xs text-red-600 mt-1">{formErrors.altura}</p>
            )}
          </div>

          <div className="p-4">
            <Input
              isReadOnly
              className="bg-white border-gray-300"
              label="IMC"
              placeholder="Calculado automaticamente"
              value={formData.imc}
              variant="bordered"
            />
            {formData.resultadoImc && (
              <p
                className={`text-xs font-medium mt-1 ${
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

        {exame.includes("Triagem") && pressaoAlterada && (
          <div className="mt-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <label className="block text-sm font-medium text-amber-700 mb-2">
              Observações Médicas (Pressão arterial alterada detectada):
            </label>
            <Textarea
              className="w-full border-amber-300 focus:border-amber-400"
              placeholder="Descreva as observações sobre a pressão arterial alterada e as recomendações necessárias..."
              rows={3}
              value={formData.observacoesMedicas}
              onChange={(e) =>
                handleInputChange("observacoesMedicas", e.target.value)
              }
            />
          </div>
        )}
      </Card>

      {/* 7. Conclusão */}
      {!exame.includes("Triagem") && (
        <Card className="p-6 shadow-sm border border-gray-200 bg-white">
          <SectionTitle title="Conclusão Médica" />

          <div className="space-y-4">
            <div className="p-4">
              <div className="flex justify-between gap-1">
                {CONCLUSAO_OPTIONS.map((option) => (
                  <Checkbox
                    key={option.value}
                    classNames={{
                      base: "w-full hover:bg-gray-100 rounded-lg p-3 transition-colors",
                      label: "text-sm font-medium text-gray-700",
                    }}
                    color={
                      option.value.includes("Apto")
                        ? "success"
                        : option.value.includes("Inapto")
                          ? "danger"
                          : "primary"
                    }
                    isSelected={formData.conclusao === option.value}
                    onValueChange={(checked) => {
                      if (checked) {
                        handleInputChange("conclusao", option.value);
                      }
                    }}
                  >
                    {option.label}
                  </Checkbox>
                ))}
              </div>
            </div>

            {formData.conclusao === "Aguardar Avaliação" && (
              <div className="p-4">
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Informação Médica
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Input
                  className={`w-full border-blue-300 focus:border-blue-400 ${
                    formErrors.informacaoAguardarAvaliacao
                      ? "border-red-500"
                      : ""
                  }`}
                  placeholder="Descreva as informações médicas para aguardar avaliação..."
                  value={formData.informacaoAguardarAvaliacao}
                  onChange={(e) =>
                    handleInputChange(
                      "informacaoAguardarAvaliacao",
                      e.target.value,
                    )
                  }
                />
                {formErrors.informacaoAguardarAvaliacao && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.informacaoAguardarAvaliacao}
                  </p>
                )}
              </div>
            )}

            {/* Campos para "Apto com restrições" */}
            {formData.conclusao === "Apto com restrições" && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-3">
                  Restrições Médicas
                </h3>

                {/* Checkboxes de restrições */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Evitar carregar peso excessivo */}
                  <div className="space-y-2">
                    <Checkbox
                      classNames={{
                        label: "text-sm font-medium text-gray-700",
                      }}
                      color="danger"
                      isSelected={
                        formData.restricoes?.evitarCarregarPeso || false
                      }
                      onValueChange={(checked) =>
                        handleRestricoesChange("evitarCarregarPeso", checked)
                      }
                    >
                      Evitar carregar peso excessivo
                    </Checkbox>
                    {formData.restricoes?.evitarCarregarPeso && (
                      <div className="ml-6">
                        <label className="block text-xs text-gray-600 mb-1">
                          Peso máximo (kg):
                        </label>
                        <Input
                          className="w-32 bg-white border-gray-300"
                          placeholder="Ex: 10"
                          type="number"
                          value={formData.restricoes?.pesoMaximoKg || ""}
                          onChange={(e) =>
                            handleRestricoesChange(
                              "pesoMaximoKg",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Evitar elevação dos braços */}
                  <div className="space-y-2">
                    <Checkbox
                      classNames={{
                        label: "text-sm font-medium text-gray-700",
                      }}
                      color="danger"
                      isSelected={
                        formData.restricoes?.evitarElevacaoBracos || false
                      }
                      onValueChange={(checked) =>
                        handleRestricoesChange("evitarElevacaoBracos", checked)
                      }
                    >
                      Evitar elevação dos braços acima do nível dos ombros
                    </Checkbox>
                    {formData.restricoes?.evitarElevacaoBracos && (
                      <div className="ml-6">
                        <label className="block text-xs text-gray-600 mb-1">
                          Tipo:
                        </label>
                        <div className="flex gap-4">
                          <Checkbox
                            classNames={{
                              label: "text-xs text-gray-700",
                            }}
                            color="warning"
                            isSelected={
                              formData.restricoes?.tipoElevacaoBracos ===
                              "direito"
                            }
                            onValueChange={(checked) =>
                              handleRestricoesChange(
                                "tipoElevacaoBracos",
                                checked ? "direito" : undefined,
                              )
                            }
                          >
                            Direito
                          </Checkbox>
                          <Checkbox
                            classNames={{
                              label: "text-xs text-gray-700",
                            }}
                            color="warning"
                            isSelected={
                              formData.restricoes?.tipoElevacaoBracos ===
                              "esquerdo"
                            }
                            onValueChange={(checked) =>
                              handleRestricoesChange(
                                "tipoElevacaoBracos",
                                checked ? "esquerdo" : undefined,
                              )
                            }
                          >
                            Esquerdo
                          </Checkbox>
                          <Checkbox
                            classNames={{
                              label: "text-xs text-gray-700",
                            }}
                            color="warning"
                            isSelected={
                              formData.restricoes?.tipoElevacaoBracos ===
                              "ambos"
                            }
                            onValueChange={(checked) =>
                              handleRestricoesChange(
                                "tipoElevacaoBracos",
                                checked ? "ambos" : undefined,
                              )
                            }
                          >
                            Ambos
                          </Checkbox>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Outras restrições simples */}
                  <Checkbox
                    classNames={{
                      label: "text-sm font-medium text-gray-700",
                    }}
                    color="danger"
                    isSelected={
                      formData.restricoes?.evitarCurvarTronco || false
                    }
                    onValueChange={(checked) =>
                      handleRestricoesChange("evitarCurvarTronco", checked)
                    }
                  >
                    Evitar curvar tronco com frequência
                  </Checkbox>

                  <Checkbox
                    classNames={{
                      label: "text-sm font-medium text-gray-700",
                    }}
                    color="danger"
                    isSelected={formData.restricoes?.evitarEscadas || false}
                    onValueChange={(checked) =>
                      handleRestricoesChange("evitarEscadas", checked)
                    }
                  >
                    Evitar subir/descer escadas ou degraus
                  </Checkbox>

                  <Checkbox
                    classNames={{
                      label: "text-sm font-medium text-gray-700",
                    }}
                    color="danger"
                    isSelected={
                      formData.restricoes?.evitarLongasCaminhadas || false
                    }
                    onValueChange={(checked) =>
                      handleRestricoesChange("evitarLongasCaminhadas", checked)
                    }
                  >
                    Evitar longas caminhadas
                  </Checkbox>

                  <Checkbox
                    classNames={{
                      label: "text-sm font-medium text-gray-700",
                    }}
                    color="danger"
                    isSelected={
                      formData.restricoes?.evitarAlterarPostura || false
                    }
                    onValueChange={(checked) =>
                      handleRestricoesChange("evitarAlterarPostura", checked)
                    }
                  >
                    Evitar alterar postura sentado e em pé
                  </Checkbox>

                  {/* Outros */}
                  <div className="space-y-2">
                    <Checkbox
                      classNames={{
                        label: "text-sm font-medium text-gray-700",
                      }}
                      color="danger"
                      isSelected={formData.restricoes?.outros || false}
                      onValueChange={(checked) =>
                        handleRestricoesChange("outros", checked)
                      }
                    >
                      Outros
                    </Checkbox>
                    {formData.restricoes?.outros && (
                      <div className="ml-6">
                        <label className="block text-xs text-gray-600 mb-1">
                          Descrição:
                        </label>
                        <Input
                          className="w-full bg-white border-gray-300"
                          placeholder="Descreva outras restrições..."
                          value={formData.restricoes?.descricaoOutros || ""}
                          onChange={(e) =>
                            handleRestricoesChange(
                              "descricaoOutros",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Duração e data de início */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-amber-200">
                  <div>
                    <label className="block text-sm font-medium text-amber-700 mb-2">
                      Duração provável (dias):
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Input
                      className={`bg-white border-amber-300 focus:border-amber-400 ${
                        formErrors.duracaoRestricaoDias ? "border-red-500" : ""
                      }`}
                      placeholder="Ex: 30"
                      type="number"
                      value={formData.duracaoRestricaoDias}
                      onChange={(e) =>
                        handleInputChange(
                          "duracaoRestricaoDias",
                          e.target.value,
                        )
                      }
                    />
                    {formErrors.duracaoRestricaoDias && (
                      <p className="text-xs text-red-600 mt-1">
                        {formErrors.duracaoRestricaoDias}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-700 mb-2">
                      Data início:
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Input
                      className={`bg-white border-amber-300 focus:border-amber-400 ${
                        formErrors.dataInicioRestricao ? "border-red-500" : ""
                      }`}
                      type="date"
                      value={formData.dataInicioRestricao}
                      onChange={(e) =>
                        handleInputChange("dataInicioRestricao", e.target.value)
                      }
                    />
                    {formErrors.dataInicioRestricao && (
                      <p className="text-xs text-red-600 mt-1">
                        {formErrors.dataInicioRestricao}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações Médicas:
              </label>
              <Textarea
                className="w-full bg-white border-gray-300"
                placeholder="Digite as observações médicas relevantes..."
                rows={4}
                value={formData.observacoesMedicas}
                onChange={(e) =>
                  handleInputChange("observacoesMedicas", e.target.value)
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
        {(formErrors.pressaoArterial || formErrors.medico) && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex flex-col gap-1">
            {formErrors.pressaoArterial && (
              <p className="text-sm text-red-600 flex items-center gap-2">
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
          className="px-8 bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover transition-colors"
          color="primary"
          isDisabled={isLoading}
          startContent={
            isLoading ? <Spinner size="sm" /> : <FileText className="h-4 w-4" />
          }
          onPress={handleSave}
        >
          {isLoading ? "Salvando..." : "Concluir Atendimento"}
        </Button>
      </div>
    </div>
  );
};

export default React.memo(FichaClinicaOcupacional);
