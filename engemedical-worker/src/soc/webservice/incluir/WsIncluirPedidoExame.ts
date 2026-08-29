import { Logger } from '@nestjs/common';
import WSSecurity from 'wssecurity-soap';

const logger = new Logger('WsIncluirPedidoExame');

export async function WsIncluirPedidoExame(employee: any): Promise<void> {
  const user = process.env.SOC_WEBSERVICE_USER;
  const pass = process.env.SOC_WEBSERVICE_PASS;
  const URL = 'https://ws1.soc.com.br/WSSoc/services/ResultadoExamesWs?wsdl';

  const header = new WSSecurity(user, pass, 'PasswordDigest');

  function getCodigoExame(exame: any): string {
    return (exame as any).codigoExame ?? (exame as any).codigoexame ?? '';
  }

  function AddProvider(exame: any): number {
    const raioXCodes = new Set([
      '32050070', '14111', '12200', 'ex imagem', '111', '1v1v', '254477',
      '-0-', '0..', '2221111', '8998',
    ]);

    const cedillCodes = new Set([
      '2', 'XX', '28.15.001-5', '28.15.003-1', '28.15.004-0', '28.15.005-8',
      '28.15.006-6', '5555', '28010175', '28.15.009-0', '28.15.012-0', '1332',
      '1222', '00000', '28010507', '28.01.054-0', '02', '28100239',
      '28.15.030-9', '28.15.014-7', '22333', '002000', '28.01.095-7',
      '28.01.097-3', '13b', '2336', '28040350', '28011023', '28.04.048-1',
      '28040562', '28060105', '28060113', '28060067', '-', '144', '1123',
      '00022', '1125', '200', '28.15.018-0', '1', '54778844', '28030141',
      '0101', '28.13.036-7', '47788855', '28061004', '09022023', '02020',
      '1 b', '28.01.136-8', '28.01.137-6', '28011392', '28.01.141-4',
    ]);

    const codigo = getCodigoExame(exame);
    if (raioXCodes.has(codigo)) {
      return 30;
    }
    if (cedillCodes.has(codigo)) {
      return 32;
    }
    return 33; // CMSO
  }

  function AddExams(exames: any[]): string {
    let tag = '';
    exames.forEach((item) => {
      tag += `
        <exame>
            <codigo>${getCodigoExame(item)}</codigo>
            <tipoBusca>CODIGO_SOC</tipoBusca>
            <codigoPrestador>${AddProvider(item)}</codigoPrestador>
            <tipoBuscaPrestador>CODIGO_SOC</tipoBuscaPrestador>
        </exame>
      `;
    });
    return tag;
  }

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
        <soapenv:Header>
            ${header.toXML()}
        </soapenv:Header>
        <soapenv:Body>
        <ser:incluirPedidoExame>
            <PedidoExame>
                <identificacao>
                    <chaveAcesso>${pass}</chaveAcesso>
                    <codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL}</codigoResponsavel>
                    <homologacao></homologacao>
                    <codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO}</codigoUsuario>
                </identificacao>
                <tipoBuscaEmpresa>CODIGO_SOC</tipoBuscaEmpresa>
                <codigoEmpresa>${employee.codigoempresa}</codigoEmpresa>
                <tipoBuscaFuncionario>CODIGO_SOC</tipoBuscaFuncionario>
                <codigoFuncionario>${employee.codigo}</codigoFuncionario>
                <dataFicha>${employee.dataagendamento}</dataFicha>
                <tipoExame>${employee.tipoexame}</tipoExame>
                <exames>
                    ${AddExams(employee.exames)}
                </exames>
                <tipoBuscaMedico>CODIGO_SOC</tipoBuscaMedico>
                <codigoMedico></codigoMedico>
            </PedidoExame>
        </ser:incluirPedidoExame>
        </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    logger.log(`Enviando pedido para empresa ${employee.codigoempresa}`);
    logger.debug(`SOAP Request: ${xml}`);

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
    });

    const responseText = await response.text();
    logger.debug(`Resposta: ${responseText.substring(0, 500)}`);

    const numErrosMatch = responseText.match(
      /<numeroErros>(\d+)<\/numeroErros>/i,
    );
    const numErros = numErrosMatch ? parseInt(numErrosMatch[1], 10) : 0;

    if (numErros > 0) {
      const codMatch = responseText.match(/<codigo>([^<]+)<\/codigo>/);
      const msgMatch = responseText.match(/<mensagem>([^<]+)<\/mensagem>/);
      const codErro = codMatch ? codMatch[1] : 'desconhecido';
      const msgErro = msgMatch ? msgMatch[1] : 'Erro desconhecido';
      throw new Error(
        `SOC rejeitou pedido de exame: ${codErro} - ${msgErro}`,
      );
    }
  } catch (error) {
    throw error;
  }
}