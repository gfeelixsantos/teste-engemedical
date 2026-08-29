import { Logger } from '@nestjs/common';
import WSSecurity from 'wssecurity-soap';

const logger = new Logger('WsResultadoExame');

export async function WsResultadoExame(
  employee: any,
  sequencialFicha: string,
  resultado: any,
): Promise<void> {
  const user = process.env.SOC_WEBSERVICE_USER;
  const pass = process.env.SOC_WEBSERVICE_PASS;
  const URL = 'https://ws1.soc.com.br/WSSoc/services/ResultadoExamesWs?wsdl';

  const header = new WSSecurity(user, pass, 'PasswordDigest');

  const referencialSequencial =
    employee.tipoexame != 1 ? 'SEQUENCIAL' : 'REFERENCIAL';

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
    <soapenv:Header>
        ${header.toXML()}
    </soapenv:Header>
    <soapenv:Body>
        <ser:resultadoExamesPorCodigoSequencial>
            <resultadoExame>
                <examesIdentificacaoPorIdWsVo>
                    <codigoIdFicha>${sequencialFicha}</codigoIdFicha>
                    <codigoIdResultadoExame>${resultado.SEQUENCIALRESULTADO}</codigoIdResultadoExame>
                </examesIdentificacaoPorIdWsVo>

                <identificacaoWsVo>
                    <chaveAcesso>${pass}</chaveAcesso>
                    <codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL}</codigoResponsavel>
                    <homologacao></homologacao>
                    <codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO}</codigoUsuario>
                </identificacaoWsVo>

                <resultadoExamesDadosWsVo>
                    <alteraFichaClinica>true</alteraFichaClinica>
                    <codigoExame>${resultado.CODIGOEXAME}</codigoExame>
                    <codigoExaminador></codigoExaminador>
                    <codigoExaminador2></codigoExaminador2>
                    <codigoPrestador></codigoPrestador>
                    <comentario></comentario>
                    <criaExame></criaExame>
                    <criaFichaClinica></criaFichaClinica>
                    <dataResultadoExame>${employee.dataagendamento}</dataResultadoExame>

                    <identificarExameAlteradoAutomaticamente></identificarExameAlteradoAutomaticamente>
                    <metodo></metodo>
                    <nomeExame></nomeExame>
                    <nomeExaminador3></nomeExaminador3>
                    <nomeImagem></nomeImagem>
                    <notaFiscal></notaFiscal>
                    <resultado></resultado>
                    <resultadoAlterado></resultadoAlterado>
                    <resultadoAlteradoAgravamento></resultadoAlteradoAgravamento>
                    <resultadoAlteradoEmAnalise></resultadoAlteradoEmAnalise>
                    <resultadoAlteradoOcupacional></resultadoAlteradoOcupacional>

                    <resultadoReferencialSequencial>${referencialSequencial}</resultadoReferencialSequencial>
                    <sobrepoeResultadoExistente>true</sobrepoeResultadoExistente>

                    <cnpjLaboratorio></cnpjLaboratorio>
                    <codigoExameLaboratorial></codigoExameLaboratorial>
                    <ordemExameEsocial></ordemExameEsocial>
                    <dataAgendamento>${employee.dataagendamento}</dataAgendamento>
                    <horaAgendamento>${employee.horario}</horaAgendamento>
                </resultadoExamesDadosWsVo>

                <resultadoExamesIdentificacaoFuncionarioWsVo>
                    <codigoEmpresa>${employee.codigoempresa}</codigoEmpresa>
                    <codigoFuncionario>${employee.codigo}</codigoFuncionario>
                    <dataFicha>${employee.dataagendamento}</dataFicha>
                    <tipoeExame></tipoeExame>
                </resultadoExamesIdentificacaoFuncionarioWsVo>
            </resultadoExame>
        </ser:resultadoExamesPorCodigoSequencial>
    </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
    });

    const responseText = await response.text();
    logger.debug(`Resposta: ${responseText.substring(0, 500)}`);

    if (
      responseText.includes('soap:Fault') ||
      responseText.includes('faultstring')
    ) {
      throw new Error(responseText);
    }
  } catch (error) {
    throw error;
  }
}