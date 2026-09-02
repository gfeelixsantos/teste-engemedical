export type FuncionarioModelo2ResponseData = {
  success: boolean;
  encontrouErro: boolean;
  descricaoErro: string | null;
  atualizouFuncionario: boolean;
  incluiuFuncionario: boolean;
  codigoFuncionario: string | null;
  observacao: string | null;
  error: string | null;
};

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(
    `<(?:[a-zA-Z0-9_-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tag}>`,
    'i',
  );
  const match = xml.match(regex);
  return match ? decodeXml(match[1].trim()) : null;
}

function xmlBool(value: string | null): boolean {
  return ['true', '1', 'sim', 'yes'].includes(
    String(value || '').trim().toLowerCase(),
  );
}

export function parseFuncionarioModelo2Response(
  responseText: string,
): FuncionarioModelo2ResponseData {
  const fault = extractTag(responseText, 'faultstring');
  if (fault) {
    return {
      success: false,
      encontrouErro: true,
      descricaoErro: fault,
      atualizouFuncionario: false,
      incluiuFuncionario: false,
      codigoFuncionario: null,
      observacao: null,
      error: fault,
    };
  }

  const encontrouErro = xmlBool(extractTag(responseText, 'encontrouErro'));
  const descricaoErro = extractTag(responseText, 'descricaoErro');
  const error = encontrouErro ? descricaoErro || 'Erro funcional retornado pelo SOC' : null;

  return {
    success: !encontrouErro,
    encontrouErro,
    descricaoErro,
    atualizouFuncionario: xmlBool(
      extractTag(responseText, 'atualizouFuncionario'),
    ),
    incluiuFuncionario: xmlBool(extractTag(responseText, 'incluiuFuncionario')),
    codigoFuncionario: extractTag(responseText, 'codigoFuncionario'),
    observacao: extractTag(responseText, 'observacao'),
    error,
  };
}
