// src/soc/webservice/upload/WsUploadAsoDigital.ts
import { UploadSocged } from 'src/azure/types/azure.types';

const WSSecurity = require('wssecurity-soap');

/**
 * Utilitário de delay
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Web Service para Upload de ASO DIGITAL no SOCGED
 * Baseado na implementação do PuppLiberator
 */
export async function WsUploadAsoDigital(
  payload: UploadSocged,
  options?: {
    maxTentativas?: number;
    delayMs?: number;
  },
): Promise<void> {
  const MAX_TENTATIVAS = options?.maxTentativas ?? 3;
  const DELAY_MS = options?.delayMs ?? 8000;

  // Validação: arquivo deve estar presente no momento do envio
  if (!payload.arquivo) {
    throw new Error('Arquivo não fornecido para upload (WsUploadAsoDigital)');
  }

  const user = process.env.SOC_WEBSERVICE_USER;
  const pass = process.env.SOC_WEBSERVICE_PASS;
  const codPrincipal = process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL;
  const codResponsavel = process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL;
  const codUsuario = process.env.SOC_WEBSERVICE_CODIGO_USUARIO;

  const URL = 'https://ws1.soc.com.br/WSSoc/services/UploadArquivosWs';
  const SOBREESCREVER = true;
  const CODIGO_SOCGED_ASODIGITAL = '41'; // ASO Digital
  const CODIGO_CLASSIFICACAO_SOCGED = 'ASO';
  const OBSERVACAOGED = `Upload realizado via CMSO 360 em ${new Date().toLocaleString('pt-BR')}`;

  const header = new WSSecurity(user, pass, 'PasswordDigest');

  let lastError: unknown;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const contentId = `attachment_${Date.now()}@soc.com.br`;

      const soapEnvelope = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/" xmlns:xop="http://www.w3.org/2004/08/xop/include">
    <soapenv:Header>
        ${header.toXML()}
    </soapenv:Header>
    <soapenv:Body>
        <ser:uploadArquivo>
            <arg0>
                <arquivo>
                    <xop:Include href="cid:${contentId}"/>
                </arquivo>
                <classificacao>${CODIGO_CLASSIFICACAO_SOCGED}</classificacao>
                <codigoEmpresa>${payload.codEmpresa}</codigoEmpresa>
                <codigoFuncionario>${payload.codFuncionario}</codigoFuncionario>
                <codigoGed></codigoGed>
                <codigoSequencialFicha>${payload.sequencialFicha}</codigoSequencialFicha>
                <codigoTipoGed>${CODIGO_SOCGED_ASODIGITAL}</codigoTipoGed>
                <extensaoArquivo>PDF</extensaoArquivo>
                <identificacaoVo>
                    <chaveAcesso>${pass}</chaveAcesso>
                    <codigoEmpresaPrincipal>${codPrincipal}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${codResponsavel}</codigoResponsavel>
                    <codigoUsuario>${codUsuario}</codigoUsuario>
                </identificacaoVo>
                <nomeArquivo>${payload.nomeArquivo}</nomeArquivo>
                <nomeGed>${payload.nomeGed}</nomeGed>
                <nomeTipoGed></nomeTipoGed>
                <sobreescreveArquivo>${SOBREESCREVER}</sobreescreveArquivo>
                <observacao>${OBSERVACAOGED}</observacao>
            </arg0>
        </ser:uploadArquivo>
    </soapenv:Body>
</soapenv:Envelope>`;

      const parts: Buffer[] = [];

      parts.push(
        Buffer.from(
          `--${boundary}\r\n` +
            `Content-Type: application/xop+xml; charset=UTF-8; type="text/xml"\r\n` +
            `Content-Transfer-Encoding: 8bit\r\n` +
            `Content-ID: <root.message@soc.com.br>\r\n\r\n` +
            soapEnvelope +
            '\r\n',
        ),
      );

      parts.push(
        Buffer.from(
          `--${boundary}\r\n` +
            `Content-Type: application/pdf\r\n` +
            `Content-Transfer-Encoding: binary\r\n` +
            `Content-ID: <${contentId}>\r\n\r\n`,
        ),
      );

      parts.push(payload.arquivo);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

      const body = Buffer.concat(parts);

      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; type="application/xop+xml"; boundary="${boundary}"; start="<root.message@soc.com.br>"; start-info="text/xml"`,
        },
        body,
      });

      const textResponse = await response.text();

      if (
        textResponse.includes('soap:Fault') ||
        textResponse.includes('faultstring')
      ) {
        throw new Error(textResponse);
      }

      // Sucesso
      return;
    } catch (error) {
      lastError = error;
      if (tentativa < MAX_TENTATIVAS) {
        await sleep(DELAY_MS);
      }
    }
  }

  throw new Error(
    `Falha no upload ASO Digital após ${MAX_TENTATIVAS} tentativas: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
