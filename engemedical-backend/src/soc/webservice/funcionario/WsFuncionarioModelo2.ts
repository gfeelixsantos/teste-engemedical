import { CadastroFuncionarioPorSituacao } from '../../types/CadastroFuncionarioPorSituacao';

const WSSecurity = require('wssecurity-soap');

function converterSexo(sexo: string) {
  if (sexo === '1') return 'MASCULINO';
  return 'FEMININO';
}

function converterSituacao(situacao: string) {
  switch (situacao) {
    case 'Ativo':
      return 'ATIVO';
    case 'Afastado':
      return 'AFASTADO';
    case 'Desligado':
      return 'INATIVO';
    case 'Admissão Preliminar':
      return 'ATIVO';
    default:
      return 'ATIVO';
  }
}

export async function WsFuncionarioModelo2(
  employee: CadastroFuncionarioPorSituacao,
  overwriteSituacao?: string,
): Promise<{ status: number; responseText: string; xml: string }> {
  const header = new WSSecurity(
    process.env.SOC_WEBSERVICE_USER,
    process.env.SOC_WEBSERVICE_PASS,
    'PasswordDigest',
  );
  const URL = 'https://ws1.soc.com.br/WSSoc/FuncionarioModelo2Ws?wsdl';

  const cleanCpf = employee.CPF ? employee.CPF.replace(/[^\d]/g, '') : '';
  const cleanCnpj = employee.CNPJ ? employee.CNPJ.replace(/[^\d]/g, '') : '';

  const dataNascimento = employee.DATA_NASCIMENTO || '';
  const dataAdmissao = employee.DATA_ADMISSAO || '';
  const dataDemissao = employee.DATA_DEMISSAO || '';
  const rg = String(employee.RG || '')
    .replace(/[^\dA-Za-z]/g, '')
    .trim();
  const rgUf = String(employee.UFRG || '')
    .trim()
    .toUpperCase();
  const rgOrgaoEmissor = String(employee.ORGAOEMISSORRG || '')
    .trim()
    .toUpperCase();

  let cbo = employee.CBOCARGO || '';
  if (cbo && cbo !== '') {
    const numCBO = cbo.split('-');
    cbo = numCBO[0].trim();
  }

  const situacaoFinal =
    overwriteSituacao || converterSituacao(employee.SITUACAO);

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
      <soapenv:Header>
        ${header.toXML()}
      </soapenv:Header>
      <soapenv:Body>
        <ser:importacaoFuncionario>
          <Funcionario>
            <atualizarFuncionario>true</atualizarFuncionario>
            <atualizarCargo>false</atualizarCargo>
            <funcionarioWsVo>
              <categoria></categoria>
              <chaveProcuraFuncionario>CODIGO</chaveProcuraFuncionario>
              <cnpjEmpresaFuncionario>${cleanCnpj}</cnpjEmpresaFuncionario>
              <codigo>${employee.CODIGO || ''}</codigo>
              <codigoEmpresa>${employee.CODIGOEMPRESA || ''}</codigoEmpresa>
              <cpf>${cleanCpf}</cpf>
              <dataAdmissao>${dataAdmissao}</dataAdmissao>
              <dataDemissao>${dataDemissao}</dataDemissao>
              <dataNascimento>${dataNascimento}</dataNascimento>
              <descricaoAtividade></descricaoAtividade>
              <estadoCivil>SOLTEIRO</estadoCivil>
              <matricula></matricula>
              <nomeFuncionario>${(employee.NOME || '').toUpperCase().trim()}</nomeFuncionario>
              <observacaoPpp></observacaoPpp>
              <regimeTrabalho>NORMAL</regimeTrabalho>
              <rg>${rg}</rg>
              <rgOrgaoEmissor>${rgOrgaoEmissor}</rgOrgaoEmissor>
              <rgUf>${rgUf}</rgUf>
              <sexo>${(converterSexo(employee.SEXO) || '').toUpperCase()}</sexo>
              <situacao>${situacaoFinal.toUpperCase()}</situacao>
              <tipoBuscaEmpresa>CODIGO_SOC</tipoBuscaEmpresa>
              <tipoContratacao>CLT</tipoContratacao>
              <observacaoFuncionario>Inativado via automação Engemedical Connect em ${new Date().toLocaleString('pt-BR')}</observacaoFuncionario>
              <codigoCategoriaESocial></codigoCategoriaESocial>
              <tipoVinculo>EMPREGATICIO</tipoVinculo>
              <tipoAdmissao>ADMISSAO</tipoAdmissao>
            </funcionarioWsVo>
            <identificacaoWsVo>
              <chaveAcesso>${process.env.SOC_WEBSERVICE_PASS}</chaveAcesso>
              <codigoEmpresaPrincipal>${process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL}</codigoEmpresaPrincipal>
              <codigoResponsavel>${process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL}</codigoResponsavel>
              <codigoUsuario>${process.env.SOC_WEBSERVICE_CODIGO_USUARIO}</codigoUsuario>
            </identificacaoWsVo>
          </Funcionario>
        </ser:importacaoFuncionario>
      </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    console.log(`[WsFuncionarioModelo2] Enviando para: ${URL}`);

    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        `[WsFuncionarioModelo2] SOAP ERROR: STATUS ${response.status}`,
      );
      console.error(`[WsFuncionarioModelo2] RESPONSE: ${responseText}`);
      throw new Error(
        `SOC WsFuncionarioModelo2 HTTP ${response.status}: ${responseText.slice(0, 300)}`,
      );
    }

    return {
      status: response.status,
      responseText,
      xml,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}
