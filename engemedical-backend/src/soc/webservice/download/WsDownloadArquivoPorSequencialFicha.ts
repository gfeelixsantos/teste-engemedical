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

function buildSoapXml(
  empresa: string,
  sequencialFicha: string,
  sequencialResultado: string,
  header: any,
): string {
  return `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
<soapenv:Header>
${header.toXML()}
</soapenv:Header>
<soapenv:Body>
<ser:downloadArquivosGedPorSequencialFicha>
<downloadPorSequencialFicha>
<identificacaoWsVo>
<codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL || ''}</codigoEmpresaPrincipal>
<codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL || ''}</codigoResponsavel>
<codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO || ''}</codigoUsuario>
</identificacaoWsVo>
<codigoEmpresa>${empresa}</codigoEmpresa>
<codigoSequencialFicha>${sequencialFicha}</codigoSequencialFicha>
<codigoSequencialResultado>${sequencialResultado}</codigoSequencialResultado>
</downloadPorSequencialFicha>
</ser:downloadArquivosGedPorSequencialFicha>
</soapenv:Body>
</soapenv:Envelope>`;
}

async function doSoapCall(xml: string): Promise<SoapDownloadResult> {
  const URL = 'https://ws1.soc.com.br/WSSoc/DownloadArquivosWs?wsdl';
  const response = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: xml,
    signal: AbortSignal.timeout(60000),
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'application/octet-stream';

  // Tenta parsear MTOM (multipart/related); se não for multipart, usa buffer direto
  let binary: Buffer | null = null;
  let socMessage: string | undefined;
  if (contentType.toLowerCase().includes('multipart')) {
    const parsed = parseMtomResponse(buffer, contentType);
    binary = parsed.binary;
    socMessage = parsed.socMessage || undefined;
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
}

export async function WsDownloadArquivoPorSequencialFicha(
  empresa: string,
  sequencialFicha: string,
  sequencialResultado: string = '',
): Promise<SoapDownloadResult> {
  const user = process.env.SOC_WEBSERVICE_USER;
  const pass = process.env.SOC_WEBSERVICE_PASS;
  const header = new WSSecurity(user, pass, 'PasswordDigest');

  // 1) Primeiro tenta SEM sequencialResultado (mais abrangente — busca todos os GEDs da ficha)
  let result = await doSoapCall(
    buildSoapXml(empresa, sequencialFicha, '', header),
  );

  // 2) Se falhou por falta de arquivos, tenta COM sequencialResultado (filtra por exame)
  if (!result.success && sequencialResultado) {
    result = await doSoapCall(
      buildSoapXml(empresa, sequencialFicha, sequencialResultado, header),
    );
  }

  return result;
}