const WSSecurity = require('wssecurity-soap');
import { parseMtomResponse } from './mtom-parser';

export interface SoapDownloadResult {
  buffer: ArrayBuffer;
  status: number;
  contentType: string;
  contentLength: number;
  archiveKind: 'zip' | 'rar' | 'pdf' | 'unknown';
  socMessage?: string;
  success: boolean;
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const RAR_MAGIC = [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];

export function inferArchiveKind(buffer: ArrayBuffer | Buffer): 'zip' | 'rar' | 'pdf' | 'unknown' {
  const arr =
    buffer instanceof Buffer ? Array.from(buffer.subarray(0, 8)) : Array.from(new Uint8Array(buffer).subarray(0, 8));

  if (arr.length >= 4) {
    if (arr[0] === ZIP_MAGIC[0] && arr[1] === ZIP_MAGIC[1] && arr[2] === ZIP_MAGIC[2] && arr[3] === ZIP_MAGIC[3]) {
      return 'zip';
    }
    if (
      arr[0] === PDF_MAGIC[0] &&
      arr[1] === PDF_MAGIC[1] &&
      arr[2] === PDF_MAGIC[2] &&
      arr[3] === PDF_MAGIC[3]
    ) {
      return 'pdf';
    }
  }

  if (
    arr.length >= 6 &&
    arr[0] === RAR_MAGIC[0] &&
    arr[1] === RAR_MAGIC[1] &&
    arr[2] === RAR_MAGIC[2] &&
    arr[3] === RAR_MAGIC[3] &&
    arr[4] === RAR_MAGIC[4] &&
    arr[5] === RAR_MAGIC[5]
  ) {
    return 'rar';
  }

  return 'unknown';
}

export async function WsDownloadArquivo(
  empresa: string,
  codigoGed: string,
): Promise<SoapDownloadResult> {
  const user = process.env.SOC_WEBSERVICE_USER;
  const pass = process.env.SOC_WEBSERVICE_PASS;
  const header = new WSSecurity(user, pass, 'PasswordDigest');
  const URL = 'https://ws1.soc.com.br/WSSoc/DownloadArquivosWs?wsdl';

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
    <soapenv:Header>
        ${header.toXML()}
    </soapenv:Header>
    <soapenv:Body>
        <ser:downloadArquivosPorGed>
            <downloadPorGed>
                <identificacaoWsVo>
                    <codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL || ''}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL || ''}</codigoResponsavel>
                    <codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO || ''}</codigoUsuario>
                </identificacaoWsVo>
                <codigoEmpresa>${empresa}</codigoEmpresa>
                <codigoGed>${codigoGed}</codigoGed>
            </downloadPorGed>
        </ser:downloadArquivosPorGed>
    </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
      signal: AbortSignal.timeout(30000),
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Tenta parsear MTOM (multipart/related)
    let binary: Buffer | null = null;
    let socMessage: string | undefined;
    
    if (contentType.toLowerCase().includes('multipart')) {
      const parsed = parseMtomResponse(buffer, contentType);
      binary = parsed.binary;
      socMessage = parsed.socMessage || undefined;
    } else {
      // Se não for multipart, talvez seja um erro retornado como XML direto
      const rawText = new TextDecoder('utf-8').decode(buffer);
      socMessage = rawText;
    }

    const resultBuffer = binary || buffer;
    const archiveKind = inferArchiveKind(resultBuffer);

    return {
      buffer: resultBuffer.buffer.slice(
        resultBuffer.byteOffset,
        resultBuffer.byteOffset + resultBuffer.byteLength,
      ) as ArrayBuffer,
      status: response.status,
      contentType,
      contentLength: resultBuffer.byteLength,
      archiveKind,
      socMessage,
      success: response.status < 400 && resultBuffer.byteLength > 0 && !socMessage?.toLowerCase().includes('erro'),
    };
  } catch (error) {
    throw error;
  }
}
