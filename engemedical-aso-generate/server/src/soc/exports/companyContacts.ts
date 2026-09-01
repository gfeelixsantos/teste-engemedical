type ContatoEmpresaDto = {
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



export async function companyContacts(empresa: string): Promise<string[] | null>
{
    const CODIGOPERFILASO = "2"
    const empresaPrincipal =
        process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL ||
        "1153506"
    const codigo =
        process.env.SOC_ED_CONTATOS_EMPRESA_CODIGO ||
        "187196"
    const chave =
        process.env.SOC_ED_CONTATOS_EMPRESA_CHAVE ||
        process.env.SOC_WEBSERVICE_PASS ||
        ""

    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro=${encodeURIComponent(JSON.stringify({empresa: empresaPrincipal, codigo, chave, tipoSaida: "json", empresaTrabalho: empresa, codigoPerfil: ""}))}`;

    try {
        const response = await fetch(url)

        const responseBuff = await response.arrayBuffer()
        const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff)
        const jsonDecoded: ContatoEmpresaDto[] = await JSON.parse(responseDecode)

        if(jsonDecoded && jsonDecoded.length > 0){
            const perfilAso = jsonDecoded.filter(contact => contact.codigoPerfil === CODIGOPERFILASO)

            if(perfilAso.length > 0){
                return perfilAso.map(p => p.primeiroEmail)
            }
            return jsonDecoded.map(p => p.primeiroEmail)
        }

        return null

    } catch (error) {
        return null
        // Comentado para não disparar erro e parar o upload socged
        // throw new Error(`Erro ao buscar contato da empresa ${error}`)
    }
}
