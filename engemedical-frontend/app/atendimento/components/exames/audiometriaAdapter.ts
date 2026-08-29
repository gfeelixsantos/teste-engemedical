import { AudiometriaData } from "./AudiometriaOcupacional";

import { AudiometriaExportaDados } from "@/lib/soc/interfaces/AudiometriaExportaDados";

/**
 * Adapta os dados exportados do SOC para o formato utilizado no frontend.
 * Segue o mesmo padrão de tratamento do componente AudiometriaOcupacional.
 *
 * Regras de conversão dos valores SOC:
 *  - "998" → campo não realizado/não testado → ''
 *  - "999" → ausência de resposta → '---'  (equivalente ao sinal de sem resposta do componente)
 *  - "0"   → valor VÁLIDO em via aérea/óssea (0 dB); apenas descartado em campos de configuração
 *  - ""    → não preenchido → ''
 */
export function adaptExportaDadosToAudiometriaData(
  exportData: AudiometriaExportaDados,
  atendimento?: any,
): AudiometriaData {
  // ============= FUNÇÕES AUXILIARES =============

  /**
   * Converte valor de limiar auditivo do SOC para o formato do frontend.
   *  - 998  → '' (não testado)
   *  - 999  → '---' (ausência de resposta — sem resposta ao estímulo máximo)
   *  - 0    → '0' (valor VÁLIDO — limiar em 0 dB)
   *  - null/undefined → ''
   */
  const parseLimiar = (value: string | undefined | null): string => {
    if (value === null || value === undefined || value === "") return "";
    if (value === "998") return ""; // Não testado
    if (value === "999") return "---"; // Sem resposta

    return value;
  };

  /**
   * Converte boolean do SOC (0/1 ou S/N) para boolean do frontend.
   */
  const parseBoolean = (value: string | undefined | null): boolean => {
    if (!value) return false;

    return value === "1" || value.toUpperCase() === "S";
  };

  /**
   * Converte valor de SRT (998 = Não realizado → '').
   * SRT é em palavras, não em dB numérico puro, então 999 → '---' não se aplica.
   */
  const parseSrtValue = (value: string | undefined | null): string => {
    if (!value || value === "998") return "";

    return value;
  };

  /**
   * Converte o campo REPOUSO_AUDITIVO do SOC.
   * Pode vir como: 'S', 'N', '1', '0', ou um número de horas (ex: '14').
   * Retorna 'Sim'/'Não'.
   */
  const parseRepousoAuditivo = (value: string | undefined | null): string => {
    if (!value || value === "0" || value.toUpperCase() === "N") return "Não";

    return "Sim";
  };

  /**
   * Extrai o número de horas de repouso a partir do campo REPOUSO_AUDITIVO.
   * Se o valor contiver apenas dígitos e for > 1, interpreta como horas.
   * Caso contrário, usa o padrão de 14h.
   */
  const parseHorasRepouso = (value: string | undefined | null): number => {
    if (!value) return 0;
    const num = parseInt(value.replace(/\D/g, ""), 10);

    if (!isNaN(num) && num > 1) return num;
    // 'S' ou '1' ou valores não numéricos → padrão 14h
    if (value.toUpperCase() === "S" || value === "1") return 14;

    return 0;
  };

  /**
   * Mapeia o código de RESULTADO do SOC para o texto usado no componente.
   * O campo RESULTADO é único para o exame (não separado por OD/OE).
   */
  const mapResultado = (codigo: string | undefined | null): string => {
    if (!codigo) return "";
    switch (codigo) {
      case "0":
        return "NORMAL";
      case "1":
        return "SUGESTIVO_PA";
      case "2":
        return "PERDA_AUDITIVA_INDUZIDA_POR_RUIDO";
      case "3":
        return "PERDA_AUDITIVA_OUTRAS_CAUSAS";
      case "4":
        return "PERDA_AUDITIVA_CONDUTIVA";
      case "5":
        return "PERDA_AUDITIVA_MISTA";
      default:
        return codigo;
    }
  };

  /**
   * Mapeia o código de OTOSCOPIA do SOC para o código interno do componente.
   */
  const mapOtoscopia = (codigo: string | undefined | null): string => {
    if (!codigo) return "SEM_OBSTRUCAO";
    switch (codigo) {
      case "1":
        return "SEM_OBSTRUCAO";
      case "2":
        return "COM_OBSTRUCAO_PARCIAL";
      case "3":
        return "COM_OBSTRUCAO_TOTAL";
      default:
        return "SEM_OBSTRUCAO";
    }
  };

  /**
   * Mapeia o código de APARELHO do SOC para o nome do audiômetro.
   * Cobre os equipamentos mais comuns usados nas unidades.
   */
  const mapAparelho = (codigo: string | undefined | null): string => {
    if (!codigo) return "AVS 500";
    switch (codigo) {
      case "001":
        return "AVS 500";
      case "002":
        return "AS 60";
      default:
        return codigo; // Se não reconhecido, usa o próprio código
    }
  };

  // O resultado geral do exame (único campo no SOC — não há separação por OD/OE)
  const resultadoGeral = mapResultado(exportData.RESULTADO);

  // Observações por orelha, combinadas quando presentes
  const observacoesOD = exportData.OBSERVACAO_OD || "";
  const observacoesOE = exportData.OBSERVACAO_OE || "";
  const observacoesCombinadas = [
    observacoesOD ? `OD: ${observacoesOD}` : "",
    observacoesOE ? `OE: ${observacoesOE}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  // ============= CONSTRUÇÃO DO OBJETO =============

  return {
    // ============= EQUIPAMENTO =============
    tipoAudiometro: mapAparelho(exportData.APARELHO),
    dataCalibracao: "", // Não disponível no export do SOC

    // ============= REPOUSO AUDITIVO =============
    repousoAuditivo: parseRepousoAuditivo(exportData.REPOUSO_AUDITIVO),
    horasRepouso: parseHorasRepouso(exportData.REPOUSO_AUDITIVO),

    // ============= ANAMNESE =============
    // Estes campos não são exportados pelo SOC — usamos os do atendimento quando disponíveis,
    // ou valores padrão conservadores para não gerar ruído na visualização do histórico.
    queixaAuditiva: atendimento?.QUEIXA_AUDITIVA || "Não",
    audiometriaAnterior: atendimento?.AUDIOMETRIA_ANTERIOR || "Não",
    infeccaoCirurgiaOuvido: atendimento?.INFECCAO_CIRURGIA_OUVIDO || "Não",
    tratamentoOtotoxicos: atendimento?.TRATAMENTO_OTOTOXICOS || "Não",
    dataTratamentoOtotoxicos: atendimento?.DATA_TRATAMENTO_OTOTOXICOS || "",
    surdezFamilia: atendimento?.SURDEZ_FAMILIA || "Não",
    parentescoSurdez: atendimento?.PARENTESCO_SURDEZ || "",
    trabalhoAnteriorRuido: atendimento?.TRABALHO_ANTERIOR_RUIDO || "Não",
    trabalhoAtualRuido: atendimento?.TRABALHO_ATUAL_RUIDO || "Não",
    usoProtetorAuricular: atendimento?.USO_PROTETOR_AURICULAR || "Não",
    contatoQuimicos: atendimento?.CONTATO_QUIMICOS || "Não",
    habitoSomAlto: atendimento?.HABITO_SOM_ALTO || "Não",
    exposicaoExplosoes: atendimento?.EXPOSICAO_EXPLOSOES || "Não",
    traumaCabecaOuvido: atendimento?.TRAUMA_CABECA_OUVIDO || "Não",
    labirintiteTontura: atendimento?.LABIRINTITE_TONTURA || "Não",
    usoMedicamentos: atendimento?.USO_MEDICAMENTOS || "Não",
    quaisMedicamentos: atendimento?.QUAIS_MEDICAMENTOS || "",

    // ============= MEATOSCOPIA =============
    meatoscopiaOD: mapOtoscopia(exportData.OTOSCOPIA_OD),
    meatoscopiaOE: mapOtoscopia(exportData.OTOSCOPIA_OE),
    observacoesMeatoscopia: "",
    orientacaoPlugSilicone: "",

    // ============= VIA AÉREA =============
    viaAereaOD250: parseLimiar(exportData.OD_250_VIA_AEREA),
    viaAereaOD500: parseLimiar(exportData.OD_500_VIA_AEREA),
    viaAereaOD1000: parseLimiar(exportData.OD_1000_VIA_AEREA),
    viaAereaOD2000: parseLimiar(exportData.OD_2000_VIA_AEREA),
    viaAereaOD3000: parseLimiar(exportData.OD_3000_VIA_AEREA),
    viaAereaOD4000: parseLimiar(exportData.OD_4000_VIA_AEREA),
    viaAereaOD6000: parseLimiar(exportData.OD_6000_VIA_AEREA),
    viaAereaOD8000: parseLimiar(exportData.OD_8000_VIA_AEREA),

    viaAereaOE250: parseLimiar(exportData.OE_250_VIA_AEREA),
    viaAereaOE500: parseLimiar(exportData.OE_500_VIA_AEREA),
    viaAereaOE1000: parseLimiar(exportData.OE_1000_VIA_AEREA),
    viaAereaOE2000: parseLimiar(exportData.OE_2000_VIA_AEREA),
    viaAereaOE3000: parseLimiar(exportData.OE_3000_VIA_AEREA),
    viaAereaOE4000: parseLimiar(exportData.OE_4000_VIA_AEREA),
    viaAereaOE6000: parseLimiar(exportData.OE_6000_VIA_AEREA),
    viaAereaOE8000: parseLimiar(exportData.OE_8000_VIA_AEREA),

    // ============= VIA ÓSSEA =============
    viaOsseaOD500: parseLimiar(exportData.OD_500_VIA_OSSEA),
    viaOsseaOD1000: parseLimiar(exportData.OD_1000_VIA_OSSEA),
    viaOsseaOD2000: parseLimiar(exportData.OD_2000_VIA_OSSEA),
    viaOsseaOD3000: parseLimiar(exportData.OD_3000_VIA_OSSEA),
    viaOsseaOD4000: parseLimiar(exportData.OD_4000_VIA_OSSEA),

    viaOsseaOE500: parseLimiar(exportData.OE_500_VIA_OSSEA),
    viaOsseaOE1000: parseLimiar(exportData.OE_1000_VIA_OSSEA),
    viaOsseaOE2000: parseLimiar(exportData.OE_2000_VIA_OSSEA),
    viaOsseaOE3000: parseLimiar(exportData.OE_3000_VIA_OSSEA),
    viaOsseaOE4000: parseLimiar(exportData.OE_4000_VIA_OSSEA),

    // ============= MASCARAMENTO VIA AÉREA =============
    mascaramentoVAOD250: parseBoolean(exportData.MASCARAMENTO_OD_250_VIA_AEREA),
    mascaramentoVAOD500: parseBoolean(exportData.MASCARAMENTO_OD_500_VIA_AEREA),
    mascaramentoVAOD1000: parseBoolean(
      exportData.MASCARAMENTO_OD_1000_VIA_AEREA,
    ),
    mascaramentoVAOD2000: parseBoolean(
      exportData.MASCARAMENTO_OD_2000_VIA_AEREA,
    ),
    mascaramentoVAOD3000: parseBoolean(
      exportData.MASCARAMENTO_OD_3000_VIA_AEREA,
    ),
    mascaramentoVAOD4000: parseBoolean(
      exportData.MASCARAMENTO_OD_4000_VIA_AEREA,
    ),
    mascaramentoVAOD6000: parseBoolean(
      exportData.MASCARAMENTO_OD_6000_VIA_AEREA,
    ),
    mascaramentoVAOD8000: parseBoolean(
      exportData.MASCARAMENTO_OD_8000_VIA_AEREA,
    ),

    mascaramentoVAOE250: parseBoolean(exportData.MASCARAMENTO_OE_250_VIA_AEREA),
    mascaramentoVAOE500: parseBoolean(exportData.MASCARAMENTO_OE_500_VIA_AEREA),
    mascaramentoVAOE1000: parseBoolean(
      exportData.MASCARAMENTO_OE_1000_VIA_AEREA,
    ),
    mascaramentoVAOE2000: parseBoolean(
      exportData.MASCARAMENTO_OE_2000_VIA_AEREA,
    ),
    mascaramentoVAOE3000: parseBoolean(
      exportData.MASCARAMENTO_OE_3000_VIA_AEREA,
    ),
    mascaramentoVAOE4000: parseBoolean(
      exportData.MASCARAMENTO_OE_4000_VIA_AEREA,
    ),
    mascaramentoVAOE6000: parseBoolean(
      exportData.MASCARAMENTO_OE_6000_VIA_AEREA,
    ),
    mascaramentoVAOE8000: parseBoolean(
      exportData.MASCARAMENTO_OE_8000_VIA_AEREA,
    ),

    // ============= MASCARAMENTO VIA ÓSSEA =============
    mascaramentoVOOD500: parseBoolean(exportData.MASCARAMENTO_OD_500_VIA_OSSEA),
    mascaramentoVOOD1000: parseBoolean(
      exportData.MASCARAMENTO_OD_1000_VIA_OSSEA,
    ),
    mascaramentoVOOD2000: parseBoolean(
      exportData.MASCARAMENTO_OD_2000_VIA_OSSEA,
    ),
    mascaramentoVOOD3000: parseBoolean(
      exportData.MASCARAMENTO_OD_3000_VIA_OSSEA,
    ),
    mascaramentoVOOD4000: parseBoolean(
      exportData.MASCARAMENTO_OD_4000_VIA_OSSEA,
    ),

    mascaramentoVOOE500: parseBoolean(exportData.MASCARAMENTO_OE_500_VIA_OSSEA),
    mascaramentoVOOE1000: parseBoolean(
      exportData.MASCARAMENTO_OE_1000_VIA_OSSEA,
    ),
    mascaramentoVOOE2000: parseBoolean(
      exportData.MASCARAMENTO_OE_2000_VIA_OSSEA,
    ),
    mascaramentoVOOE3000: parseBoolean(
      exportData.MASCARAMENTO_OE_3000_VIA_OSSEA,
    ),
    mascaramentoVOOE4000: parseBoolean(
      exportData.MASCARAMENTO_OE_4000_VIA_OSSEA,
    ),

    // ============= IRF E SRT =============
    realizarIRF: !!(
      exportData.OD_IRF ||
      exportData.OE_IRF ||
      exportData.OD_SRT ||
      exportData.OE_SRT
    ),
    srtOD: parseSrtValue(exportData.OD_SRT),
    srtOE: parseSrtValue(exportData.OE_SRT),
    irfOD: exportData.OD_IRF || "",
    irfOE: exportData.OE_IRF || "",
    irfDBOD: "",
    irfDBOE: "",

    // ============= RESULTADOS DE SRT/IRF (mesmos que os campos de entrada) =============
    resultadoSRTOD: parseSrtValue(exportData.OD_SRT),
    resultadoSRTOE: parseSrtValue(exportData.OE_SRT),
    resultadoIRFOD: exportData.OD_IRF || "",
    resultadoIRFOE: exportData.OE_IRF || "",
    resultadoIRFMonoauralOD: "",
    resultadoIRFMonoauralOE: "",
    resultadoIRFDissimetrica: "",

    // ============= CLASSIFICAÇÕES (serão recalculadas pelo AudiometriaCalculator) =============
    entalhe4000HzOD: false,
    entalhe4000HzOE: false,
    tipoPerdaOD: "",
    tipoPerdaOE: "",
    audiometriaReferenciaDisponivel: false,
    limiaresRAOD: {},
    limiaresRAOE: {},
    classificacaoNR7OD: "",
    classificacaoNR7OE: "",
    classificacaoOD: "",
    classificacaoOE: "",
    // classificacaoGeral é o resultado geral do SOC (código único para o exame)
    classificacaoGeral: resultadoGeral,
    configuracaoOD: "",
    configuracaoOE: "",

    // ============= CAMPOS DE RESULTADO =============
    // Nota: o SOC exporta um único RESULTADO para o exame todo (não por orelha).
    // O resultadoOD/OE será recalculado pelo AudiometriaCalculator a partir dos limiares.
    // Usamos o resultado geral como valor inicial até o recálculo.
    resultadoOD: resultadoGeral,
    resultadoOE: resultadoGeral,

    conclusao: exportData.PARECER || "",
    // Observações separadas por orelha com prefixo identificador
    observacoes: observacoesCombinadas,
    perdaAuditivaOD: "",
    perdaAuditivaOE: "",
    frequenciasAlteradasOD: "",
    frequenciasAlteradasOE: "",
    criterioPCD: "",
    mediaTonalOD: 0,
    mediaTonalOE: 0,
  };
}

/**
 * Adapta múltiplas audiometrias exportadas do SOC para o formato do histórico.
 * Filtra registros sem data e ordena do mais recente para o mais antigo.
 */
export function adaptMultiplasAudiometrias(
  exportDataList: AudiometriaExportaDados[],
  atendimento?: any,
): AudiometriaData[] {
  return exportDataList
    .filter((audio) => audio.DATA_REALIZACAO) // Apenas com data válida
    .sort((a, b) => {
      const dateA = new Date(a.DATA_REALIZACAO.split("/").reverse().join("-"));
      const dateB = new Date(b.DATA_REALIZACAO.split("/").reverse().join("-"));

      return dateB.getTime() - dateA.getTime();
    })
    .map((audio) => adaptExportaDadosToAudiometriaData(audio, atendimento));
}
