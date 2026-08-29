import { LucideIcon } from "lucide-react";

export type SectionId =
  | "assinatura-digital"
  | "unidades"
  | "usuarios"
  | "exames"
  | "prestadores"
  | "usuario"
  | "auditoria"
  | "empresas"
  | "riscos"
  | "orientacoes-parecer";

export interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  /** If true, only render this item for users with the specified profile */
  requiredPerfil?: string;
}
