"use client";

import { IPscAuthStatus, IUserInfoSettings } from "@/lib/user/interfaces/IUser";

export interface PscProviderStatusProps {
  pscAuthStatus: IPscAuthStatus;
  settings?: IUserInfoSettings | null;
  isLoading?: boolean;
  onClick?: () => void;
}

// Estilo igual ao Servidor na Sidebar - dot simples sem bold
const colorMap: Record<string, { dot: string; text: string }> = {
  ativa: { dot: "bg-[#104e35]", text: "text-[#104e35] font-semibold" },
  inativa: { dot: "bg-red-500", text: "text-red-600" },
  loading: { dot: "border-2 border-amber-500 border-t-transparent", text: "text-amber-600" },
};

// Função simplificada - Ativa ou Inativa
function getStatusLabel(status: IPscAuthStatus["status"]): { label: string; state: string } {
  switch (status) {
    case "ACTIVE":
      return { label: "Ativa", state: "ativa" };
    case "EXPIRED":
    case "ERROR":
    case "NOT_AUTHENTICATED":
    default:
      return { label: "Inativa", state: "inativa" };
  }
}

export function PscProviderStatus({
  pscAuthStatus,
  settings,
  isLoading = false,
  onClick,
}: PscProviderStatusProps) {
  const isBryKmsActive =
    settings?.assinaturaProvider === "BRYKMS" &&
    !!settings?.uuidCert &&
    settings?.uuidCert.trim() !== "";

  const statusInfo = isBryKmsActive
    ? { label: "Ativa", state: "ativa" }
    : getStatusLabel(pscAuthStatus.status);

  const colorStyle = isLoading
    ? colorMap.loading
    : colorMap[statusInfo.state] || colorMap.inativa;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-amber-600">Autenticando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <span className={`text-sm ${colorStyle.text}`}>{statusInfo.label}</span>
    </div>
  );
}
