import { ICadastroPessoas } from "../interfaces/ICadastroPessoas";

const SOC_ED_CADASTRO_PESSOAS_URL = process.env.SOC_ED_CADASTRO_PESSOAS_URL;

export class SOC {
  public static async ExportaDadosCadastroPessoas() {
    const response = await fetch(SOC_ED_CADASTRO_PESSOAS_URL!);

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const decoded = new TextDecoder('iso-8859-1').decode(buffer);
      const listaCadastroPessoas: ICadastroPessoas[] = JSON.parse(decoded);

      return listaCadastroPessoas;
    }

    return null;
  }
}
