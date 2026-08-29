export interface AudiometriaData {
  tipoAudiometro: string;
  dataCalibracao: string;
  repousoAuditivo: string;
  horasRepouso: number;
  queixaAuditiva: string;
  audiometriaAnterior: string;
  infeccaoCirurgiaOuvido: string;
  tratamentoOtotoxicos: string;
  dataTratamentoOtotoxicos: string;
  surdezFamilia: string;
  parentescoSurdez: string;
  trabalhoAnteriorRuido: string;
  trabalhoAtualRuido: string;
  usoProtetorAuricular: string;
  contatoQuimicos: string;
  habitoSomAlto: string;
  exposicaoExplosoes: string;
  traumaCabecaOuvido: string;
  labirintiteTontura: string;
  usoMedicamentos: string;
  quaisMedicamentos: string;
  meatoscopiaOD: string;
  meatoscopiaOE: string;
  observacoesMeatoscopia: string;
  orientacaoPlugSilicone: string;

  // Via Aérea
  viaAereaOD250: string;
  viaAereaOD500: string;
  viaAereaOD1000: string;
  viaAereaOD2000: string;
  viaAereaOD3000: string;
  viaAereaOD4000: string;
  viaAereaOD6000: string;
  viaAereaOD8000: string;
  viaAereaOE250: string;
  viaAereaOE500: string;
  viaAereaOE1000: string;
  viaAereaOE2000: string;
  viaAereaOE3000: string;
  viaAereaOE4000: string;
  viaAereaOE6000: string;
  viaAereaOE8000: string;

  // Via Óssea
  viaOsseaOD500: string;
  viaOsseaOD1000: string;
  viaOsseaOD2000: string;
  viaOsseaOD3000: string;
  viaOsseaOD4000: string;
  viaOsseaOE500: string;
  viaOsseaOE1000: string;
  viaOsseaOE2000: string;
  viaOsseaOE3000: string;
  viaOsseaOE4000: string;

  // Mascaramento
  mascaramentoOD250?: string;
  mascaramentoOD500?: string;
  mascaramentoOD1000?: string;
  mascaramentoOD2000?: string;
  mascaramentoOD3000?: string;
  mascaramentoOD4000?: string;
  mascaramentoOD6000?: string;
  mascaramentoOD8000?: string;
  mascaramentoOE250?: string;
  mascaramentoOE500?: string;
  mascaramentoOE1000?: string;
  mascaramentoOE2000?: string;
  mascaramentoOE3000?: string;
  mascaramentoOE4000?: string;
  mascaramentoOE6000?: string;
  mascaramentoOE8000?: string;

  // Mascaramento Via Óssea (se necessário)
  mascaramentoVOOD500?: string | boolean;
  mascaramentoVOOD1000?: string | boolean;
  mascaramentoVOOD2000?: string | boolean;
  mascaramentoVOOD3000?: string | boolean;
  mascaramentoVOOD4000?: string | boolean;
  mascaramentoVOOE500?: string | boolean;
  mascaramentoVOOE1000?: string | boolean;
  mascaramentoVOOE2000?: string | boolean;
  mascaramentoVOOE3000?: string | boolean;
  mascaramentoVOOE4000?: string | boolean;

  // IRF
  realizarIRF: boolean;
  srtOD: string;
  srtOE: string;
  irfOD: string;
  irfOE: string;
  irfDBOD: string;
  irfDBOE: string;

  // Resultados
  resultadoOD: string;
  resultadoOE: string;
  conclusao: string;
  observacoes: string;
  criterioPCD: string;
  classificacaoOD?: string;
  classificacaoOE?: string;
  classificacaoNR7OD?: string;
  classificacaoNR7OE?: string;
  mascaramentoVAOD250?: string | boolean;
  mascaramentoVAOD500?: string | boolean;
  mascaramentoVAOD1000?: string | boolean;
  mascaramentoVAOD2000?: string | boolean;
  mascaramentoVAOD3000?: string | boolean;
  mascaramentoVAOD4000?: string | boolean;
  mascaramentoVAOD6000?: string | boolean;
  mascaramentoVAOD8000?: string | boolean;
  mascaramentoVAOE250?: string | boolean;
  mascaramentoVAOE500?: string | boolean;
  mascaramentoVAOE1000?: string | boolean;
  mascaramentoVAOE2000?: string | boolean;
  mascaramentoVAOE3000?: string | boolean;
  mascaramentoVAOE4000?: string | boolean;
  mascaramentoVAOE6000?: string | boolean;
  mascaramentoVAOE8000?: string | boolean;
}
