import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface ResolveFormularioParams {
  exame: string;
  funcionario: Scheduling;
  forms: {
    EXAME_FORM_MAP: Record<string, React.FC<any>>;
    KitAtendimento: React.FC<any>;
  };
  templateKey?: string | null;
}

export class AtendimentoRules {
  // -------------------------
  // Regra: Empresa KIT
  // -------------------------
  static isEmpresaKit(func: Scheduling): boolean {
    const cod = func?.CODIGOINTERNOEMPRESA?.toUpperCase() || "";

    return cod.includes("KIT");
  }

  // -------------------------
  // Seleção principal do formulário
  // -------------------------
  static resolveFormulario({
    exame,
    funcionario,
    forms,
    templateKey,
  }: ResolveFormularioParams) {
    const { EXAME_FORM_MAP, KitAtendimento } = forms;

    let Formulario = (templateKey && EXAME_FORM_MAP[templateKey]) || EXAME_FORM_MAP[exame];

    if (!funcionario) return Formulario;

    // Regra KIT
    if (this.isEmpresaKit(funcionario)) {
      return KitAtendimento;
    }

    // Regra Audiometria Riclan ---> Formulário como kit de atendimento
    if (exame === "Audiometria" && funcionario.CODIGOEMPRESA === "263126") {
      return KitAtendimento;
    }

    return Formulario;
  }
}
