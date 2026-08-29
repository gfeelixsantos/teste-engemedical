// Código
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Button,
  Input,
  Textarea,
  RadioGroup,
  Radio,
  Checkbox,
  Spinner,
} from "@heroui/react";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
  CheckCheck,
} from "lucide-react";

import HeaderExame from "./HeaderExame";

import { IUserInfo, useUser } from "@/hooks/useUser";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface AcuidadeVisualProps {
  atendimento: any;
  exame: string;
  formulario: any;
  operationalUser?: IUserInfo | null;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

interface AcuidadeVisualData {
  // Dados do exame
  exameComLenteCorretiva: string;
  tipoLenteCorretiva: string;
  profissional: string;

  // Acuidade Visual - Longe
  longeOD: string;
  longeOE: string;
  longeBinocular: string;

  // Acuidade Visual - Perto
  pertoBinocular: string;

  // Teste de Ishihara - Campos de controle
  ishiharaRealizado: boolean;

  // Teste de Ishihara - Dados
  ishiharaPlaca1: string;
  ishiharaResultado1: string;
  ishiharaPlaca2: string;
  ishiharaResultado2: string;
  ishiharaPlaca3: string;
  ishiharaResultado3: string;
  ishiharaPlaca4: string;
  ishiharaResultado4: string;
  ishiharaPlaca5: string;
  ishiharaResultado5: string;
  ishiharaPlaca6: string;
  ishiharaResultado6: string;
  ishiharaPlaca7: string;
  ishiharaResultado7: string;
  ishiharaPlaca8: string;
  ishiharaResultado8: string;
  ishiharaPlaca9: string;
  ishiharaResultado9: string;
  ishiharaPlaca10: string;
  ishiharaResultado10: string;

  // Conclusão Ishihara
  conclusaoIshihara: string;

  // Teste de Estereopsia - Campos de controle
  estereopsiaRealizado: boolean;

  // Teste de Estereopsia - Dados
  estereopsiaResultado: string;
  estereopsiaObservacao: string;
  estereopsiaAcertos: number;
  estereopsiaTotal: number;
  estereopsiaRespostas: { [key: number]: "acerto" | "erro" | null };

  // Conclusão Geral
  observacoesFinais: string;
  // Propriedade opcional para compatibilidade
  resultadoEstereopsia?: string;

  // Avaliação PCD
  laudoOftalmologistaRecomendado: boolean;
  criterioPCDIdentificado: string;
}

interface ResultadoPCD {
  sugereInvestigacao: boolean;
  criterios: string[];
  detalhes: string;
}

// Configuração das placas do teste de Ishihara com resultados esperados
const placasIshiharaConfig = [
  {
    number: 1,
    normal: "12",
    daltonismoVerdeVermelho: "",
    fieldPlaca: "ishiharaPlaca1",
    fieldResultado: "ishiharaResultado1",
  },
  {
    number: 2,
    normal: "8",
    daltonismoVerdeVermelho: "3",
    fieldPlaca: "ishiharaPlaca2",
    fieldResultado: "ishiharaResultado2",
  },
  {
    number: 3,
    normal: "29",
    daltonismoVerdeVermelho: "70",
    fieldPlaca: "ishiharaPlaca3",
    fieldResultado: "ishiharaResultado3",
  },
  {
    number: 4,
    normal: "5",
    daltonismoVerdeVermelho: "2",
    fieldPlaca: "ishiharaPlaca4",
    fieldResultado: "ishiharaResultado4",
  },
  {
    number: 5,
    normal: "3",
    daltonismoVerdeVermelho: "5",
    fieldPlaca: "ishiharaPlaca5",
    fieldResultado: "ishiharaResultado5",
  },
  {
    number: 6,
    normal: "15",
    daltonismoVerdeVermelho: "17",
    fieldPlaca: "ishiharaPlaca6",
    fieldResultado: "ishiharaResultado6",
  },
  {
    number: 7,
    normal: "74",
    daltonismoVerdeVermelho: "21",
    fieldPlaca: "ishiharaPlaca7",
    fieldResultado: "ishiharaResultado7",
  },
  {
    number: 8,
    normal: "6",
    daltonismoVerdeVermelho: "",
    fieldPlaca: "ishiharaPlaca8",
    fieldResultado: "ishiharaResultado8",
  },
  {
    number: 9,
    normal: "45",
    daltonismoVerdeVermelho: "",
    fieldPlaca: "ishiharaPlaca9",
    fieldResultado: "ishiharaResultado9",
  },
  {
    number: 10,
    normal: "5",
    daltonismoVerdeVermelho: "",
    fieldPlaca: "ishiharaPlaca10",
    fieldResultado: "ishiharaResultado10",
  },
] as const;

// Configuração das setas para teste de profundidade
const setasProfundidade = [
  { id: 1, numero: "1", direcao: "⬇️" },
  { id: 2, numero: "2", direcao: "⬅️" },
  { id: 3, numero: "3", direcao: "⬇️" },
  { id: 4, numero: "4", direcao: "⬆️" },
  { id: 5, numero: "5", direcao: "⬆️" },
  { id: 6, numero: "6", direcao: "⬅️" },
  { id: 7, numero: "7", direcao: "➡️" },
  { id: 8, numero: "8", direcao: "⬅️" },
  { id: 9, numero: "9", direcao: "➡️" },
];

// Função para converter acuidade visual para valor decimal
const converterAcuidadeParaDecimal = (acuidade: string): number | null => {
  if (!acuidade || !acuidade.includes("/")) return null;

  try {
    const [numerador, denominador] = acuidade
      .split("/")
      .map((part) => parseFloat(part.trim()));

    if (isNaN(numerador) || isNaN(denominador) || denominador === 0)
      return null;

    return numerador / denominador;
  } catch {
    return null;
  }
};

// Função para verificar critérios PCD (usando useMemo posteriormente)
const verificarCriteriosPCD = (formData: AcuidadeVisualData): ResultadoPCD => {
  const criterios: string[] = [];

  // Converter acuidades visuais para valores decimais - considerar apenas OD e OE para longe
  const acuidadeOD = converterAcuidadeParaDecimal(formData.longeOD);
  const acuidadeOE = converterAcuidadeParaDecimal(formData.longeOE);

  // Encontrar a MELHOR acuidade visual (MAIOR valor decimal = melhor visão)
  const acuidadesValidas = [acuidadeOD, acuidadeOE].filter(
    (acuidade) => acuidade !== null,
  ) as number[];
  const melhorAcuidade =
    acuidadesValidas.length > 0 ? Math.max(...acuidadesValidas) : null;

  // Critério 1: Cegueira - acuidade visual ≤ 0,05 (20/400) no melhor olho
  if (melhorAcuidade !== null && melhorAcuidade <= 0.05) {
    criterios.push(
      `Cegueira - acuidade visual ${formataAcuidade(melhorAcuidade)} (≤ 20/400) no melhor olho`,
    );
  }

  // Critério 2: Baixa visão - acuidade visual entre 0,05 (20/400) e 0,3 (20/60) no melhor olho
  // NOTA: Valores decimais MENORES indicam PIOR visão
  if (
    melhorAcuidade !== null &&
    melhorAcuidade > 0.05 &&
    melhorAcuidade <= 0.3
  ) {
    criterios.push(
      `Baixa visão - acuidade visual ${formataAcuidade(melhorAcuidade)} (entre 20/400 e 20/60) no melhor olho`,
    );
  }

  // Critério 3: Cegueira legal em um olho (≤ 0,05) - mesmo que o outro olho tenha visão normal
  if (acuidadeOD !== null && acuidadeOD <= 0.05) {
    criterios.push(
      `Cegueira legal em olho direito (OD ${formataAcuidade(acuidadeOD)}) - conforme parecer CONJUR/MTE 444/11`,
    );
  }

  if (acuidadeOE !== null && acuidadeOE <= 0.05) {
    criterios.push(
      `Cegueira legal em olho esquerdo (OE ${formataAcuidade(acuidadeOE)}) - conforme parecer CONJUR/MTE 444/11`,
    );
  }

  // Critério 4: Daltonismo total no teste de Ishihara (apenas se o teste foi realizado)
  if (formData.ishiharaRealizado) {
    const resultadosIshihara = [
      formData.ishiharaResultado1,
      formData.ishiharaResultado2,
      formData.ishiharaResultado3,
      formData.ishiharaResultado4,
      formData.ishiharaResultado5,
      formData.ishiharaResultado6,
      formData.ishiharaResultado7,
      formData.ishiharaResultado8,
      formData.ishiharaResultado9,
      formData.ishiharaResultado10,
    ];

    const daltonismoTotalCount = resultadosIshihara.filter(
      (result) => result === "Daltonismo total",
    ).length;

    if (daltonismoTotalCount >= 5) {
      criterios.push("Daltonismo total identificado no teste de Ishihara");
    }
  }

  return {
    sugereInvestigacao: criterios.length > 0,
    criterios,
    detalhes:
      criterios.length > 0
        ? "Recomenda-se avaliação com oftalmologista para confirmação diagnóstica e eventual inclusão na cota PCD conforme Lei 8.213/91."
        : "Não foram identificados critérios sugestivos de enquadramento PCD nos exames realizados.",
  };
};

// Função auxiliar para formatar acuidade visual
const formataAcuidade = (valorDecimal: number): string => {
  if (valorDecimal <= 0.05) return "20/400";
  if (valorDecimal <= 0.1) return "20/200";
  if (valorDecimal <= 0.16) return "20/125";
  if (valorDecimal <= 0.2) return "20/100";
  if (valorDecimal <= 0.25) return "20/80";
  if (valorDecimal <= 0.3) return "20/60";
  if (valorDecimal <= 0.4) return "20/50";
  if (valorDecimal <= 0.5) return "20/40";
  if (valorDecimal <= 0.6) return "20/30";
  if (valorDecimal <= 0.8) return "20/25";

  return "20/20";
};

const AcuidadeVisual: React.FC<AcuidadeVisualProps> = ({
  atendimento,
  exame,
  formulario,
  operationalUser,
  onSave,
  onClose,
}) => {
  const user = useUser();
  const effectiveUser = operationalUser ?? user;
  const [agendamento, setAgendamento] = useState<Scheduling>();
  const [isAcuidadeConcluida, setIsAcuidadeConcluida] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<AcuidadeVisualData>({
    // Dados do exame
    exameComLenteCorretiva: "Não",
    tipoLenteCorretiva: "",
    profissional: "",

    // Acuidade Visual
    longeOD: "",
    longeOE: "",
    longeBinocular: "",
    pertoBinocular: "",

    // Teste de Ishihara - Campos de controle
    ishiharaRealizado: false,

    // Teste de Ishihara - Dados
    ishiharaPlaca1: "",
    ishiharaResultado1: "Normal",
    ishiharaPlaca2: "",
    ishiharaResultado2: "Normal",
    ishiharaPlaca3: "",
    ishiharaResultado3: "Normal",
    ishiharaPlaca4: "",
    ishiharaResultado4: "Normal",
    ishiharaPlaca5: "",
    ishiharaResultado5: "Normal",
    ishiharaPlaca6: "",
    ishiharaResultado6: "Normal",
    ishiharaPlaca7: "",
    ishiharaResultado7: "Normal",
    ishiharaPlaca8: "",
    ishiharaResultado8: "Normal",
    ishiharaPlaca9: "",
    ishiharaResultado9: "Normal",
    ishiharaPlaca10: "",
    ishiharaResultado10: "Normal",

    conclusaoIshihara: "Visão normal para cores",

    // Teste de Estereopsia - Campos de controle
    estereopsiaRealizado: false,

    // Teste de Estereopsia - Dados
    estereopsiaResultado: "",
    estereopsiaObservacao: "",
    estereopsiaAcertos: 0,
    estereopsiaTotal: 9,
    estereopsiaRespostas: {},

    // Conclusão Geral
    observacoesFinais: "",

    // Avaliação PCD
    laudoOftalmologistaRecomendado: false,
    criterioPCDIdentificado: "",
  });

  // Estados para controle de expansão
  const [showIshihara, setShowIshihara] = useState(false);
  const [showEstereopsia, setShowEstereopsia] = useState(false);

  // Preenchimento automático dos dados do atendimento
  useEffect(() => {
    if (atendimento) {
      setAgendamento(atendimento);
    }

    if (formulario) {
      const filledData = { ...formulario };

      // Garantir que os campos booleanos existam
      if (filledData.ishiharaRealizado === undefined) {
        filledData.ishiharaRealizado = false;
      }
      if (filledData.estereopsiaRealizado === undefined) {
        filledData.estereopsiaRealizado = false;
      }
      setFormData((prev) => ({ ...prev, ...filledData }));

      // Expandir automaticamente se o teste já foi realizado
      if (filledData.ishiharaRealizado) {
        setShowIshihara(true);
      }
      if (filledData.estereopsiaRealizado) {
        setShowEstereopsia(true);
      }
    }
  }, [atendimento, formulario]);

  // Preencher profissional responsável automaticamente
  useEffect(() => {
    if (effectiveUser?.nome && !formData.profissional) {
      setFormData((prev) => ({
        ...prev,
        profissional: effectiveUser.nome,
      }));
    }
  }, [effectiveUser?.nome, formData.profissional]);

  // Verificar se a acuidade visual está concluída (apenas OD e OE para longe são obrigatórios)
  useEffect(() => {
    const acuidadePreenchida =
      formData.longeOD.trim() !== "" && formData.longeOE.trim() !== "";

    setIsAcuidadeConcluida(acuidadePreenchida);
  }, [formData.longeOD, formData.longeOE]);

  // Cálculo do resultado PCD com useMemo para performance
  const resultadoPCD = useMemo((): ResultadoPCD => {
    if (!isAcuidadeConcluida) {
      return { sugereInvestigacao: false, criterios: [], detalhes: "" };
    }

    return verificarCriteriosPCD(formData);
  }, [
    isAcuidadeConcluida,
    formData.longeOD,
    formData.longeOE,
    formData.ishiharaRealizado,
    formData.ishiharaResultado1,
    formData.ishiharaResultado2,
    formData.ishiharaResultado3,
    formData.ishiharaResultado4,
    formData.ishiharaResultado5,
    formData.ishiharaResultado6,
    formData.ishiharaResultado7,
    formData.ishiharaResultado8,
    formData.ishiharaResultado9,
    formData.ishiharaResultado10,
  ]);

  // Atualizar automaticamente o campo de critério PCD quando resultado mudar
  useEffect(() => {
    if (resultadoPCD.criterios.length > 0) {
      handleInputChange(
        "criterioPCDIdentificado",
        resultadoPCD.criterios.join("; "),
      );
      handleInputChange("laudoOftalmologistaRecomendado", true);
    } else {
      handleInputChange("criterioPCDIdentificado", "");
      handleInputChange("laudoOftalmologistaRecomendado", false);
    }
  }, [resultadoPCD.criterios]);

  const handleInputChange = useCallback(
    (field: keyof AcuidadeVisualData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Função para calcular automaticamente o resultado do Ishihara
  const calcularResultadoIshihara = useCallback(
    (placaNumber: number, valorIdentificado: string): string => {
      const placaConfig = placasIshiharaConfig.find(
        (p) => p.number === placaNumber,
      );

      if (!placaConfig) return "Normal";

      const valorNormalizado = valorIdentificado.trim().toLowerCase();

      // Verificar se é branco, "-", NA ou vazio (daltonismo total)
      if (
        valorNormalizado === "" ||
        valorNormalizado === "-" ||
        valorNormalizado === "na" ||
        valorNormalizado === "nenhum" ||
        valorNormalizado === "branco"
      ) {
        return "Daltonismo total";
      }

      // Verificar se é o valor normal
      if (valorNormalizado === placaConfig.normal.toLowerCase()) {
        return "Normal";
      }

      // Verificar se é o valor para daltonismo verde-vermelho
      if (
        placaConfig.daltonismoVerdeVermelho &&
        valorNormalizado === placaConfig.daltonismoVerdeVermelho.toLowerCase()
      ) {
        return "Daltonismo verde-vermelho";
      }

      // Se não corresponde a nenhum padrão esperado, considerar como alteração
      return "Alteração";
    },
    [],
  );

  // Função para lidar com mudanças nas placas do Ishihara
  const handleIshiharaChange = useCallback(
    (placaNumber: number, valorIdentificado: string) => {
      const placaConfig = placasIshiharaConfig.find(
        (p) => p.number === placaNumber,
      );

      if (!placaConfig) return;

      // Atualizar o valor identificado
      handleInputChange(
        placaConfig.fieldPlaca as keyof AcuidadeVisualData,
        valorIdentificado,
      );

      // Calcular e atualizar o resultado automaticamente
      const resultado = calcularResultadoIshihara(
        placaNumber,
        valorIdentificado,
      );

      handleInputChange(
        placaConfig.fieldResultado as keyof AcuidadeVisualData,
        resultado,
      );
    },
    [calcularResultadoIshihara, handleInputChange],
  );

  // Função para preencher todos os campos do Ishihara como normais
  const preencherTodosCorretosIshihara = useCallback(() => {
    const updates: Partial<AcuidadeVisualData> = {};

    placasIshiharaConfig.forEach((placa) => {
      updates[placa.fieldPlaca] = placa.normal;
      updates[placa.fieldResultado] = "Normal";
    });

    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Função para limpar todos os campos do Ishihara
  const limparTesteIshihara = useCallback(() => {
    const updates: Partial<AcuidadeVisualData> = {};

    placasIshiharaConfig.forEach((placa) => {
      updates[placa.fieldPlaca] = "";
      updates[placa.fieldResultado] = "Normal";
    });

    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Função para lidar com a mudança do checkbox do Ishihara
  const handleIshiharaRealizadoChange = useCallback(
    (isSelected: boolean) => {
      handleInputChange("ishiharaRealizado", isSelected);

      // Se marcar, expandir automaticamente
      if (isSelected) {
        setShowIshihara(true);
      }
      // Se desmarcar, limpar os dados do teste
      else {
        setShowIshihara(false);
        const updates: Partial<AcuidadeVisualData> = {};

        placasIshiharaConfig.forEach((placa) => {
          updates[placa.fieldPlaca] = "";
          updates[placa.fieldResultado] = "Normal";
        });
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    },
    [handleInputChange],
  );

  // Função para lidar com a mudança do checkbox da Estereopsia
  const handleEstereopsiaRealizadoChange = useCallback(
    (isSelected: boolean) => {
      handleInputChange("estereopsiaRealizado", isSelected);

      // Se marcar, expandir automaticamente
      if (isSelected) {
        setShowEstereopsia(true);
      }
      // Se desmarcar, limpar os dados do teste
      else {
        setShowEstereopsia(false);
        setFormData((prev) => ({
          ...prev,
          estereopsiaRespostas: {},
          estereopsiaAcertos: 0,
          estereopsiaTotal: 9,
          estereopsiaResultado: "",
          resultadoEstereopsia: "",
        }));
      }
    },
    [handleInputChange],
  );

  const handleSave = useCallback(async () => {
    if (!isAcuidadeConcluida) {
      alert(
        "A acuidade visual é obrigatória para conclusão do exame. Preencha os campos de Olho Direito (OD) e Olho Esquerdo (OE) para longe.",
      );

      return;
    }
    setIsLoading(true);
    try {
      await onSave?.(formData);
    } finally {
      setIsLoading(false);
    }
  }, [formData, onSave, isAcuidadeConcluida]);

  // Função para lidar com as respostas do teste de profundidade
  const handleRespostaProfundidade = useCallback(
    (setaId: number, resposta: "acerto" | "erro") => {
      setFormData((prev) => {
        const novasRespostas = {
          ...prev.estereopsiaRespostas,
          [setaId]: resposta,
        };

        // Calcular acertos baseado nas respostas
        const acertos = Object.values(novasRespostas).filter(
          (resp) => resp === "acerto",
        ).length;
        const total = Object.keys(novasRespostas).length;

        return {
          ...prev,
          estereopsiaRespostas: novasRespostas,
          estereopsiaAcertos: acertos,
          estereopsiaTotal: total > 0 ? total : 9,
        };
      });
    },
    [],
  );

  // Calcular resultado do teste de estereopsia baseado nas respostas
  const resultadoEstereopsia = useMemo(() => {
    const calcularResultado = (acertos: number, total: number) => {
      if (total === 0) return "";
      const porcentagem = (acertos / total) * 100;

      if (porcentagem >= 80) return "Dentro dos padrões da normalidade";

      return "Fora dos padrões da normalidade";
    };

    return calcularResultado(
      formData.estereopsiaAcertos,
      formData.estereopsiaTotal,
    );
  }, [formData.estereopsiaAcertos, formData.estereopsiaTotal]);

  // Atualizar resultado da estereopsia quando mudar
  useEffect(() => {
    if (resultadoEstereopsia) {
      setFormData((prev) => ({
        ...prev,
        estereopsiaResultado: resultadoEstereopsia,
        ...(resultadoEstereopsia && {
          resultadoEstereopsia: resultadoEstereopsia,
        }),
      }));
    }
  }, [resultadoEstereopsia]);

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

  // Componente para o teste de estereopsia com botões de acerto/erro
  const TesteEstereopsia = useCallback(() => {
    const limparTeste = () => {
      setFormData((prev) => ({
        ...prev,
        estereopsiaRespostas: {},
        estereopsiaAcertos: 0,
        estereopsiaTotal: 9,
        estereopsiaResultado: "",
        resultadoEstereopsia: "",
      }));
    };

    const marcarTodosComoAcerto = () => {
      const todasRespostas: { [key: number]: "acerto" } = {};

      setasProfundidade.forEach((seta) => {
        todasRespostas[seta.id] = "acerto";
      });

      setFormData((prev) => ({
        ...prev,
        estereopsiaRespostas: todasRespostas,
        estereopsiaAcertos: setasProfundidade.length,
        estereopsiaTotal: setasProfundidade.length,
      }));
    };

    const marcarTodosComoErro = () => {
      const todasRespostas: { [key: number]: "erro" } = {};

      setasProfundidade.forEach((seta) => {
        todasRespostas[seta.id] = "erro";
      });

      setFormData((prev) => ({
        ...prev,
        estereopsiaRespostas: todasRespostas,
        estereopsiaAcertos: 0,
        estereopsiaTotal: setasProfundidade.length,
      }));
    };

    const porcentagem =
      formData.estereopsiaTotal > 0
        ? Math.round(
            (formData.estereopsiaAcertos / formData.estereopsiaTotal) * 100,
          )
        : 0;

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Clique nos botões para registrar se o paciente acertou ou errou cada
          seta
        </p>
        <div className="p-6">
          {/* Grid de setas com botões de acerto/erro */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
              Registre as respostas para cada seta:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {setasProfundidade.map((seta) => (
                <div
                  key={seta.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 text-center"
                >
                  <div className="text-2xl mb-2">{seta.direcao}</div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    nº {seta.numero}
                  </div>
                  <div className="flex justify-center gap-1">
                    <Button
                      isIconOnly
                      className="min-w-10 h-8"
                      color={
                        formData.estereopsiaRespostas[seta.id] === "acerto"
                          ? "success"
                          : "default"
                      }
                      size="sm"
                      variant={
                        formData.estereopsiaRespostas[seta.id] === "acerto"
                          ? "solid"
                          : "flat"
                      }
                      onPress={() =>
                        handleRespostaProfundidade(seta.id, "acerto")
                      }
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      isIconOnly
                      className="min-w-10 h-8"
                      color={
                        formData.estereopsiaRespostas[seta.id] === "erro"
                          ? "danger"
                          : "default"
                      }
                      size="sm"
                      variant={
                        formData.estereopsiaRespostas[seta.id] === "erro"
                          ? "solid"
                          : "flat"
                      }
                      onPress={() =>
                        handleRespostaProfundidade(seta.id, "erro")
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.estereopsiaRespostas[seta.id] === "acerto" &&
                      "Acertou"}
                    {formData.estereopsiaRespostas[seta.id] === "erro" &&
                      "Errou"}
                    {!formData.estereopsiaRespostas[seta.id] && "?"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              className="flex items-center gap-2 text-sm"
              size="sm"
              variant="flat"
              onPress={limparTeste}
            >
              Limpar Teste
            </Button>
            {/* <Button
              variant="flat"
              onPress={marcarTodosComoAcerto}
              className="flex items-center gap-2 bg-green-50 text-green-700 text-sm"
              size="sm"
            >
              <Check className="h-3 w-3" />
              Todos Corretos
            </Button>
            <Button
              variant="flat"
              onPress={marcarTodosComoErro}
              className="flex items-center gap-2 bg-red-50 text-red-700 text-sm"
              size="sm"
            >
              <X className="h-3 w-3" />
              Todos Errados
            </Button> */}
          </div>

          {/* Display compacto de resultados */}
          <div className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-blue-600">
                  {formData.estereopsiaAcertos}
                </div>
                <div className="text-sm text-gray-600">Acertos</div>
              </div>

              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-gray-700">
                  {porcentagem}%
                </div>
                <div className="text-sm text-gray-600">Taxa</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    formData.estereopsiaRespostas,
    formData.estereopsiaAcertos,
    formData.estereopsiaTotal,
    formData.estereopsiaResultado,
    handleRespostaProfundidade,
  ]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6  min-h-screen">
      <HeaderExame agendamento={agendamento} exame={exame} />

      {/* 2. Acuidade Visual */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="2" title="Acuidade Visual" />

        <div>
          {/* Exame com lente corretiva */}
          <div className=" p-4 ">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Exame com lente corretiva?
            </label>
            <RadioGroup
              classNames={{ wrapper: "gap-6" }}
              color="success"
              orientation="horizontal"
              value={formData.exameComLenteCorretiva}
              onValueChange={(value) =>
                handleInputChange("exameComLenteCorretiva", value)
              }
            >
              <Radio classNames={{ label: "text-gray-700" }} value="Sim">
                Sim
              </Radio>
              <Radio classNames={{ label: "text-gray-700" }} value="Não">
                Não
              </Radio>
            </RadioGroup>

            {/* Opções de lente corretiva - aparece apenas se "Sim" for selecionado */}
            {formData.exameComLenteCorretiva === "Sim" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Uso de lente:
                </label>
                <RadioGroup
                  classNames={{ wrapper: "gap-6" }}
                  orientation="horizontal"
                  value={formData.tipoLenteCorretiva}
                  onValueChange={(value) =>
                    handleInputChange("tipoLenteCorretiva", value)
                  }
                >
                  <Radio
                    classNames={{ label: "text-gray-700" }}
                    value="Para perto"
                  >
                    Para perto
                  </Radio>
                  <Radio
                    classNames={{ label: "text-gray-700" }}
                    value="Para longe"
                  >
                    Para longe
                  </Radio>
                  <Radio classNames={{ label: "text-gray-700" }} value="Ambos">
                    Ambos
                  </Radio>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Tabela de Acuidade Visual */}
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                      Olho Direito (OD) - Longe
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                      Olho Esquerdo (OE) - Longe
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                      Ambos os Olhos - Perto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">
                      <Input
                        className="border-gray-300 text-center bg-white"
                        placeholder="Ex: 20/20"
                        value={formData.longeOD}
                        onChange={(e) =>
                          handleInputChange("longeOD", e.target.value)
                        }
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Input
                        className="border-gray-300 text-center bg-white"
                        placeholder="Ex: 20/25"
                        value={formData.longeOE}
                        onChange={(e) =>
                          handleInputChange("longeOE", e.target.value)
                        }
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Input
                        className="border-gray-300 text-center bg-white"
                        placeholder="Ex: J1"
                        value={formData.pertoBinocular}
                        onChange={(e) =>
                          handleInputChange(
                            "pertoBinocular",
                            e.target.value.toUpperCase(),
                          )
                        }
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Teste de Ishihara (Opcional) */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              classNames={{
                label: "text-lg font-bold text-gray-800",
                icon: "text-white",
              }}
              color="success"
              isSelected={formData.ishiharaRealizado}
              size="lg"
              onValueChange={handleIshiharaRealizadoChange}
            >
              <span className="text-lg font-bold text-gray-800">
                Teste de Ishihara (Colorimetria)
              </span>
            </Checkbox>
            <span className="text-sm text-gray-500">(Opcional)</span>
          </div>

          {formData.ishiharaRealizado && (
            <Button
              className="flex items-center gap-2"
              color="default"
              startContent={
                showIshihara ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )
              }
              variant="light"
              onPress={() => setShowIshihara(!showIshihara)}
            >
              {showIshihara ? "Ocultar" : "Realizar"}
            </Button>
          )}
        </div>

        {formData.ishiharaRealizado && showIshihara && (
          <div className="mt-6">
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-6">
                Use "NA", "-", "nenhum" para quando não enxergar nenhum número.
              </p>

              {/* Botões de ação rápida */}
              <div className="flex justify-center gap-4 mb-6">
                <Button
                  className="flex items-center gap-2"
                  variant="flat"
                  onPress={limparTesteIshihara}
                >
                  Limpar Teste
                </Button>
                <Button
                  className="flex items-center gap-2 bg-green-50 text-green-700"
                  color="success"
                  variant="solid"
                  onPress={preencherTodosCorretosIshihara}
                >
                  <CheckCheck className="h-4 w-4" />
                  Todos Corretos
                </Button>
              </div>

              {/* Tabela de Placas */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                        Placa
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                        Número identificado
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                        Resultado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {placasIshiharaConfig.map((placa) => (
                      <tr key={placa.number}>
                        <td className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-700">
                          {placa.number}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Input
                            className="border-gray-300 text-center bg-white"
                            placeholder={`Ex: ${placa.normal}`}
                            value={
                              formData[
                                placa.fieldPlaca as keyof AcuidadeVisualData
                              ] as string
                            }
                            onChange={(e) =>
                              handleIshiharaChange(placa.number, e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div
                            className={`text-center font-medium ${
                              formData[
                                placa.fieldResultado as keyof AcuidadeVisualData
                              ] === "Normal"
                                ? "text-green-600"
                                : formData[
                                      placa.fieldResultado as keyof AcuidadeVisualData
                                    ] === "Daltonismo verde-vermelho"
                                  ? "text-yellow-600"
                                  : formData[
                                        placa.fieldResultado as keyof AcuidadeVisualData
                                      ] === "Daltonismo total"
                                    ? "text-red-600"
                                    : "text-gray-600"
                            }`}
                          >
                            {
                              formData[
                                placa.fieldResultado as keyof AcuidadeVisualData
                              ] as string
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!formData.ishiharaRealizado && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Marque o checkbox acima para habilitar o teste de Ishihara
            </p>
          </div>
        )}
      </Card>

      {/* 4. Teste de Estereopsia (Opcional) */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              classNames={{
                label: "text-lg font-bold text-gray-800",
                icon: "text-white",
              }}
              color="success"
              isSelected={formData.estereopsiaRealizado}
              size="lg"
              onValueChange={handleEstereopsiaRealizadoChange}
            >
              <span className="text-lg font-bold text-gray-800">
                Teste de Estereopsia (Profundidade)
              </span>
            </Checkbox>
            <span className="text-sm text-gray-500">(Opcional)</span>
          </div>

          {formData.estereopsiaRealizado && (
            <Button
              className="flex items-center gap-2"
              color="default"
              startContent={
                showEstereopsia ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )
              }
              variant="light"
              onPress={() => setShowEstereopsia(!showEstereopsia)}
            >
              {showEstereopsia ? "Ocultar" : "Realizar"}
            </Button>
          )}
        </div>

        {formData.estereopsiaRealizado && showEstereopsia && (
          <div className="mt-6">
            <TesteEstereopsia />
          </div>
        )}

        {!formData.estereopsiaRealizado && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Marque o checkbox acima para habilitar o teste de Estereopsia
            </p>
          </div>
        )}
      </Card>

      {/* 5. Conclusão Geral */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="5" title="Conclusão" />

        <div className="space-y-6">
          {/* Alerta automático para PCD */}
          {resultadoPCD.sugereInvestigacao && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-800 text-sm mb-2">
                    Possibilidade de Enquadramento PCD Identificada
                  </h3>
                  <p className="text-yellow-700 text-sm mb-2">
                    <strong>Critério(s) atendido(s):</strong>
                  </p>
                  <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1">
                    {resultadoPCD.criterios.map((criterio, index) => (
                      <li key={index}>{criterio}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observações do avaliador
            </label>
            <Textarea
              className="border-gray-300 bg-white"
              placeholder="Informações adicionais sobre o exame..."
              rows={3}
              value={formData.observacoesFinais}
              onChange={(e) =>
                handleInputChange("observacoesFinais", e.target.value)
              }
            />
          </div>

          {/* Campos ocultos para armazenar as variáveis booleanas e critério PCD */}
          <input type="hidden" value={formData.criterioPCDIdentificado} />
          <input
            type="hidden"
            value={formData.laudoOftalmologistaRecomendado ? "true" : "false"}
          />
          <input
            type="hidden"
            value={formData.ishiharaRealizado ? "true" : "false"}
          />
          <input
            type="hidden"
            value={formData.estereopsiaRealizado ? "true" : "false"}
          />
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
          isDisabled={!isAcuidadeConcluida || isLoading}
          startContent={isLoading ? <Spinner size="sm" /> : <FileText className="h-4 w-4" />}
          onPress={handleSave}
        >
          {isLoading ? "Salvando..." : isAcuidadeConcluida
            ? "Salvar / Concluir Exame"
            : "Preencha a Acuidade Visual"}
        </Button>
      </div>
    </div>
  );
};

export default React.memo(AcuidadeVisual);
