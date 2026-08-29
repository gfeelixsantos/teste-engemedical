import { AsoProcessingMessage } from "../../../web/types";

const WSSecurity = require('wssecurity-soap');

// utilitário de delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function WsUploadArquivoProntuario(
  certificate: AsoProcessingMessage,
  documentName: string,
  arquivo: Buffer,
  options?: {
    maxTentativas?: number;
    delayMs?: number;
  }
): Promise<void> {

  const MAX_TENTATIVAS = options?.maxTentativas ?? 3;
  const DELAY_MS = options?.delayMs ?? 8000;

  const user = process.env.SOCWS_USUARIO;
  const pass = process.env.SOCWS_PASS;
  const codPrincipal = process.env.SOCWS_EMPRESA_PRINCIPAL;
  const codResponsavel = process.env.SOCWS_RESPONSAVEL;
  const codUsuario = process.env.SOCWS_CODUSUARIO;

  const { codEmpresa, codFuncionario, nomeFuncionario, tipoExame, dataFicha, sequencial } = certificate;
  const gedName = `ASO - ${nomeFuncionario} - ${tipoExame} ${dataFicha}`;

  const URL = 'https://ws1.soc.com.br/WSSoc/services/UploadArquivosWs';
  const SOBREESCREVER = true;
  // const CODIGO_ASO_DIGITAL = '41';
  const CODIGO_SOCGED_ASODIGITAL = '41';
  const CODIGO_CLASSIFICACAO_SOCGED = 'ASO';
  const NOME_TIPO_GED = 'ASO - ATESTADO DE SAÚDE OCUPACIONAL DIGITAL';
  const OBSERVACAOGED = `Upload realizado via servidor CMSO em ${new Date().toLocaleString('pt-BR')}`;

  /* =======================
     VALIDAÇÕES
  ======================= */

  if (!arquivo || !Buffer.isBuffer(arquivo)) {
    throw new Error('Anexo não enviado ou inválido (Buffer)');
  }

  const MAX_SIZE = 10_485_760;
  if (arquivo.length > MAX_SIZE) {
    throw new Error('Arquivo excede o tamanho máximo permitido (10MB)');
  }

  if (!sequencial || isNaN(Number(sequencial)) || Number(sequencial) <= 0) {
    throw new Error('codigoSequencialFicha inválido ou não informado');
  }

  if (OBSERVACAOGED.length > 3400) {
    throw new Error('Campo observacao excede 3400 caracteres');
  }

  const header = new WSSecurity(user, pass, 'PasswordDigest');

  /* =======================
     RETRY CONTROLADO
  ======================= */

  let lastError: unknown;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      console.log(`[WS Upload arquivo] Tentativa ${tentativa}/${MAX_TENTATIVAS}`);

      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const contentId = `attachment_${Date.now()}@soc.com.br`;

      const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://services.soc.age.com/"
                  xmlns:xop="http://www.w3.org/2004/08/xop/include">
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
        <codigoEmpresa>${codEmpresa}</codigoEmpresa>
        <codigoFuncionario>${codFuncionario}</codigoFuncionario>
        <codigoGed></codigoGed>
        <codigoSequencialFicha>${sequencial}</codigoSequencialFicha>
        <codigoTipoGed>${CODIGO_SOCGED_ASODIGITAL}</codigoTipoGed>
        <extensaoArquivo>PDF</extensaoArquivo>
        <identificacaoVo>
          <chaveAcesso>${pass}</chaveAcesso>
          <codigoEmpresaPrincipal>${codPrincipal}</codigoEmpresaPrincipal>
          <codigoResponsavel>${codResponsavel}</codigoResponsavel>
          <codigoUsuario>${codUsuario}</codigoUsuario>
        </identificacaoVo>
        <nomeArquivo>${documentName}</nomeArquivo>
        <nomeGed>${gedName}</nomeGed>
        <nomeTipoGed></nomeTipoGed>
        <sobreescreveArquivo>${SOBREESCREVER}</sobreescreveArquivo>
        <observacao>${OBSERVACAOGED}</observacao>
      </arg0>
    </ser:uploadArquivo>
  </soapenv:Body>
</soapenv:Envelope>`.trim();

      const parts: Buffer[] = [];

      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Type: application/xop+xml; charset=UTF-8; type="text/xml"\r\n` +
        `Content-Transfer-Encoding: 8bit\r\n` +
        `Content-ID: <root.message@soc.com.br>\r\n\r\n` +
        soapEnvelope +
        `\r\n`
      ));

      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Type: application/pdf\r\n` +
        `Content-Transfer-Encoding: binary\r\n` +
        `Content-ID: <${contentId}>\r\n\r\n`
      ));

      parts.push(arquivo);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

      const body = Buffer.concat(parts);

      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; type="application/xop+xml"; boundary="${boundary}"; start="<root.message@soc.com.br>"; start-info="text/xml"`,
          SOAPAction: '""',
        },
        body,
      });

      const textResponse = await response.text();
      console.log('[WS Upload arquivo] response wsupload arquivo', textResponse);

      if (textResponse.includes('soap:Fault') || textResponse.includes('faultstring')) {
        throw new Error(`Erro SOAP: ${textResponse}`);
      }

      console.log('[WS Upload arquivo] Upload realizado com sucesso');
      return; // sucesso → sai da função

    } catch (error) {
      lastError = error;
      console.error(`[WS Upload arquivo] Falha na tentativa ${tentativa}:`, error);

      if (tentativa < MAX_TENTATIVAS) {
        console.log(`[WS Upload arquivo] Aguardando ${DELAY_MS}ms para nova tentativa...`);
        await sleep(DELAY_MS);
      }
    }
  }

  throw new Error(
    `Falha no upload após ${MAX_TENTATIVAS} tentativas: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
