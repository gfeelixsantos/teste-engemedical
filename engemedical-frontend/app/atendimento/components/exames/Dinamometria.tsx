// Dinamometria.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Textarea,
  RadioGroup,
  Radio,
  Spinner,
} from "@heroui/react";
import { FileText } from "lucide-react";

import HeaderExame from "./HeaderExame";

import { IUserInfo, useUser } from "@/hooks/useUser";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface DinamometriaProps {
  atendimento: any;
  exame: string;
  formulario: any;
  operationalUser?: IUserInfo | null;
  onSave?: (data: any) => void;
  onClose?: () => void;
}

interface DinamometriaData {
  // Dados do exame
  profissional: string;

  // Dados do Paciente
  ladoDominante: string;
  sexo: string;

  // Dinamometria Palmar - Força de Preensão Manual
  palmarDireita1: string;
  palmarDireita2: string;
  palmarDireita3: string;
  palmarDireitaMedia: string;
  palmarEsquerda1: string;
  palmarEsquerda2: string;
  palmarEsquerda3: string;
  palmarEsquerdaMedia: string;
  classificacaoPalmar: string;

  // Dinamometria Escapular - Força de Membros Superiores
  escapularDireita1: string;
  escapularDireita2: string;
  escapularDireita3: string;
  escapularDireitaMedia: string;
  escapularEsquerda1: string;
  escapularEsquerda2: string;
  escapularEsquerda3: string;
  escapularEsquerdaMedia: string;
  classificacaoEscapular: string;

  // Dinamometria Dorsal - Força de Tronco
  dorsal1: string;
  dorsal2: string;
  dorsal3: string;
  dorsalMedia: string;
  classificacaoDorsal: string;

  // Resultado e Observações
  resultado: string;
  observacoesFinais: string;
}

interface TipoDinamometriaPreenchido {
  palmar: boolean;
  escapular: boolean;
  dorsal: boolean;
}

const Dinamometria: React.FC<DinamometriaProps> = ({
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
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    ladoDominante?: string;
    sexo?: string;
    tipoDinamometria?: string;
  }>({});

  const [formData, setFormData] = useState<DinamometriaData>({
    // Dados do exame
    profissional: "",

    // Dados do Paciente
    ladoDominante: "",
    sexo: "",

    // Dinamometria Palmar
    palmarDireita1: "",
    palmarDireita2: "",
    palmarDireita3: "",
    palmarDireitaMedia: "",
    palmarEsquerda1: "",
    palmarEsquerda2: "",
    palmarEsquerda3: "",
    palmarEsquerdaMedia: "",
    classificacaoPalmar: "",

    // Dinamometria Escapular
    escapularDireita1: "",
    escapularDireita2: "",
    escapularDireita3: "",
    escapularDireitaMedia: "",
    escapularEsquerda1: "",
    escapularEsquerda2: "",
    escapularEsquerda3: "",
    escapularEsquerdaMedia: "",
    classificacaoEscapular: "",

    // Dinamometria Dorsal
    dorsal1: "",
    dorsal2: "",
    dorsal3: "",
    dorsalMedia: "",
    classificacaoDorsal: "",

    // Resultado e Observações
    resultado: "Normal",
    observacoesFinais: "",
  });

  const [tiposPreenchidos, setTiposPreenchidos] =
    useState<TipoDinamometriaPreenchido>({
      palmar: false,
      escapular: false,
      dorsal: false,
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

  // Preencher profissional responsável automaticamente
  useEffect(() => {
    if (effectiveUser?.nome && !formData.profissional) {
      setFormData((prev) => ({
        ...prev,
        profissional: effectiveUser.nome,
      }));
    }
  }, [effectiveUser?.nome, formData.profissional]);

  // Verificar quais tipos de dinamometria foram preenchidos
  useEffect(() => {
    const palmarPreenchido =
      formData.palmarDireita1.trim() !== "" ||
      formData.palmarDireita2.trim() !== "" ||
      formData.palmarDireita3.trim() !== "" ||
      formData.palmarEsquerda1.trim() !== "" ||
      formData.palmarEsquerda2.trim() !== "" ||
      formData.palmarEsquerda3.trim() !== "";

    const escapularPreenchido =
      formData.escapularDireita1.trim() !== "" ||
      formData.escapularDireita2.trim() !== "" ||
      formData.escapularDireita3.trim() !== "" ||
      formData.escapularEsquerda1.trim() !== "" ||
      formData.escapularEsquerda2.trim() !== "" ||
      formData.escapularEsquerda3.trim() !== "";

    const dorsalPreenchido =
      formData.dorsal1.trim() !== "" ||
      formData.dorsal2.trim() !== "" ||
      formData.dorsal3.trim() !== "";

    setTiposPreenchidos({
      palmar: palmarPreenchido,
      escapular: escapularPreenchido,
      dorsal: dorsalPreenchido,
    });
  }, [
    formData.palmarDireita1,
    formData.palmarDireita2,
    formData.palmarDireita3,
    formData.palmarEsquerda1,
    formData.palmarEsquerda2,
    formData.palmarEsquerda3,
    formData.escapularDireita1,
    formData.escapularDireita2,
    formData.escapularDireita3,
    formData.escapularEsquerda1,
    formData.escapularEsquerda2,
    formData.escapularEsquerda3,
    formData.dorsal1,
    formData.dorsal2,
    formData.dorsal3,
  ]);

  // Função auxiliar para calcular média
  const calcularMedia = useCallback((valores: string[]): string => {
    const numeros = valores
      .map((v) => parseFloat(v.replace(",", ".")))
      .filter((v) => !isNaN(v));

    if (numeros.length === 0) return "";

    const media = numeros.reduce((a, b) => a + b) / numeros.length;

    return media.toFixed(1).replace(".", ",");
  }, []);

  // Cálculo automático das médias
  useEffect(() => {
    // Cálculo da média palmar direita
    const mediaPalmarDireita = calcularMedia([
      formData.palmarDireita1,
      formData.palmarDireita2,
      formData.palmarDireita3,
    ]);

    // Cálculo da média palmar esquerda
    const mediaPalmarEsquerda = calcularMedia([
      formData.palmarEsquerda1,
      formData.palmarEsquerda2,
      formData.palmarEsquerda3,
    ]);

    // Cálculo da média escapular direita
    const mediaEscapularDireita = calcularMedia([
      formData.escapularDireita1,
      formData.escapularDireita2,
      formData.escapularDireita3,
    ]);

    // Cálculo da média escapular esquerda
    const mediaEscapularEsquerda = calcularMedia([
      formData.escapularEsquerda1,
      formData.escapularEsquerda2,
      formData.escapularEsquerda3,
    ]);

    // Cálculo da média dorsal
    const mediaDorsal = calcularMedia([
      formData.dorsal1,
      formData.dorsal2,
      formData.dorsal3,
    ]);

    setFormData((prev) => ({
      ...prev,
      ...(mediaPalmarDireita && { palmarDireitaMedia: mediaPalmarDireita }),
      ...(mediaPalmarEsquerda && { palmarEsquerdaMedia: mediaPalmarEsquerda }),
      ...(mediaEscapularDireita && {
        escapularDireitaMedia: mediaEscapularDireita,
      }),
      ...(mediaEscapularEsquerda && {
        escapularEsquerdaMedia: mediaEscapularEsquerda,
      }),
      ...(mediaDorsal && { dorsalMedia: mediaDorsal }),
    }));
  }, [
    formData.palmarDireita1,
    formData.palmarDireita2,
    formData.palmarDireita3,
    formData.palmarEsquerda1,
    formData.palmarEsquerda2,
    formData.palmarEsquerda3,
    formData.escapularDireita1,
    formData.escapularDireita2,
    formData.escapularDireita3,
    formData.escapularEsquerda1,
    formData.escapularEsquerda2,
    formData.escapularEsquerda3,
    formData.dorsal1,
    formData.dorsal2,
    formData.dorsal3,
    calcularMedia,
  ]);

  // Cálculo automático do resultado
  useEffect(() => {
    calcularResultado();
  }, [
    formData.palmarDireitaMedia,
    formData.palmarEsquerdaMedia,
    formData.escapularDireitaMedia,
    formData.escapularEsquerdaMedia,
    formData.dorsalMedia,
    formData.ladoDominante,
    formData.sexo,
    tiposPreenchidos,
  ]);

  const validarFormulario = useCallback(() => {
    const errors: {
      ladoDominante?: string;
      sexo?: string;
      tipoDinamometria?: string;
    } = {};

    // Validação de dados obrigatórios
    if (!formData.ladoDominante) {
      errors.ladoDominante = "Lado dominante é obrigatório";
    }

    if (!formData.sexo) {
      errors.sexo = "Sexo é obrigatório";
    }

    // Validação de pelo menos um tipo de dinamometria preenchido
    const peloMenosUmTipoPreenchido =
      tiposPreenchidos.palmar ||
      tiposPreenchidos.escapular ||
      tiposPreenchidos.dorsal;

    if (!peloMenosUmTipoPreenchido) {
      errors.tipoDinamometria =
        "É obrigatório preencher ao menos um tipo de dinamometria (palmar, escapular ou dorsal)";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  }, [formData.ladoDominante, formData.sexo, tiposPreenchidos]);

  // Função para avaliar dinamometria palmar
  const avaliarDinamometriaPalmar = useCallback(
    (mediaDominante: number, mediaNaoDominante: number, sexo: string) => {
      if (sexo === "Masculino") {
        const dominanteAdequado = mediaDominante >= 45;
        const naoDominanteAdequado = mediaNaoDominante >= 40;

        return dominanteAdequado && naoDominanteAdequado;
      } else {
        const dominanteAdequado = mediaDominante >= 25;
        const naoDominanteAdequado = mediaNaoDominante >= 20;

        return dominanteAdequado && naoDominanteAdequado;
      }
    },
    [],
  );

  // Função para avaliar dinamometria escapular
  const avaliarDinamometriaEscapular = useCallback(
    (mediaDireita: number, mediaEsquerda: number, sexo: string) => {
      const minimo = sexo === "Masculino" ? 20 : 10;

      const direitaAdequada = mediaDireita >= minimo;
      const esquerdaAdequada = mediaEsquerda >= minimo;

      return direitaAdequada && esquerdaAdequada;
    },
    [],
  );

  // Função para avaliar dinamometria dorsal
  const avaliarDinamometriaDorsal = useCallback(
    (media: number, sexo: string) => {
      const minimo = sexo === "Masculino" ? 100 : 50;

      return media >= minimo;
    },
    [],
  );

  const calcularResultado = useCallback(() => {
    // Verificar se temos dados suficientes para avaliação
    if (!formData.ladoDominante || !formData.sexo) {
      setFormData((prev) => ({
        ...prev,
        resultado: "Normal",
      }));

      return;
    }

    // Obter todas as médias como números
    const mediaPalmarDir =
      parseFloat(formData.palmarDireitaMedia.replace(",", ".")) || 0;
    const mediaPalmarEsq =
      parseFloat(formData.palmarEsquerdaMedia.replace(",", ".")) || 0;
    const mediaEscapularDir =
      parseFloat(formData.escapularDireitaMedia.replace(",", ".")) || 0;
    const mediaEscapularEsq =
      parseFloat(formData.escapularEsquerdaMedia.replace(",", ".")) || 0;
    const mediaDorsal = parseFloat(formData.dorsalMedia.replace(",", ".")) || 0;

    // Lista para armazenar os resultados individuais
    const resultadosIndividuais: string[] = [];
    let todosNormais = true;
    let algumPreenchido = false;

    // Avaliar cada tipo de dinamometria separadamente
    let palmarNormal = false;
    let escapularNormal = false;
    let dorsalNormal = false;

    // Verificar e avaliar dinamometria palmar se preenchida
    if (tiposPreenchidos.palmar && mediaPalmarDir > 0 && mediaPalmarEsq > 0) {
      algumPreenchido = true;
      if (formData.ladoDominante === "Direito") {
        palmarNormal = avaliarDinamometriaPalmar(
          mediaPalmarDir,
          mediaPalmarEsq,
          formData.sexo,
        );
      } else {
        palmarNormal = avaliarDinamometriaPalmar(
          mediaPalmarEsq,
          mediaPalmarDir,
          formData.sexo,
        );
      }
      resultadosIndividuais.push(
        `Palmar: ${palmarNormal ? "Normal" : "Alterado"}`,
      );
      if (!palmarNormal) todosNormais = false;
    }

    // Verificar e avaliar dinamometria escapular se preenchida
    if (
      tiposPreenchidos.escapular &&
      mediaEscapularDir > 0 &&
      mediaEscapularEsq > 0
    ) {
      algumPreenchido = true;
      escapularNormal = avaliarDinamometriaEscapular(
        mediaEscapularDir,
        mediaEscapularEsq,
        formData.sexo,
      );
      resultadosIndividuais.push(
        `Escapular: ${escapularNormal ? "Normal" : "Alterado"}`,
      );
      if (!escapularNormal) todosNormais = false;
    }

    // Verificar e avaliar dinamometria dorsal se preenchida
    if (tiposPreenchidos.dorsal && mediaDorsal > 0) {
      algumPreenchido = true;
      dorsalNormal = avaliarDinamometriaDorsal(mediaDorsal, formData.sexo);
      resultadosIndividuais.push(
        `Dorsal: ${dorsalNormal ? "Normal" : "Alterado"}`,
      );
      if (!dorsalNormal) todosNormais = false;
    }

    // Determinar resultado final baseado nos tipos preenchidos
    let resultadoFinal = "Normal";

    if (!algumPreenchido) {
      resultadoFinal = "Normal";
    } else if (todosNormais) {
      resultadoFinal = "Normal";
    } else {
      resultadoFinal = "Alterado";
    }

    // Atualizar classificações individuais apenas para os tipos preenchidos
    setFormData((prev) => ({
      ...prev,
      resultado: resultadoFinal,
      classificacaoPalmar: tiposPreenchidos.palmar
        ? palmarNormal
          ? "Normal"
          : "Abaixo do esperado"
        : "",
      classificacaoEscapular: tiposPreenchidos.escapular
        ? escapularNormal
          ? "Normal"
          : "Abaixo do esperado"
        : "",
      classificacaoDorsal: tiposPreenchidos.dorsal
        ? dorsalNormal
          ? "Normal"
          : "Abaixo do esperado"
        : "",
    }));
  }, [
    formData.palmarDireitaMedia,
    formData.palmarEsquerdaMedia,
    formData.escapularDireitaMedia,
    formData.escapularEsquerdaMedia,
    formData.dorsalMedia,
    formData.ladoDominante,
    formData.sexo,
    tiposPreenchidos,
    avaliarDinamometriaPalmar,
    avaliarDinamometriaEscapular,
    avaliarDinamometriaDorsal,
  ]);

  const handleInputChange = useCallback(
    (field: keyof DinamometriaData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Limpar erro do campo quando preenchido
      if ((field === "ladoDominante" || field === "sexo") && value) {
        setFormErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!validarFormulario()) {
      return;
    }
    setIsLoading(true);
    try {
      await onSave?.(formData);
    } finally {
      setIsLoading(false);
    }
  }, [formData, onSave, validarFormulario]);

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

  const renderTabelaDinamometria = (
    titulo: string,
    ladoDireito: {
      campo1: string;
      campo2: string;
      campo3: string;
      media: string;
    },
    ladoEsquerdo: {
      campo1: string;
      campo2: string;
      campo3: string;
      media: string;
    },
    unidade: string = "kgf",
  ) => (
    <div className="p-4 ">
      <h3 className="font-semibold text-gray-700 mb-4 text-center text-lg">
        {titulo}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                Lado
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                1ª Medida ({unidade})
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                2ª Medida ({unidade})
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                3ª Medida ({unidade})
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                Média ({unidade})
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-3 font-medium text-gray-700 text-center">
                Direito
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  className="border-gray-300 text-center bg-white"
                  placeholder="0,0"
                  value={
                    formData[
                      ladoDireito.campo1 as keyof DinamometriaData
                    ] as string
                  }
                  onChange={(e) =>
                    handleInputChange(
                      ladoDireito.campo1 as keyof DinamometriaData,
                      e.target.value,
                    )
                  }
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  className="border-gray-300 text-center bg-white"
                  placeholder="0,0"
                  value={
                    formData[
                      ladoDireito.campo2 as keyof DinamometriaData
                    ] as string
                  }
                  onChange={(e) =>
                    handleInputChange(
                      ladoDireito.campo2 as keyof DinamometriaData,
                      e.target.value,
                    )
                  }
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  className="border-gray-300 text-center bg-white"
                  placeholder="0,0"
                  value={
                    formData[
                      ladoDireito.campo3 as keyof DinamometriaData
                    ] as string
                  }
                  onChange={(e) =>
                    handleInputChange(
                      ladoDireito.campo3 as keyof DinamometriaData,
                      e.target.value,
                    )
                  }
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  isReadOnly
                  className="border-gray-300 text-center bg-gray-100 font-semibold"
                  value={
                    formData[
                      ladoDireito.media as keyof DinamometriaData
                    ] as string
                  }
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-3 font-medium text-gray-700 text-center">
                Esquerdo
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  className="border-gray-300 text-center bg-white"
                  placeholder="0,0"
                  value={
                    formData[
                      ladoEsquerdo.campo1 as keyof DinamometriaData
                    ] as string
                  }
                  onChange={(e) =>
                    handleInputChange(
                      ladoEsquerdo.campo1 as keyof DinamometriaData,
                      e.target.value,
                    )
                  }
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  className="border-gray-300 text-center bg-white"
                  placeholder="0,0"
                  value={
                    formData[
                      ladoEsquerdo.campo2 as keyof DinamometriaData
                    ] as string
                  }
                  onChange={(e) =>
                    handleInputChange(
                      ladoEsquerdo.campo2 as keyof DinamometriaData,
                      e.target.value,
                    )
                  }
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  className="border-gray-300 text-center bg-white"
                  placeholder="0,0"
                  value={
                    formData[
                      ladoEsquerdo.campo3 as keyof DinamometriaData
                    ] as string
                  }
                  onChange={(e) =>
                    handleInputChange(
                      ladoEsquerdo.campo3 as keyof DinamometriaData,
                      e.target.value,
                    )
                  }
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <Input
                  isReadOnly
                  className="border-gray-300 text-center bg-gray-100 font-semibold"
                  value={
                    formData[
                      ladoEsquerdo.media as keyof DinamometriaData
                    ] as string
                  }
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // Adicionar indicador visual dos tipos preenchidos
  const renderIndicadorTiposPreenchidos = () => (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">
            Tipos preenchidos:
          </span>
          <div className="flex space-x-3">
            <div
              className={`flex items-center ${tiposPreenchidos.palmar ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-1 ${tiposPreenchidos.palmar ? "bg-green-500" : "bg-gray-300"}`}
              />
              <span className="text-xs">Palmar</span>
            </div>
            <div
              className={`flex items-center ${tiposPreenchidos.escapular ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-1 ${tiposPreenchidos.escapular ? "bg-green-500" : "bg-gray-300"}`}
              />
              <span className="text-xs">Escapular</span>
            </div>
            <div
              className={`flex items-center ${tiposPreenchidos.dorsal ? "text-green-600" : "text-gray-400"}`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-1 ${tiposPreenchidos.dorsal ? "bg-green-500" : "bg-gray-300"}`}
              />
              <span className="text-xs">Dorsal</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500">Preencha ao menos um tipo</div>
      </div>
      {formErrors.tipoDinamometria && (
        <div className="mt-2 text-red-500 text-sm font-medium">
          ⚠ {formErrors.tipoDinamometria}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 min-h-screen">
      <HeaderExame agendamento={agendamento} exame={exame} />

      {/* 2. Dinamometria Palmar */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="2" title="Dinamometria Palmar" />

        {/* Dados Obrigatórios - Lado Dominante e Sexo */}
        <div className="p-4 ">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide flex items-center">
            Dados Obrigatórios para Avaliação
            <span className="ml-2 text-red-500 text-xs">*</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Lado Dominante <span className="text-red-500">*</span>
                {formErrors.ladoDominante && (
                  <span className="ml-2 text-red-500 text-xs">
                    {formErrors.ladoDominante}
                  </span>
                )}
              </label>
              <RadioGroup
                className="gap-4"
                color="success"
                orientation="horizontal"
                value={formData.ladoDominante}
                onValueChange={(value) =>
                  handleInputChange("ladoDominante", value)
                }
              >
                <Radio className="mr-2" value="Direito">
                  Direito
                </Radio>
                <Radio value="Esquerdo">Esquerdo</Radio>
              </RadioGroup>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sexo <span className="text-red-500">*</span>
                {formErrors.sexo && (
                  <span className="ml-2 text-red-500 text-xs">
                    {formErrors.sexo}
                  </span>
                )}
              </label>
              <RadioGroup
                className="gap-4"
                color="success"
                orientation="horizontal"
                value={formData.sexo}
                onValueChange={(value) => handleInputChange("sexo", value)}
              >
                <Radio className="mr-2" value="Masculino">
                  Masculino
                </Radio>
                <Radio value="Feminino">Feminino</Radio>
              </RadioGroup>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {renderTabelaDinamometria(
            "Força de Preensão Manual (kgf)",
            {
              campo1: "palmarDireita1",
              campo2: "palmarDireita2",
              campo3: "palmarDireita3",
              media: "palmarDireitaMedia",
            },
            {
              campo1: "palmarEsquerda1",
              campo2: "palmarEsquerda2",
              campo3: "palmarEsquerda3",
              media: "palmarEsquerdaMedia",
            },
            "kgf",
          )}

          {/* Critérios de Avaliação */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-green-800 mb-2 text-sm">
              Critérios de Avaliação - Dinamometria Palmar:
            </h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>
                • <strong>Homens:</strong> Lado dominante ≥ 45 kgf | Lado não
                dominante ≥ 40 kgf
              </li>
              <li>
                • <strong>Mulheres:</strong> Lado dominante ≥ 25 kgf | Lado não
                dominante ≥ 20 kgf
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 3. Dinamometria Escapular */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="3" title="Dinamometria Escapular" />

        <div className="space-y-6">
          {renderTabelaDinamometria(
            "Força de Membros Superiores (kgf)",
            {
              campo1: "escapularDireita1",
              campo2: "escapularDireita2",
              campo3: "escapularDireita3",
              media: "escapularDireitaMedia",
            },
            {
              campo1: "escapularEsquerda1",
              campo2: "escapularEsquerda2",
              campo3: "escapularEsquerda3",
              media: "escapularEsquerdaMedia",
            },
            "kgf",
          )}

          {/* Critérios de Avaliação */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-green-800 mb-2 text-sm">
              Critérios de Avaliação - Dinamometria Escapular:
            </h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>
                • <strong>Homens:</strong> Ambos os lados ≥ 20 kgf
              </li>
              <li>
                • <strong>Mulheres:</strong> Ambos os lados ≥ 10 kgf
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 4. Dinamometria Dorsal */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="4" title="Dinamometria Dorsal" />

        <div className="space-y-6">
          <div className="p-4">
            <h3 className="font-semibold text-gray-700 mb-4 text-center text-lg">
              Força de Tronco (kgf)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                      1ª Medida (kgf)
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                      2ª Medida (kgf)
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                      3ª Medida (kgf)
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">
                      Média (kgf)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">
                      <Input
                        className="border-gray-300 text-center bg-white"
                        placeholder="0,0"
                        value={formData.dorsal1}
                        onChange={(e) =>
                          handleInputChange("dorsal1", e.target.value)
                        }
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Input
                        className="border-gray-300 text-center bg-white"
                        placeholder="0,0"
                        value={formData.dorsal2}
                        onChange={(e) =>
                          handleInputChange("dorsal2", e.target.value)
                        }
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Input
                        className="border-gray-300 text-center bg-white"
                        placeholder="0,0"
                        value={formData.dorsal3}
                        onChange={(e) =>
                          handleInputChange("dorsal3", e.target.value)
                        }
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Input
                        isReadOnly
                        className="border-gray-300 text-center bg-gray-100 font-semibold"
                        value={formData.dorsalMedia}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Critérios de Avaliação */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="font-semibold text-green-800 mb-2 text-sm">
              Critérios de Avaliação - Dinamometria Dorsal:
            </p>
            <ul className="text-xs text-green-700 space-y-1">
              <li>
                • <strong>Homens:</strong> Média ≥ 100 kgf
              </li>
              <li>
                • <strong>Mulheres:</strong> Média ≥ 50 kgf
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 5. Resultado e Observações */}
      <Card className="p-6 shadow-sm border border-gray-200 bg-white">
        <SectionTitle number="5" title="Resultado e Observações" />
        <div className="p-4 ">
          {/* Indicador de tipos preenchidos */}
          {renderIndicadorTiposPreenchidos()}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resultado Final
            </label>
            <Input
              isReadOnly
              className="border-gray-300 bg-gray-100 font-semibold"
              classNames={{
                input: `font-bold ${
                  formData.resultado === "Normal"
                    ? "text-green-600"
                    : formData.resultado === "Alterado"
                      ? "text-red-600"
                      : "text-gray-600"
                }`,
              }}
              value={formData.resultado}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações Finais
            </label>
            <Textarea
              className="bg-white border-gray-300"
              placeholder="Observações finais sobre a avaliação de força muscular..."
              rows={4}
              value={formData.observacoesFinais}
              onChange={(e) =>
                handleInputChange("observacoesFinais", e.target.value)
              }
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
          {isLoading ? "Salvando..." : "Salvar / Concluir Exame"}
        </Button>
      </div>
    </div>
  );
};

export default React.memo(Dinamometria);
