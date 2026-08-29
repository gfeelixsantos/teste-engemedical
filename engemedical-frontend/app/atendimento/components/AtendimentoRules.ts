import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface ResolveFormularioParams {
  exame: string;
  funcionario: Scheduling;
  forms: {
    EXAME_FORM_MAP: Record<string, React.FC<any>>;
    KitAtendimento: React.FC<any>;
    FichaClinicaWhirlpool: React.FC<any>;
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
  // Regra: Admissional
  // -------------------------
  static isAdmissional(func: Scheduling): boolean {
    return func?.TIPOEXAMENOME?.toUpperCase().includes("ADM");
  }

  // -------------------------
  // Regra: RH Brasil Whirlpool
  // -------------------------
  static isRhBrasilWhirlpool(func: Scheduling): boolean {
    return (
      func.CODIGOEMPRESA === "230890" &&
      (func.NOMEUNIDADE.includes("WHIRLPOOL") ||
        func.NOMEUNIDADE.includes("WHIRPOOL"))
    );
  }

  // -------------------------
  // Regra: Whirlpool Admissional (código 238590)
  // -------------------------
  static isWhirlpoolAdmissional(func: Scheduling): boolean {
    return func.CODIGOEMPRESA === "238590";
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
    const { EXAME_FORM_MAP, KitAtendimento, FichaClinicaWhirlpool } = forms;

    let Formulario = (templateKey && EXAME_FORM_MAP[templateKey]) || EXAME_FORM_MAP[exame];

    if (!funcionario) return Formulario;

    // Regra KIT
    if (this.isEmpresaKit(funcionario)) {
      return KitAtendimento;
    }

    // Regras Whirlpool (admissional + empresa específica)
    if (
      exame === "Exame Clínico" &&
      this.isAdmissional(funcionario) &&
      (this.isRhBrasilWhirlpool(funcionario) ||
        this.isWhirlpoolAdmissional(funcionario))
    ) {
      return FichaClinicaWhirlpool;
    }

    // Regra Audiometria Riclan ---> Formulário como kit de atendimento
    if (exame === "Audiometria" && funcionario.CODIGOEMPRESA === "263126") {
      return KitAtendimento;
    }

    return Formulario;
  }
}
