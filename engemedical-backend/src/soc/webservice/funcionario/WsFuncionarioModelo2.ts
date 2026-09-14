import { CadastroFuncionarioPorSituacao } from '../../types/CadastroFuncionarioPorSituacao';
import {
  FuncionarioModelo2ResponseData,
  parseFuncionarioModelo2Response,
} from './funcionario-modelo2-response.parser';

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

function formatSocDate(value: string): string {
  const date = String(value || '').trim();
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return date;
}

type HierarchyLookupType = 'CODIGO_RH' | 'NOME';

type FuncionarioModelo2HierarchyReference = {
  tipoBusca: HierarchyLookupType;
  codigoRh?: string;
  codigo?: string;
  nome?: string;
  cbo?: string;
};

export type FuncionarioModelo2HierarchyUpdate = {
  atualizarCargo?: boolean;
  atualizarCentroCusto?: boolean;
  atualizarFuncionario?: boolean;
  atualizarSetor?: boolean;
  atualizarUnidade?: boolean;
  criarHistorico?: boolean;
  criarSetor?: boolean;
  criarCargo?: boolean;
  unidade?: FuncionarioModelo2HierarchyReference;
  setor?: FuncionarioModelo2HierarchyReference;
  cargo?: FuncionarioModelo2HierarchyReference;
  centroCusto?: FuncionarioModelo2HierarchyReference;
};

type WsFuncionarioModelo2Options = {
  overwriteSituacao?: string;
  lookupKey?: 'CODIGO' | 'CPF';
  auditObservation?: string;
  hierarchyUpdate?: FuncionarioModelo2HierarchyUpdate;
};

function resolveOptions(
  options?: string | WsFuncionarioModelo2Options,
): WsFuncionarioModelo2Options {
  if (typeof options === 'string') {
    return { overwriteSituacao: options };
  }
  return options || {};
}

function bool(value: boolean | undefined): string {
  return value ? 'true' : 'false';
}

function escapeXml(value: string | undefined): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlTag(name: string, value: string | undefined): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function xmlTagIfValue(name: string, value: string | undefined): string {
  const normalized = String(value || '').trim();
  return normalized ? xmlTag(name, normalized) : '';
}

function hierarchyBlock(
  tagName: string,
  reference?: FuncionarioModelo2HierarchyReference,
): string {
  if (
    !reference ||
    (!reference.codigoRh &&
      !reference.codigo &&
      !reference.nome &&
      !reference.cbo)
  ) {
    return '';
  }

  return `
            <${tagName}>
              ${xmlTag('tipoBusca', reference.tipoBusca)}
              ${xmlTagIfValue('codigoRh', reference.codigoRh)}
              ${xmlTagIfValue('codigo', reference.codigo)}
              ${xmlTagIfValue('nome', reference.nome)}
              ${tagName === 'cargoWsVo' ? xmlTagIfValue('cbo', reference.cbo) : ''}
            </${tagName}>`;
}

export async function WsFuncionarioModelo2(
  employee: CadastroFuncionarioPorSituacao,
  options?: string | WsFuncionarioModelo2Options,
): Promise<{
  status: number;
  responseText: string;
  xml: string;
  data: FuncionarioModelo2ResponseData;
}> {
  const resolvedOptions = resolveOptions(options);
  const header = new WSSecurity(
    process.env.SOC_WEBSERVICE_USER,
    process.env.SOC_WEBSERVICE_PASS,
    'PasswordDigest',
  );
  const URL = 'https://ws1.soc.com.br/WSSoc/FuncionarioModelo2Ws?wsdl';

  const cleanCpf = employee.CPF ? employee.CPF.replace(/[^\d]/g, '') : '';
  const cleanCnpj = employee.CNPJ ? employee.CNPJ.replace(/[^\d]/g, '') : '';

  const dataNascimento = formatSocDate(employee.DATA_NASCIMENTO);
  const dataAdmissao = formatSocDate(employee.DATA_ADMISSAO);
  const dataDemissao = formatSocDate(employee.DATA_DEMISSAO);
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
    resolvedOptions.overwriteSituacao || converterSituacao(employee.SITUACAO);
  const lookupKey = resolvedOptions.lookupKey || 'CODIGO';
  const auditObservation =
    resolvedOptions.auditObservation ||
    `Inativado via automação Engemedical Connect em ${new Date().toLocaleString('pt-BR')}`;
  const codigoCategoriaESocial = String(
    employee.CODCATEGORIAESOCIAL || employee.codigoCategoriaESocial || '101',
  ).trim() || '101';
  const hierarchyUpdate = resolvedOptions.hierarchyUpdate;
  const hierarchyBeforeFuncionario = hierarchyUpdate
    ? `
            <atualizarCargo>${bool(hierarchyUpdate.atualizarCargo)}</atualizarCargo>
            <atualizarCentroCusto>${bool(hierarchyUpdate.atualizarCentroCusto)}</atualizarCentroCusto>
            <atualizarFuncionario>${bool(hierarchyUpdate.atualizarFuncionario)}</atualizarFuncionario>
            <atualizarMotivoLicenca>false</atualizarMotivoLicenca>
            <atualizarSetor>${bool(hierarchyUpdate.atualizarSetor)}</atualizarSetor>
            <atualizarTurno>false</atualizarTurno>
            <atualizarUnidade>${bool(hierarchyUpdate.atualizarUnidade)}</atualizarUnidade>
            ${hierarchyBlock('cargoWsVo', hierarchyUpdate.cargo)}
            ${hierarchyBlock('centroCustoWsVo', hierarchyUpdate.centroCusto)}
            <criarCargo>${bool(hierarchyUpdate.criarCargo)}</criarCargo>
            <criarCentroCusto>false</criarCentroCusto>
            <criarFuncionario>true</criarFuncionario>
            <criarHistorico>${bool(hierarchyUpdate.criarHistorico)}</criarHistorico>
            <criarMotivoLicenca>false</criarMotivoLicenca>
            <criarSetor>${bool(hierarchyUpdate.criarSetor)}</criarSetor>
            <criarTurno>false</criarTurno>
            <criarUnidade>false</criarUnidade>
            <criarUnidadeContratante>false</criarUnidadeContratante>
            <destravarFuncionarioBloqueado>false</destravarFuncionarioBloqueado>`
    : `
            <atualizarFuncionario>true</atualizarFuncionario>
            <atualizarCargo>false</atualizarCargo>`;
  const hierarchyAfterIdentificacao = hierarchyUpdate
    ? `
            <naoImportarFuncionarioSemHierarquia>false</naoImportarFuncionarioSemHierarquia>
            ${hierarchyBlock('setorWsVo', hierarchyUpdate.setor)}
            ${hierarchyBlock('unidadeWsVo', hierarchyUpdate.unidade)}
            <transferirFuncionario>false</transferirFuncionario>`
    : '';

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
      <soapenv:Header>
        ${header.toXML()}
      </soapenv:Header>
      <soapenv:Body>
        <ser:importacaoFuncionario>
          <Funcionario>
            ${hierarchyBeforeFuncionario}
            <funcionarioWsVo>
              <categoria></categoria>
              <chaveProcuraFuncionario>${escapeXml(lookupKey)}</chaveProcuraFuncionario>
              <cnpjEmpresaFuncionario>${escapeXml(cleanCnpj)}</cnpjEmpresaFuncionario>
              <codigo>${escapeXml(employee.CODIGO)}</codigo>
              <codigoEmpresa>${escapeXml(employee.CODIGOEMPRESA)}</codigoEmpresa>
              <cpf>${escapeXml(cleanCpf)}</cpf>
              <dataAdmissao>${escapeXml(dataAdmissao)}</dataAdmissao>
              <dataDemissao>${escapeXml(dataDemissao)}</dataDemissao>
              <dataNascimento>${escapeXml(dataNascimento)}</dataNascimento>
              <descricaoAtividade></descricaoAtividade>
              <estadoCivil>SOLTEIRO</estadoCivil>
              <matricula>${escapeXml(employee.MATRICULAFUNCIONARIO || employee.MATRICULARH)}</matricula>
              <nomeFuncionario>${escapeXml((employee.NOME || '').toUpperCase().trim())}</nomeFuncionario>
              <observacaoPpp></observacaoPpp>
              <regimeTrabalho>NORMAL</regimeTrabalho>
              <rg>${escapeXml(rg)}</rg>
              <rgOrgaoEmissor>${escapeXml(rgOrgaoEmissor)}</rgOrgaoEmissor>
              <rgUf>${escapeXml(rgUf)}</rgUf>
              <sexo>${escapeXml((converterSexo(employee.SEXO) || '').toUpperCase())}</sexo>
              <situacao>${escapeXml(situacaoFinal.toUpperCase())}</situacao>
              <tipoBuscaEmpresa>CODIGO_SOC</tipoBuscaEmpresa>
              <tipoContratacao>CLT</tipoContratacao>
              <observacaoFuncionario>${escapeXml(auditObservation)}</observacaoFuncionario>
              <codigoCategoriaESocial>${escapeXml(codigoCategoriaESocial)}</codigoCategoriaESocial>
              <tipoVinculo>EMPREGATICIO</tipoVinculo>
              <tipoAdmissao>ADMISSAO</tipoAdmissao>
            </funcionarioWsVo>
            <identificacaoWsVo>
              <chaveAcesso>${escapeXml(process.env.SOC_WEBSERVICE_PASS)}</chaveAcesso>
              <codigoEmpresaPrincipal>${escapeXml(process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL)}</codigoEmpresaPrincipal>
              <codigoResponsavel>${escapeXml(process.env.SOC_WEBSERVICE_CODIGO_RESPONSAVEL)}</codigoResponsavel>
              <codigoUsuario>${escapeXml(process.env.SOC_WEBSERVICE_CODIGO_USUARIO)}</codigoUsuario>
            </identificacaoWsVo>
            ${hierarchyAfterIdentificacao}
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
      data: parseFuncionarioModelo2Response(responseText),
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}
