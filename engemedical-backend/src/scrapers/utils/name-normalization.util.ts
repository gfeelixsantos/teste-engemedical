function stripDiacritics(value: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function collapseSpaces(value: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function normalizePersonName(value: string): string {
  return collapseSpaces(stripDiacritics(value)).toLowerCase();
}

export const NAME_STOPWORDS = new Set([
  'da',
  'de',
  'di',
  'do',
  'dos',
  'das',
  'e',
]);

export function splitNameTokens(value: string): string[] {
  return normalizePersonName(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !NAME_STOPWORDS.has(token));
}

export function matchesByNameTokens(candidate: string, query: string): boolean {
  const candidateNorm = normalizePersonName(candidate);
  const queryTokens = splitNameTokens(query);

  if (queryTokens.length === 0) return false;
  return queryTokens.every((token) => candidateNorm.includes(token));
}

export function matchesByNameTokensRatio(
  candidate: string,
  query: string,
  minRatio = 0.6,
): { matched: boolean; ratio: number; candidateNorm: string; queryTokens: string[] } {
  const candidateNorm = normalizePersonName(candidate);
  const queryTokens = splitNameTokens(query);

  if (queryTokens.length === 0) return { matched: false, ratio: 0, candidateNorm, queryTokens };

  const matchedCount = queryTokens.filter((token) => candidateNorm.includes(token)).length;
  const ratio = matchedCount / queryTokens.length;
  return { matched: ratio >= minRatio, ratio, candidateNorm, queryTokens };
}

export function buildNameSearchVariants(name: string): string[] {
  const original = collapseSpaces(name || '');
  const normalized = collapseSpaces(stripDiacritics(original));
  const tokens = splitNameTokens(original);

  const cleanName = tokens.join(' ');
  const firstLast =
    tokens.length >= 2 ? `${tokens[0]} ${tokens[tokens.length - 1]}` : '';

  // NOTA: firstTwo (ex: "ANDRE LUIZ") foi removido propositalmente
  // pois é genérico demais e pode retornar laudos de outra pessoa
  // com o mesmo nome e sobrenome. Apenas firstLast é seguro para busca genérica.
  const variants = [original, normalized, cleanName, firstLast]
    .map((item) => collapseSpaces(item))
    .filter((item) => item.length > 0);

  return [...new Set(variants)];
}

/**
 * Variantes de busca para o Medical, que usa firstTwo ("BRUNA VITTORIA") apenas
 * como ÚLTIMO recurso e de forma discriminada — não deve ser usada se houver
 * múltiplos candidatos retornados (risco de vincular laudo de outra pessoa).
 * Use em conjunto com validação extra no chamador.
 */
export function buildMedicalSearchVariants(name: string): string[] {
  const original = collapseSpaces(name || '');
  const normalized = collapseSpaces(stripDiacritics(original));
  const tokens = splitNameTokens(original);

  const cleanName = tokens.join(' ');
  const firstLast =
    tokens.length >= 2 ? `${tokens[0]} ${tokens[tokens.length - 1]}` : '';

  const firstTwo =
    tokens.length >= 3 ? `${tokens[0]} ${tokens[1]}` : '';

  const stopwordVariants: string[] = [];
  const originalTokens = original.split(/\s+/);
  if (originalTokens.length > 2) {
    for (let i = 0; i < originalTokens.length; i++) {
      const token = originalTokens[i].toLowerCase();
      if (NAME_STOPWORDS.has(token)) {
        const copy = [...originalTokens];
        copy.splice(i, 1);
        stopwordVariants.push(copy.join(' '));
      }
    }
  }

  // Gera variantes adicionais com substituições de grafia comuns para nomes estrangeiros/compostos (ex: 'ck' -> 'k', 'y' -> 'i')
  const typoVariants: string[] = [];
  const applyCommonTypos = (s: string) => {
    let changed = s.toLowerCase();
    // Ex: "ERICK" -> "ERIK"
    if (changed.includes('ck')) changed = changed.replace(/ck/g, 'k');
    // Ex: "ELVIS" (sem substituição comum necessária aqui, mas cobrindo outras)
    if (changed.includes('y')) changed = changed.replace(/y/g, 'i');
    if (changed.includes('ph')) changed = changed.replace(/ph/g, 'f');
    // Remove letras dobradas não comuns em português (ex: "ll" -> "l", "nn" -> "n")
    changed = changed.replace(/([^r])\1/g, '$1'); 
    return changed.toUpperCase();
  };

  const originalTypo = applyCommonTypos(original);
  if (originalTypo !== original.toUpperCase()) {
    typoVariants.push(originalTypo);
    // Também gera sem as stopwords
    const typoTokens = originalTypo.split(/\s+/).filter(t => !NAME_STOPWORDS.has(t.toLowerCase()));
    typoVariants.push(typoTokens.join(' '));
  }

  // A ordem de busca do Medical prioriza sempre nomes completos ou nomes quase-completos
  // (com remoções de stopwords de ligação ou correções fonéticas) antes de tentar variantes genéricas e curtas (como primeiro e último nome).
  const variants = [
    original, 
    normalized, 
    cleanName, 
    ...stopwordVariants,
    ...typoVariants,
    firstLast, 
    firstTwo
  ];

  const finalVariants = variants
    .map((item) => collapseSpaces(item))
    .filter((item) => item.length > 0);

  return [...new Set(finalVariants)];
}

/**
 * Alias para buildMedicalSearchVariants com fallback conservador adicional.
 * Centraliza toda a lógica de variantes (stopwords + fonética) em um único lugar,
 * garantindo que o scraper automático use exatamente o mesmo conjunto de variantes
 * que o scraper manual/testes.
 */
export function buildMedicalNameSearchVariants(name: string): string[] {
  // Delega para a função completa que inclui remoção de stopwords e substituições fonéticas
  const full = buildMedicalSearchVariants(name);

  // Adiciona fallback conservador (primeiro + último token) para nomes de 2-3 palavras
  // caso não esteja já presente no conjunto completo
  const tokens = splitNameTokens(name || '');
  const conservativeFallback =
    tokens.length >= 2 && tokens.length <= 3
      ? collapseSpaces(`${tokens[0]} ${tokens[tokens.length - 1]}`)
      : '';

  if (conservativeFallback) {
    return [...new Set([...full, conservativeFallback])];
  }
  return full;
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function fuzzyMatchesByNameTokens(candidate: string, query: string, maxTokenDistance = 2): boolean {
  const candidateNorm = normalizePersonName(candidate);
  const queryTokens = splitNameTokens(query);

  if (queryTokens.length === 0) return false;
  const candidateTokens = splitNameTokens(candidate);

  return queryTokens.every(qToken => {
    if (candidateNorm.includes(qToken)) return true;
    for (const cToken of candidateTokens) {
       if (Math.abs(cToken.length - qToken.length) > maxTokenDistance) continue;
       const dist = levenshteinDistance(qToken, cToken);
       if (dist <= maxTokenDistance) {
         if (qToken.length <= 3 && dist > 0) continue;
         if (qToken.length <= 5 && dist > 1) continue;
         return true;
       }
    }
    return false;
  });
}

export function fuzzyTokenMatchInText(token: string, textTokens: string[], maxTokenDistance = 2): boolean {
  if (textTokens.includes(token)) return true;
  for (const tToken of textTokens) {
    if (Math.abs(tToken.length - token.length) > maxTokenDistance) continue;
    const dist = levenshteinDistance(token, tToken);
    if (dist <= maxTokenDistance) {
      if (token.length <= 3 && dist > 0) continue;
      if (token.length <= 5 && dist > 1) continue;
      return true;
    }
  }
  return false;
}
