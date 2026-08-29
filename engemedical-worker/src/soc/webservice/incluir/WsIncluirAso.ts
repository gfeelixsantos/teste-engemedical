import { Logger } from '@nestjs/common';
import WSSecurity from 'wssecurity-soap';

const logger = new Logger('WsIncluirAso');

export async function WsIncluirAso(
  employee: any,
  sequencialFicha: string,
): Promise<void> {
  const user = process.env.SOC_WEBSERVICE_USER;
  const pass = process.env.SOC_WEBSERVICE_PASS;
  const URL = 'https://ws1.soc.com.br/WSSoc/services/ResultadoExamesWs?wsdl';

  const header = new WSSecurity(user, pass, 'PasswordDigest');

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
    <soapenv:Header>
        ${header.toXML()}
    </soapenv:Header>
    <soapenv:Body>
        <ser:incluiDadosAso>
            <aso>
                <codigoEmpresa>${employee.codigoempresa}</codigoEmpresa>
                <codigoFuncionario>${employee.codigo}</codigoFuncionario>
                <codigoPessoaEmissorAso></codigoPessoaEmissorAso>
                <codigoSequencialFichaclinica>${sequencialFicha}</codigoSequencialFichaclinica>
                ${(() => {
                  const p = (employee.parecer || '').toUpperCase().trim();
                  if (p === 'APTO_COM_RESTRICAO') return '<comentarioAso>APTO COM RESTRIÇÃO</comentarioAso>';
                  return '<comentarioAso></comentarioAso>';
                })()}
                <conselhoClasse></conselhoClasse>
                <dataEmissaoAso>${employee.dataagendamento}</dataEmissaoAso>
                <dataFicha>${employee.dataagendamento}</dataFicha>
                <especialidade></especialidade>

                <identificacaoWsVo>
                    <chaveAcesso>${pass}</chaveAcesso>
                    <codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL}</codigoEmpresaPrincipal>
                    <codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL}</codigoResponsavel>
                    <homologacao></homologacao>
                    <codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO}</codigoUsuario>
                </identificacaoWsVo>

                <imprimeAsoComExamesNaoPertencentesaFicha>true</imprimeAsoComExamesNaoPertencentesaFicha>
                <inativaFunconarioExameDemissional>true</inativaFunconarioExameDemissional>

                <medicoAsoEResponsavelPelaFicha></medicoAsoEResponsavelPelaFicha>
                <nomeMedicoEmissorAso></nomeMedicoEmissorAso>

                <parecerAso>${(employee.parecer || '').toUpperCase().trim() === 'INAPTO_TEMPORARIO' ? 'INAPTO_TEMPORARIO' : (employee.parecer || '').toUpperCase().trim() === 'INAPTO' ? 'INAPTO' : 'APTO'}</parecerAso>
                <parecerTrabalhoEmAltura>APTO</parecerTrabalhoEmAltura>
                <parecerTrabalhoEspacoConfinado>APTO</parecerTrabalhoEspacoConfinado>
                <telefoneResponsavelAso>${employee.client?.phone ?? ''}</telefoneResponsavelAso>
                <textoLivreValidade></textoLivreValidade>
                <tipoeExame>${employee.tipoexame}</tipoeExame>

                <UFConselho></UFConselho>

                <desconsideraAsoEsocial>false</desconsideraAsoEsocial>
            </aso>
        </ser:incluiDadosAso>

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