import {
  Building,
  Building2,
  FileSignature,
  FlaskConical,
  Handshake,
  Radiation,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "assinatura-digital", label: "Assinatura Digital", icon: FileSignature },
  { id: "auditoria", label: "Auditoria", icon: ShieldCheck, requiredPerfil: "MASTER" },
  { id: "empresas", label: "Empresas", icon: Building, requiredPerfil: "MASTER" },
  { id: "exames", label: "Exames", icon: FlaskConical },
  { id: "orientacoes-parecer", label: "Orientações de Parecer", icon: Stethoscope, requiredPerfil: "MASTER" },
  { id: "prestadores", label: "Prestadores", icon: Handshake, requiredPerfil: "MASTER" },
  { id: "usuarios", label: "Profissionais", icon: Users },
  { id: "riscos", label: "Riscos", icon: Radiation, requiredPerfil: "MASTER" },
  { id: "unidades", label: "Unidades", icon: Building2, requiredPerfil: "MASTER" },
  { id: "usuario", label: "Usuário", icon: User },
];

export function getVisibleSettingsItems(userPerfil) {
  return NAV_ITEMS.filter(
    (item) => !item.requiredPerfil || item.requiredPerfil === userPerfil,
  );
}
