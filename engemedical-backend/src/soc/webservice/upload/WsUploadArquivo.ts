const WSSecurity = require('wssecurity-soap');

export async function WsUploadArquivo(
  arquivo: Buffer,
  codEmpresa: string,
  codFuncionario: string,
  sequencialFicha: string,
  nomeArquivo: string,
  nomeGed: string,
  codigoGed: string,
): Promise<void> {
  const header = new WSSecurity(
    process.env.SOC_WEBSERVICE_USER,
    process.env.SOC_WEBSERVICE_PASS,
    'PasswordDigest',
  );
  const URL = 'https://ws1.soc.com.br/WSSoc/services/UploadArquivosWs';

  const CODIGO_PRONTUARIO_MEDICO = '3';
  const SOBREESCREVER = true;
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  const OBSERVACAOGED = `Upload realizado via CMSO 360 em ${formattedDate}`;

  // Boundary único para separar as partes do MTOM
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const contentId = `attachment_${Date.now()}@soc.com.br`;

  // XML SOAP com XOP Include (referência ao anexo)
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
                <classificacao>PEDIDO_EXAME</classificacao>
                <codigoEmpresa>${codEmpresa}</codigoEmpresa>
                <codigoFuncionario>${codFuncionario}</codigoFuncionario>
                <codigoGed>${codigoGed}</codigoGed>
                <codigoSequencialFicha>${sequencialFicha}</codigoSequencialFicha>
                <codigoTipoGed>${CODIGO_PRONTUARIO_MEDICO}</codigoTipoGed>
                <extensaoArquivo>PDF</extensaoArquivo>
                <identificacaoVo>
                    <chaveAcesso>${process.env.SOC_WEBSERVICE_PASS}</chaveAcesso>
                    <codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL}</codigoResponsavel>
                    <codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO}</codigoUsuario>
                </identificacaoVo>
                <nomeArquivo>${nomeArquivo}</nomeArquivo>
                <nomeGed>${nomeGed}</nomeGed>
                <nomeTipoGed></nomeTipoGed>
                <sobreescreveArquivo>${SOBREESCREVER}</sobreescreveArquivo>
                <codigoUnidadeGed></codigoUnidadeGed>
                <dataValidadeGed></dataValidadeGed>
                <revisaoGed></revisaoGed>
                <observacao>${OBSERVACAOGED}</observacao>
            </arg0>
        </ser:uploadArquivo>
    </soapenv:Body>
</soapenv:Envelope>`;

  // Monta o corpo MTOM multipart/related
  const parts: Buffer[] = [];

  // Parte 1: SOAP Envelope
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

  // Parte 2: Anexo binário (PDF)
  parts.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Type: application/pdf\r\n` +
        `Content-Transfer-Encoding: binary\r\n` +
        `Content-ID: <${contentId}>\r\n\r\n`,
    ),
  );
  parts.push(arquivo);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  // Concatena todas as partes
  const body = Buffer.concat(parts);

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; type="application/xop+xml"; boundary="${boundary}"; start="<root.message@soc.com.br>"; start-info="text/xml"`,
        SOAPAction: '""', // Ajuste se necessário
      },
      body: body,
      signal: AbortSignal.timeout(15000),
    });

    const textResponse = await response.text();
    console.log('[WS SOC] response wsupload arquivo', textResponse);

    // Verifica se houve erro no SOAP
    if (
      textResponse.includes('soap:Fault') ||
      textResponse.includes('faultstring')
    ) {
      throw new Error(`Erro SOAP: ${textResponse}`);
    }
  } catch (error) {
    console.error('[WS SOC] Erro ao enviar arquivo:', error);
    throw new Error(
      `Falha no upload: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
