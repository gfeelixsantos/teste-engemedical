import { ICadastroPessoas } from "../interfaces/ICadastroPessoas";

const SOC_EXPORT_DATA_BASE_URL =
  process.env.SOC_EXPORT_DATA_BASE_URL ||
  "https://ws1.soc.com.br/WebSoc/exportadados";
const SOC_WEBSERVICE_EMPRESA_PRINCIPAL =
  process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL;
const SOC_ED_CADASTRO_PESSOAS_CODIGO =
  process.env.SOC_ED_CADASTRO_PESSOAS_CODIGO;
const SOC_ED_CADASTRO_PESSOAS_CHAVE =
  process.env.SOC_ED_CADASTRO_PESSOAS_CHAVE;

const buildCadastroPessoasUrl = () => {
  const parametro = encodeURIComponent(JSON.stringify({
    empresa: SOC_WEBSERVICE_EMPRESA_PRINCIPAL,
    codigo: SOC_ED_CADASTRO_PESSOAS_CODIGO,
    chave: SOC_ED_CADASTRO_PESSOAS_CHAVE,
    tipoSaida: "json",
    ativo: "1",
  }));

  return `${SOC_EXPORT_DATA_BASE_URL}?parametro=${parametro}`;
};

export class SOC {
  public static async ExportaDadosCadastroPessoas() {
    const response = await fetch(buildCadastroPessoasUrl());

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const listaCadastroPessoas: ICadastroPessoas[] = JSON.parse(decoded);

      return listaCadastroPessoas;
    }

    return null;
  }
}
