//AudiometriaGraphics.ts

import { AudiometriaData } from "./AudiometriaOcupacional";

export function generateAudiogramSVG(form: AudiometriaData): {
  od: string;
  oe: string;
} {
  const COR_OD = "#B71C1C"; // Vermelho
  const COR_OE = "#0D47A1"; // Azul
  const WIDTH = 220;
  const HEIGHT = 190;
  const MARGIN_LEFT = 30;
  const MARGIN_TOP = 30;
  const GRAPH_WIDTH = WIDTH - MARGIN_LEFT - 10;
  const GRAPH_HEIGHT = HEIGHT - MARGIN_TOP - 20;

  const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
  const FREQUENCY_POSITIONS = FREQUENCIES.map(
    (_, i) => MARGIN_LEFT + (i * GRAPH_WIDTH) / (FREQUENCIES.length - 1),
  );

  const INTENSITIES = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
  const DB_RANGE = 120;

  const getY = (dB: number) =>
    MARGIN_TOP + ((dB + 10) / DB_RANGE) * GRAPH_HEIGHT;

  const getDbValue = (value: string | undefined): number | null => {
    if (!value || value === "-") return null;
    // Trata ausência de resposta ("--" ou "---") como ND (Não Detectável)
    if (value === "--" || value === "---" || value.toUpperCase() === "ND")
      return 120;
    if (isNaN(Number(value))) return null;

    return Math.max(-10, Math.min(110, Number(value)));
  };

  /** --- VALORES DO FORM --- */
  const vaOD = [
    form.viaAereaOD250,
    form.viaAereaOD500,
    form.viaAereaOD1000,
    form.viaAereaOD2000,
    form.viaAereaOD3000,
    form.viaAereaOD4000,
    form.viaAereaOD6000,
    form.viaAereaOD8000,
  ];
  const vaOE = [
    form.viaAereaOE250,
    form.viaAereaOE500,
    form.viaAereaOE1000,
    form.viaAereaOE2000,
    form.viaAereaOE3000,
    form.viaAereaOE4000,
    form.viaAereaOE6000,
    form.viaAereaOE8000,
  ];
  const voOD = [
    null,
    form.viaOsseaOD500,
    form.viaOsseaOD1000,
    form.viaOsseaOD2000,
    form.viaOsseaOD3000,
    form.viaOsseaOD4000,
    null,
    null,
  ];
  const voOE = [
    null,
    form.viaOsseaOE500,
    form.viaOsseaOE1000,
    form.viaOsseaOE2000,
    form.viaOsseaOE3000,
    form.viaOsseaOE4000,
    null,
    null,
  ];

  /** --- MASCARAMENTO --- */
  const maskVAOD = [
    form.mascaramentoVAOD250,
    form.mascaramentoVAOD500,
    form.mascaramentoVAOD1000,
    form.mascaramentoVAOD2000,
    form.mascaramentoVAOD3000,
    form.mascaramentoVAOD4000,
    form.mascaramentoVAOD6000,
    form.mascaramentoVAOD8000,
  ];
  const maskVAOE = [
    form.mascaramentoVAOE250,
    form.mascaramentoVAOE500,
    form.mascaramentoVAOE1000,
    form.mascaramentoVAOE2000,
    form.mascaramentoVAOE3000,
    form.mascaramentoVAOE4000,
    form.mascaramentoVAOE6000,
    form.mascaramentoVAOE8000,
  ];
  const maskVOOD = [
    false,
    form.mascaramentoVOOD500,
    form.mascaramentoVOOD1000,
    form.mascaramentoVOOD2000,
    form.mascaramentoVOOD3000,
    form.mascaramentoVOOD4000,
    false,
    false,
  ];
  const maskVOOE = [
    false,
    form.mascaramentoVOOE500,
    form.mascaramentoVOOE1000,
    form.mascaramentoVOOE2000,
    form.mascaramentoVOOE3000,
    form.mascaramentoVOOE4000,
    false,
    false,
  ];

  /** --- CRIA UM GRÁFICO INDIVIDUAL --- */
  const createSingle = (
    vaData: string[],
    voData: (string | null)[],
    maskVA: boolean[],
    maskVO: boolean[],
    color: string,
    earTitle: string,
    isRightEar: boolean,
  ) => {
    let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;

    /** TÍTULO */
    svg += `<text x="${WIDTH / 2}" y="${MARGIN_TOP - 16}" font-size="10" font-weight="bold" text-anchor="middle" fill="${color}">${earTitle}</text>`;

    /** GRADE X (Frequência) */
    FREQUENCY_POSITIONS.forEach((x, i) => {
      svg += `<line x1="${x}" y1="${MARGIN_TOP}" x2="${x}" y2="${HEIGHT - 20}" stroke="#ccc" stroke-width="0.5"/>`;
      svg += `<text x="${x}" y="${MARGIN_TOP - 6}" font-size="8" text-anchor="middle" fill="#555">${FREQUENCIES[i]}</text>`;
    });

    /** GRADE Y (Intensidade dB) */
    INTENSITIES.forEach((db) => {
      const y = getY(db);

      svg += `<line x1="${MARGIN_LEFT}" y1="${y}" x2="${WIDTH - 10}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>`;
      svg += `<text x="${MARGIN_LEFT - 5}" y="${y + 3}" font-size="8" text-anchor="end" fill="#555">${db}</text>`;
    });

    /** ÁREA NORMAL */
    svg += `<rect x="${MARGIN_LEFT}" y="${getY(25)}" width="${GRAPH_WIDTH}" height="${getY(-10) - getY(25)}" fill="#F0F8FF" opacity="0.6"/>`;

    /** LINHAS VA (CONECTA SÍMBOLOS) */
    let pathVA = "";

    vaData.forEach((v, i) => {
      const db = getDbValue(v);

      // Conecta apenas se o ponto for válido (não nulo, não ausência de resposta)
      if (db === null || db === 120) return;
      const x = FREQUENCY_POSITIONS[i];
      const y = getY(db);

      pathVA += pathVA === "" ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    // Linha VA não mascarada (A linha só é desenhada na condição VA)
    if (pathVA)
      svg += `<path d="${pathVA}" stroke="${color}" stroke-width="1.5" fill="none"/>`;

    /** DESENHO DOS SÍMBOLOS VIA AÉREA (VA) */
    vaData.forEach((v, i) => {
      const db = getDbValue(v);

      if (db === null) return;
      const x = FREQUENCY_POSITIONS[i];
      const y = getY(db);
      const masked = maskVA[i];
      const size = 3; // Tamanho padrão dos símbolos para melhor visualização

      if (db === 120) {
        // Ausência de Resposta (-- ou --- ou ND) → seta para baixo
        // Posiciona a seta na parte inferior do gráfico (110 dB)
        const arrowY = getY(110);

        if (isRightEar) {
          // OD: Bolinha com seta (○↓)
          if (masked) {
            // OD Mascarado: Triângulo com seta (△↓)
            svg += `<polygon points="${x},${arrowY - size - 8} ${x + size * 1.5},${arrowY - size} ${x - size * 1.5},${arrowY - size}" fill="none" stroke="${color}" stroke-width="1.5" />`;
          } else {
            // OD Não Mascarado: Círculo com seta (○↓)
            svg += `<circle cx="${x}" cy="${arrowY - size - 4}" r="${size}" fill="none" stroke="${color}" stroke-width="1.5" />`;
          }
        } else {
          // OE: X com seta (X↓)
          if (masked) {
            // OE Mascarado: Quadrado com seta (□↓)
            svg += `<rect x="${x - size}" y="${arrowY - size - 8}" width="${size * 2}" height="${size * 2}" fill="none" stroke="${color}" stroke-width="1.5" />`;
          } else {
            // OE Não Mascarado: Xis com seta (×↓)
            svg += `<path d="M ${x - size} ${arrowY - size - 8} L ${x + size} ${arrowY - size + 8} M ${x + size} ${arrowY - size - 8} L ${x - size} ${arrowY - size + 8}" stroke="${color}" stroke-width="1.5" />`;
          }
        }

        // Adiciona a seta para baixo (flecha)
        svg += `<path d="M ${x} ${arrowY - size} V ${arrowY + 6} M ${x - 3} ${arrowY + 3} L ${x} ${arrowY + 6} L ${x + 3} ${arrowY + 3}" stroke="${color}" fill="none" stroke-width="1.5" />`;

        return;
      }

      // --- SIMBOLOGIA CORRETA VA (valores normais) ---
      if (isRightEar) {
        // OD (Vermelho)
        // Não Mascarado: Círculo (○)
        // Mascarado: Triângulo (△)
        svg += masked
          ? `<polygon points="${x},${y - size} ${x + size * 1.5},${y + size} ${x - size * 1.5},${y + size}" fill="none" stroke="${color}" stroke-width="1.5" />` // Triângulo (△)
          : `<circle cx="${x}" cy="${y}" r="${size}" fill="none" stroke="${color}" stroke-width="1.5" />`; // Círculo (○)
      } else {
        // OE (Azul)
        // Não Mascarado: Xis (×)
        // Mascarado: Quadrado (□)
        svg += masked
          ? `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" fill="none" stroke="${color}" stroke-width="1.5" />` // Quadrado (□)
          : `<path d="M ${x - size} ${y - size} L ${x + size} ${y + size} M ${x + size} ${y - size} L ${x - size} ${y + size}" stroke="${color}" stroke-width="1.5" />`; // Xis (×)
      }
    });

    /** DESENHO DOS SÍMBOLOS VIA ÓSSEA (VO) - COM AUSÊNCIA DE RESPOSTA */
    voData.forEach((v, i) => {
      if (!v) return;
      const db = getDbValue(v);

      if (db === null) return;
      const x = FREQUENCY_POSITIONS[i];
      const y = getY(db);
      const size = 4;
      const masked = maskVO[i];
      const offset = 0.5; // Afasta o símbolo da linha de frequência

      if (db === 120) {
        // Ausência de Resposta para via óssea
        const arrowY = getY(110);

        if (isRightEar) {
          // VO OD com ausência de resposta
          if (masked) {
            // [ com seta (OD Mascarada)
            const x_vertical = x - size - offset;
            const x_horizontal_end = x - offset;

            svg += `<path 
                      d="M ${x_vertical} ${arrowY - size - 8} 
                         V ${arrowY - size} 
                         M ${x_vertical} ${arrowY - size - 8} L ${x_horizontal_end} ${arrowY - size - 8} 
                         M ${x_vertical} ${arrowY - size} L ${x_horizontal_end} ${arrowY - size}" 
                      stroke="${color}" fill="none" stroke-width="1.5" />`;
          } else {
            // < com seta (OD Não Mascarada)
            svg += `<path d="M ${x + offset} ${arrowY - size - 4} L ${x + size + offset} ${arrowY - size - 12} M ${x + offset} ${arrowY - size - 4} L ${x + size + offset} ${arrowY - size + 4}" stroke="${color}" fill="none" stroke-width="1.5" />`;
          }
        } else {
          // VO OE com ausência de resposta
          if (masked) {
            // ] com seta (OE Mascarada)
            const x_vertical = x + size + offset;
            const x_horizontal_end = x + offset;

            svg += `<path 
                      d="M ${x_vertical} ${arrowY - size - 8} 
                         V ${arrowY - size} 
                         M ${x_vertical} ${arrowY - size - 8} L ${x_horizontal_end} ${arrowY - size - 8} 
                         M ${x_vertical} ${arrowY - size} L ${x_horizontal_end} ${arrowY - size}" 
                      stroke="${color}" fill="none" stroke-width="1.5" />`;
          } else {
            // > com seta (OE Não Mascarada)
            svg += `<path d="M ${x - offset} ${arrowY - size - 4} L ${x - size - offset} ${arrowY - size - 12} M ${x - offset} ${arrowY - size - 4} L ${x - size - offset} ${arrowY - size + 4}" stroke="${color}" fill="none" stroke-width="1.5" />`;
          }
        }

        // Adiciona a seta para baixo (flecha)
        svg += `<path d="M ${x} ${arrowY - size} V ${arrowY + 6} M ${x - 3} ${arrowY + 3} L ${x} ${arrowY + 6} L ${x + 3} ${arrowY + 3}" stroke="${color}" fill="none" stroke-width="1.5" />`;

        return;
      }

      // --- SIMBOLOGIA CORRETA VO (valores normais) ---
      if (isRightEar) {
        // VO OD (Vermelho)
        if (masked) {
          // [ Colchete (OD Mascarada)
          const x_vertical = x - size - offset;
          const x_horizontal_end = x - offset;

          svg += `<path 
                    d="M ${x_vertical} ${y - size} 
                       V ${y + size} 
                       M ${x_vertical} ${y - size} L ${x_horizontal_end} ${y - size} 
                       M ${x_vertical} ${y + size} L ${x_horizontal_end} ${y + size}" 
                    stroke="${color}" fill="none" stroke-width="1.5" />`;
        } else {
          // < Angulado (OD Não Mascarada)
          svg += `<path d="M ${x + offset} ${y} L ${x + size + offset} ${y - size} M ${x + offset} ${y} L ${x + size + offset} ${y + size}" stroke="${color}" fill="none" stroke-width="1.5" />`;
        }
      } else {
        // VO OE (Azul)
        if (masked) {
          // ] Colchete (OE Mascarada)
          const x_vertical = x + size + offset;
          const x_horizontal_end = x + offset;

          svg += `<path 
                    d="M ${x_vertical} ${y - size} 
                       V ${y + size} 
                       M ${x_vertical} ${y - size} L ${x_horizontal_end} ${y - size} 
                       M ${x_vertical} ${y + size} L ${x_horizontal_end} ${y + size}" 
                    stroke="${color}" fill="none" stroke-width="1.5" />`;
        } else {
          // > Angulado (OE Não Mascarada)
          svg += `<path d="M ${x - offset} ${y} L ${x - size - offset} ${y - size} M ${x - offset} ${y} L ${x - size - offset} ${y + size}" stroke="${color}" fill="none" stroke-width="1.5" />`;
        }
      }
    });

    svg += `</svg>`;

    return svg;
  };

  return {
    od: createSingle(
      vaOD,
      voOD,
      maskVAOD,
      maskVOOD,
      COR_OD,
      "Ouvido Direito (OD)",
      true,
    ),
    oe: createSingle(
      vaOE,
      voOE,
      maskVAOE,
      maskVOOE,
      COR_OE,
      "Ouvido Esquerdo (OE)",
      false,
    ),
  };
}
