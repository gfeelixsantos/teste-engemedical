"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/utils";

export type ConsentType = "TERMOS_DE_USO" | "POLITICA_PRIVACIDADE";

export interface ConsentStatus {
  tipo: ConsentType;
  versao_atual: string;
  aceito: boolean;
  aceito_em: string | null;
}

const TERMS_CONTENT: Record<ConsentType, { title: string; text: string }> = {
  TERMOS_DE_USO: {
    title: "Termos de Uso",
    text: `Ao acessar e utilizar o CMSO360, você declara estar ciente e de acordo com as seguintes condições:

1. Esta plataforma é destinada exclusivamente à gestão de saúde ocupacional (PCMSO / NR-7).
2. Você é o único responsável pela veracidade dos dados informados.
3. O acesso é pessoal e intransferível, sendo vedado o compartilhamento de credenciais.
4. O sistema registra todas as operações realizadas para fins de auditoria e compliance.
5. O uso inadequado ou fraudulento poderá resultar em bloqueio imediato do acesso.`,
  },
  POLITICA_PRIVACIDADE: {
    title: "Política de Privacidade",
    text: `Ao aceitar, você confirma que leu e compreendeu a Política de Privacidade do CMSO360, disponível em /privacidade, e está ciente sobre:

1. Quais dados pessoais e de saúde são coletados e tratados.
2. As finalidades do tratamento, incluindo obrigações legais (NR-7, CLT Art. 168).
3. O compartilhamento com sistemas SOC, Supabase, Azure e BRy para operação da plataforma.
4. Seus direitos como titular (LGPD Art. 18): acesso, correção, anonimização, exclusão.
5. O prazo de guarda legal de 20 anos para prontuários ocupacionais (CFM 1.821/2007).`,
  },
};

const STORAGE_KEY = "consentimento_completo";

export function useConsent() {
  const [statusList, setStatusList] = useState<ConsentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTipo, setPendingTipo] = useState<ConsentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const user = getCurrentUser();

  const check = useCallback(async () => {
    if (!user?.codigo) {
      setLoading(false);
      return;
    }

    const cached =
      typeof window !== "undefined" &&
      sessionStorage.getItem(STORAGE_KEY) === "true";

    if (cached) {
      setStatusList([]);
      setPendingTipo(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/consent");
      if (!res.ok) throw new Error("Falha ao verificar consentimentos");
      const data: ConsentStatus[] = await res.json();
      setStatusList(data);

      const pending = data.find((s) => !s.aceito);
      setPendingTipo(pending?.tipo ?? null);

      if (!pending) {
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    } catch (err) {
      console.warn("Erro ao verificar consentimento:", err);
      setError("Erro ao verificar consentimento. Recarregue a página.");
      setPendingTipo(null);
    } finally {
      setLoading(false);
    }
  }, [user?.codigo]);

  useEffect(() => {
    check();
  }, [check]);

  const accept = async (tipo?: ConsentType | null) => {
    const targetTipo = tipo ?? pendingTipo;
    if (!targetTipo) return;

    const status = statusList.find((s) => s.tipo === targetTipo);
    const versao = status?.versao_atual ?? "1.0";
    setError(null);

    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: targetTipo, versao, aceito: true }),
      });

      if (!res.ok) throw new Error("Falha ao registrar consentimento");

      const updated = statusList.map((s) =>
        s.tipo === targetTipo
          ? { ...s, aceito: true, aceito_em: new Date().toISOString() }
          : s,
      );

      setStatusList(updated);

      const pending = updated.find((s) => !s.aceito);
      setPendingTipo(pending?.tipo ?? null);

      if (!pending) {
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    } catch (err) {
      console.error("Erro ao aceitar termos:", err);
      setError("Não foi possível registrar sua aceitação. Verifique sua conexão e tente novamente.");
    }
  };

  const getContent = (tipo?: ConsentType) => {
    const t = tipo ?? pendingTipo;
    return t ? TERMS_CONTENT[t] : null;
  };

  return {
    statusList,
    loading,
    pendingTipo,
    needsConsent: !!pendingTipo,
    error,
    accept,
    getContent,
    refetch: check,
  };
}
