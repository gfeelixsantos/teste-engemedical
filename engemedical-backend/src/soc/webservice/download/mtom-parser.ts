export interface MtomParsedResult {
  /** Corpo binário da parte application/octet-stream (arquivo) */
  binary: Buffer | null;
  /** XML SOAP do primeiro part (para validar resposta) */
  soapXml: string | null;
  /** Mensagem de erro SOC se houver */
  socMessage: string | null;
}

/**
 * Extrai o attachment binário (MTOM/XOP) de uma resposta multipart/related
 * do webservice DownloadArquivosWs da SOC.
 *
 * A resposta tem formato:
 *   --boundary
 *   Content-Type: application/xop+xml  (part SOAP, contém xop:Include href="cid:...")
 *   ...
 *   <soap:Envelope>...<bytesArquivo><xop:Include href="cid:xxx"/></bytesArquivo>...</soap:Envelope>
 *   --boundary
 *   Content-Type: application/octet-stream   <-- o arquivo (zip/pdf)
 *   Content-ID: <cid do xop:Include>
 *   <binary>
 *   --boundary--
 */
export function parseMtomResponse(buffer: Buffer, contentTypeHeader?: string): MtomParsedResult {
  const result: MtomParsedResult = {
    binary: null,
    soapXml: null,
    socMessage: null,
  };

  if (!buffer || buffer.length === 0) return result;

  // 1) Extrai o boundary do content-type, com fallback para heuristic no buffer
  let boundary = '';
  const ctMatch = contentTypeHeader?.match(/boundary="?([^";]+)"?/i);
  if (ctMatch) {
    boundary = ctMatch[1];
  } else {
    // Heurística: primeiro "--" no início do header
    const m = buffer.toString('latin1', 0, 300).match(/--([A-Za-z0-9._+-]+)/);
    if (m) boundary = m[1];
  }

  if (!boundary) return result;

  const delim = Buffer.from(`--${boundary}`);
  const delimEnd = Buffer.from(`--${boundary}--`);

  // 2) Divide em parts
  let pos = buffer.indexOf(delim);
  while (pos !== -1) {
    // Início do corpo da part: fim da linha do delim + possíveis headers
    let bodyStart = buffer.indexOf(Buffer.from('\r\n\r\n'), pos + delim.length);
    if (bodyStart === -1) bodyStart = buffer.indexOf(Buffer.from('\n\n'), pos + delim.length);
    if (bodyStart === -1) break;
    bodyStart += 2; // pular \r\n

    // Fim da part: próximo delim
    let nextDelim = buffer.indexOf(delim, bodyStart);
    if (nextDelim === -1) break;

    // Captura headers da part (antes do bodyStart)
    const headerStart = pos + delim.length;
    const headersRaw = buffer.toString('latin1', headerStart, bodyStart - 2);
    const lower = headersRaw.toLowerCase();

    const partBody = buffer.subarray(bodyStart, nextDelim);

    if (lower.includes('content-type: application/xop+xml') || lower.includes('content-type: text/xml')) {
      result.soapXml = partBody.toString('utf8');
      // Extrai mensagem de erro do SOC se houver
      const match = /<mensagem>([^<]*)<\/mensagem>/.exec(result.soapXml);
      if (match) result.socMessage = match[1].trim();
    } else if (lower.includes('application/octet-stream') || lower.includes('application/pdf') || lower.includes('application/zip')) {
      // Part binário com o arquivo
      result.binary = Buffer.from(partBody);
    }

    pos = nextDelim + delim.length;

    // Se chegamos ao delim final, paramos
    if (buffer.indexOf(delimEnd, pos - delim.length) === pos - delim.length) {
      break;
    }
  }

  // 3) Estratégia fallback: se não achou por parts, procura magic bytes direto no buffer
  if (!result.binary) {
    for (const magic of [Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('%PDF-'), Buffer.from([0x52, 0x61, 0x72, 0x21])]) {
      const magicIdx = buffer.indexOf(magic);
      if (magicIdx !== -1) {
        result.binary = Buffer.from(buffer.subarray(magicIdx));
        break;
      }
    }
  }

  return result;
}