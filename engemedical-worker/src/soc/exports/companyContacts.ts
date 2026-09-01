/**
 * =============================================================================
 * Company Contacts Service - Busca contatos da empresa para envio de ASO por email
 * =============================================================================
 *
 * Este serviço busca os contatos da empresa no WebService da SOC
 * para permitir o envio do ASO por email após a geração.
 *
 * Endpoint: https://ws1.soc.com.br/WebSoc/exportadados
 *
 * =============================================================================
 */

export interface CompanyContactDto {
  empresaTrabalho: string;
  codigoUnidade: string;
  tipoContato: string;
  codigoContato: string;
  nomeContato: string;
  primeiroTelefone: string;
  primeiroRamal: string;
  primeiroEmail: string;
  segundoTelefone: string;
  segundoRamal: string;
  segundoEmail: string;
  nomeUnidade: string;
  cargo: string;
  codigoPerfil: string;
  nomePerfil: string;
}

/**
 * Busca contatos de uma empresa para envio de ASO por email
 *
 * @param codEmpresa - Código da empresa no sistema SOC
 * @returns Array de emails dos contatos ou null se não encontrar
 */
export async function getCompanyContacts(
  codEmpresa: string,
): Promise<string[] | null> {
  const CODIGOPERFILASO = '2';

  // Variáveis de ambiente - mesmas usadas no asO-generate
  const empresaPrincipal =
    process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL ||
    '1153506';
  const chaveAcesso =
    process.env.SOC_ED_CONTATOS_EMPRESA_CHAVE ||
    process.env.SOC_WEBSERVICE_PASS ||
    '';

  const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(
    JSON.stringify({
      empresa: empresaPrincipal,
      codigo: '187196',
      chave: chaveAcesso,
      tipoSaida: 'json',
      empresaTrabalho: codEmpresa,
      codigoPerfil: '',
    }),
  )}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[CompanyContacts] Erro HTTP: ${response.status}`);
      return null;
    }

    const responseBuff = await response.arrayBuffer();
    const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff);

    // Validar se o retorno é um JSON válido (array ou objeto)
    if (
      !responseDecode.trim().startsWith('[') &&
      !responseDecode.trim().startsWith('{')
    ) {
      console.warn(
        `[CompanyContacts] Resposta não-JSON recebida para empresa ${codEmpresa}: ${responseDecode.substring(0, 50)}...`,
      );
      return null;
    }

    const jsonDecoded: CompanyContactDto[] = JSON.parse(responseDecode);

    if (!jsonDecoded || jsonDecoded.length === 0) {
      console.log(
        `[CompanyContacts] Nenhum contato encontrado para empresa: ${codEmpresa}`,
      );
      return null;
    }

    // Filtra pelo perfil de ASO (código 2)
    const perfilAso = jsonDecoded.filter(
      (contact) => contact.codigoPerfil === CODIGOPERFILASO,
    );

    if (perfilAso.length > 0) {
      const emails = perfilAso
        .map((p) => p.primeiroEmail)
        .filter((email) => email && email.trim() !== '');
      console.log(
        `[CompanyContacts] Encontrados ${emails.length} contato(s) com perfil ASO para empresa ${codEmpresa}`,
      );
      return emails;
    }

    // Se não tiver perfil ASO, retorna todos os emails disponíveis
    const allEmails = jsonDecoded
      .map((p) => p.primeiroEmail)
      .filter((email) => email && email.trim() !== '');

    console.log(
      `[CompanyContacts] Encontrados ${allEmails.length} contato(s) sem perfil ASO específico para empresa ${codEmpresa}`,
    );
    return allEmails;
  } catch (error) {
    console.error(
      `[CompanyContacts] Erro ao buscar contatos da empresa ${codEmpresa}:`,
      error,
    );
    return null;
  }
}
