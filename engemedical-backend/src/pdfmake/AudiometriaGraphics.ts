import { AudiometriaData } from './templates/audiometria';

// A fun├º├úo agora retorna um objeto com os dois SVGs
export function generateAudiogramSVG(form: AudiometriaData): {
  od: string;
  oe: string;
} {
  const COR_OD = '#B71C1C';
  const COR_OE = '#0D47A1';
  const WIDTH = 260;
  const HEIGHT = 180;
  const MARGIN_LEFT = 30;
  const MARGIN_TOP = 20;
  const GRAPH_WIDTH = WIDTH - MARGIN_LEFT - 10;
  const GRAPH_HEIGHT = HEIGHT - MARGIN_TOP - 20;

  // Frequ├¬ncias (eixo X)
  const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
  const FREQUENCY_POSITIONS = FREQUENCIES.map(
    (_, i) => MARGIN_LEFT + (i * GRAPH_WIDTH) / (FREQUENCIES.length - 1),
  );

  // Intensidades (eixo Y)
  const INTENSITIES = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
  const DB_RANGE = 120;

  // Fun├º├Áes Helper
  const getY = (dB: number) =>
    MARGIN_TOP + ((dB + 10) / DB_RANGE) * GRAPH_HEIGHT;

  const getDbValue = (value: string | undefined): number | null => {
    if (!value || value === '-' || isNaN(Number(value))) return null;
    return Math.max(-10, Math.min(110, Number(value)));
  };

  // Dados de Via A├®rea e Via ├ôssea (mantidos os arrays de dados)
  const vaOdData = [
    form.viaAereaOD250,
    form.viaAereaOD500,
    form.viaAereaOD1000,
    form.viaAereaOD2000,
    form.viaAereaOD3000,
    form.viaAereaOD4000,
    form.viaAereaOD6000,
    form.viaAereaOD8000,
  ];
  const vaOeData = [
    form.viaAereaOE250,
    form.viaAereaOE500,
    form.viaAereaOE1000,
    form.viaAereaOE2000,
    form.viaAereaOE3000,
    form.viaAereaOE4000,
    form.viaAereaOE6000,
    form.viaAereaOE8000,
  ];

  const voOdData = [
    '-',
    form.viaOsseaOD500,
    form.viaOsseaOD1000,
    form.viaOsseaOD2000,
    form.viaOsseaOD3000,
    form.viaOsseaOD4000,
    '-',
    '-',
  ];
  const voOeData = [
    '-',
    form.viaOsseaOE500,
    form.viaOsseaOE1000,
    form.viaOsseaOE2000,
    form.viaOsseaOE3000,
    form.viaOsseaOE4000,
    '-',
    '-',
  ];

  /**
   * Fun├º├úo interna para criar um ├║nico gr├ífico (OD ou OE)
   */
  const createSingleAudiogram = (
    vaData: (string | undefined)[],
    voData: (string | undefined)[],
    color: string,
    earTitle: string,
    isRightEar: boolean,
  ): string => {
    let svgContent = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;

    // 0. T├¡tulo do Ouvido
    svgContent += `<text x="${WIDTH / 2}" y="${MARGIN_TOP - 5}" font-size="10" font-weight="bold" text-anchor="middle" fill="${color}">${earTitle}</text>`;

    // Linhas Verticais (Frequ├¬ncia - Hz)
    FREQUENCY_POSITIONS.forEach((x, i) => {
      // Linhas de Grade
      svgContent += `<line x1="${x}" y1="${MARGIN_TOP}" x2="${x}" y2="${HEIGHT - 20}" stroke="#ccc" stroke-width="0.5"/>`;
      // Labels Hz
      svgContent += `<text x="${x}" y="${HEIGHT - 5}" font-size="8" text-anchor="middle" fill="#555">${FREQUENCIES[i]}</text>`;
    });

    // 1. Desenhar Eixos e Fundo

    // Fundo para ├írea de normalidade (at├® 25 dB)
    svgContent += `<rect x="${MARGIN_LEFT}" y="${getY(25)}" width="${GRAPH_WIDTH}" height="${getY(-10) - getY(25)}" fill="#F0F8FF" stroke="none" opacity="0.6"/>`;

    // Linhas Horizontais (Intensidade - dB)
    INTENSITIES.forEach((db) => {
      const y = getY(db);
      // Linhas de Grade
      svgContent += `<line x1="${MARGIN_LEFT}" y1="${y}" x2="${WIDTH - 10}" y2="${y}" stroke="#ccc" stroke-width="0.5" stroke-dasharray="${db === 25 ? '0' : '3 3'}" />`;
      // Labels dB
      svgContent += `<text x="${MARGIN_LEFT - 5}" y="${y + 3}" font-size="8" text-anchor="end" fill="#555">${db}</text>`;
    });

    // 2. Desenhar Linhas e S├¡mbolos

    // Helper para desenhar as linhas de conex├úo (VA)
    const drawLine = (
      data: (string | undefined)[],
      color: string,
      isRightEar: boolean,
    ) => {
      let pathD = '';
      let symbols = '';

      data.forEach((val, i) => {
        const dB = getDbValue(val || '-');
        if (dB === null) return;

        const x = FREQUENCY_POSITIONS[i];
        const y = getY(dB);

        if (pathD === '') {
          pathD = `M ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
        }
      });

      // Desenhar a linha (apenas se houver dados)
      if (pathD !== '') {
        svgContent += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.5" />`;
      }

      // Desenhar os s├¡mbolos por cima
      data.forEach((val, i) => {
        const dB = getDbValue(val || '-');
        if (dB === null) return;

        const x = FREQUENCY_POSITIONS[i];
        const y = getY(dB);
        const size = 4;

        // S├¡mbolo para Via A├®rea
        if (isRightEar) {
          // Ouvido Direito: C├¡rculo (O)
          symbols += `<circle cx="${x}" cy="${y}" r="${size}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
        } else {
          // Ouvido Esquerdo: X (X)
          symbols += `<path d="M ${x - size} ${y - size} L ${x + size} ${y + size} M ${x + size} ${y - size} L ${x - size} ${y + size}" stroke="${color}" stroke-width="1.5"/>`;
        }
      });

      svgContent += symbols;
    };

    // Helper para desenhar os s├¡mbolos (Via ├ôssea)
    const drawVoSymbols = (
      data: (string | undefined)[],
      color: string,
      isRightEar: boolean,
    ) => {
      let symbols = '';

      data.forEach((val, i) => {
        const dB = getDbValue(val || '-');
        if (dB === null) return;

        const x = FREQUENCY_POSITIONS[i];
        const y = getY(dB);
        const size = 4;

        // S├¡mbolo para Via ├ôssea. Uso de entidades &gt; e &lt; ├® essencial aqui!
        if (isRightEar) {
          // Ouvido Direito: Chevrons (>)
          symbols += `<path d="M ${x + size} ${y} L ${x - size} ${y - size} L ${x - size} ${y + size} Z" fill="none" stroke="${color}" stroke-width="1.5"/>`;
        } else {
          // Ouvido Esquerdo: Chevrons (<)
          symbols += `<path d="M ${x - size} ${y} L ${x + size} ${y - size} L ${x + size} ${y + size} Z" fill="none" stroke="${color}" stroke-width="1.5"/>`;
        }
      });
      svgContent += symbols;
    };

    // Desenhar VA e VO para o ouvido espec├¡fico
    drawLine(vaData, color, isRightEar);
    drawVoSymbols(voData, color, isRightEar);

    // 3. Legenda Simples (Adaptada para cada gr├ífico)
    const legendX = MARGIN_LEFT + GRAPH_WIDTH - 120;
    const legendY = MARGIN_TOP + GRAPH_HEIGHT + 10;

    const legendItems = isRightEar
      ? [
          { label: 'Via A├®rea (O)', color: COR_OD, symbol: 'O' },
          { label: 'Via ├ôssea (&gt;)', color: COR_OD, symbol: '>' },
        ]
      : [
          { label: 'Via A├®rea (X)', color: COR_OE, symbol: 'X' },
          { label: 'Via ├ôssea (&lt;)', color: COR_OE, symbol: '<' },
        ];

    legendItems.forEach((item, i) => {
      const x = legendX + i * 80;
      const y = legendY;

      // Usar entidades HTML na label para evitar erro (ex: &lt; em vez de <)
      const labelText = item.label.replace('<', '&lt;').replace('>', '&gt;');

      svgContent += `<text x="${x + 8}" y="${y + 3}" font-size="8" fill="#555">${labelText}</text>`;

      // Desenhar o s├¡mbolo na legenda
      if (item.symbol === 'O') {
        svgContent += `<circle cx="${x + 3}" cy="${y}" r="2.5" fill="none" stroke="${item.color}" stroke-width="1.5"/>`;
      } else if (item.symbol === 'X') {
        const size = 2.5;
        svgContent += `<path d="M ${x + 3 - size} ${y - size} L ${x + 3 + size} ${y + size} M ${x + 3 + size} ${y - size} L ${x + 3 - size} ${y + size}" stroke="${item.color}" stroke-width="1.5"/>`;
      } else if (item.symbol === '>') {
        const size = 3;
        svgContent += `<path d="M ${x + 3 + size} ${y} L ${x + 3 - size} ${y - size} L ${x + 3 - size} ${y + size} Z" fill="none" stroke="${item.color}" stroke-width="1.5"/>`;
      } else if (item.symbol === '<') {
        const size = 3;
        svgContent += `<path d="M ${x + 3 - size} ${y} L ${x + 3 + size} ${y - size} L ${x + 3 + size} ${y + size} Z" fill="none" stroke="${item.color}" stroke-width="1.5"/>`;
      }
    });

    svgContent += `</svg>`;
    return svgContent;
  };

  // Gera os dois gr├íficos separadamente
  const odSVG = createSingleAudiogram(
    vaOdData,
    voOdData,
    COR_OD,
    'Ouvido Direito (OD)',
    true,
  );
  const oeSVG = createSingleAudiogram(
    vaOeData,
    voOeData,
    COR_OE,
    'Ouvido Esquerdo (OE)',
    false,
  );

  // Retorna um objeto com ambos
  return { od: odSVG, oe: oeSVG };
}
