/**
 * Lista de campos proibidos pela LGPD (case-insensitive).
 * Nenhum desses campos pode ser persistido em `user_activity_logs`.
 */
const FORBIDDEN_FIELDS = new Set([
  'cpf',
  'rg',
  'documento',
  'template',
  'templatebase64',
  'templateencrypted',
  'templateencryption',
  'authtag',
  'iv',
  'key',
  'secret',
  'password',
  'senha',
  'token',
  'imagembase64',
  'imagemderivadabase64',
  'raw',
  'payload',
  'formulario',
  'parecer',
  'parecermedico',
  'recomendacaomedica',
  'score',
  'threshold',
  'templatehash',
  'digitaldocumentalhash',
  'laudo',
  'pdf',
  'base64',
]);

/**
 * Verifica se um nome de campo é proibido (case-insensitive).
 */
function isForbiddenField(fieldName: string): boolean {
  return FORBIDDEN_FIELDS.has(fieldName.toLowerCase());
}

/**
 * Sanitiza recursivamente um valor, removendo campos proibidos de objetos.
 *
 * @param input - Valor a ser sanitizado (qualquer tipo)
 * @param visited - Set de objetos já visitados para detecção de referências circulares
 * @returns Valor sanitizado (novo objeto/array clonado, ou primitivo original)
 */
function sanitizeValue(input: unknown, visited: Set<object>): unknown {
  // Primitivos: retornar sem modificação
  if (
    input === null ||
    input === undefined ||
    typeof input === 'string' ||
    typeof input === 'number' ||
    typeof input === 'boolean'
  ) {
    return input;
  }

  // Arrays: aplicar recursão em cada elemento, preservando estrutura e ordem
  if (Array.isArray(input)) {
    return input.map((element) => sanitizeValue(element, visited));
  }

  // Objetos: remover campos proibidos e aplicar recursão nos valores restantes
  if (typeof input === 'object') {
    // Detecção de referência circular
    if (visited.has(input as object)) {
      return {};
    }

    visited.add(input as object);

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (!isForbiddenField(key)) {
        result[key] = sanitizeValue(value, visited);
      }
    }

    visited.delete(input as object);

    return result;
  }

  // Qualquer outro tipo (Function, Symbol, etc.): retornar sem modificação
  return input;
}

/**
 * Sanitiza um objeto removendo recursivamente todos os campos proibidos pela LGPD.
 *
 * Comportamento:
 * - Primitivos (`string`, `number`, `boolean`, `null`, `undefined`) → retornados sem modificação
 * - Arrays → recursão em cada elemento, estrutura e ordem preservadas
 * - Objetos → campos proibidos removidos (case-insensitive), recursão nos valores restantes
 * - Referências circulares → detectadas via `Set`; recursão interrompida naquele ramo retornando `{}`
 * - Imutabilidade → objeto original nunca modificado; retorna novo objeto profundamente clonado
 *
 * @param input - Valor a ser sanitizado
 * @returns Objeto sanitizado, ou o valor primitivo original, ou `null`/`undefined`
 */
export function sanitizeAuditDetails(
  input: unknown,
): Record<string, unknown> | null {
  const visited = new Set<object>();
  return sanitizeValue(input, visited) as Record<string, unknown> | null;
}
