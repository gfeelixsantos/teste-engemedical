"use client";
import { useCallback, useEffect, useRef } from "react";

const DRAFT_KEY_PREFIX = "exam_draft_";
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas

type DraftPayload = {
  formulario: any;
  schedulingId: string;
  codigosExame: string[];
  savedAt: number;
};

function buildKey(schedulingId: string, codigosExame: string[]): string {
  const sortedCodes = [...codigosExame].sort().join(",");
  return `${DRAFT_KEY_PREFIX}${schedulingId}_${sortedCodes}`;
}

/**
 * Hook para persistir rascunho de formulários de exame em localStorage.
 * Garante que dados preenchidos não sejam perdidos em queda de rede.
 */
export function useExamDraft(
  schedulingId: string | null | undefined,
  codigosExame: string[],
) {
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    if (schedulingId && codigosExame.length > 0) {
      keyRef.current = buildKey(schedulingId, codigosExame);
    } else {
      keyRef.current = null;
    }
  }, [schedulingId, codigosExame]);

  /**
   * Salva o rascunho do formulário. Debounce implícito — chame a cada mudança.
   */
  const saveDraft = useCallback(
    (formulario: any) => {
      const key = keyRef.current;
      if (!key || !schedulingId) return;

      try {
        const payload: DraftPayload = {
          formulario,
          schedulingId,
          codigosExame,
          savedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch {
        // localStorage pode estar cheio ou desabilitado — ignorar silenciosamente
      }
    },
    [schedulingId, codigosExame],
  );

  /**
   * Retorna o rascunho salvo se existir e não estiver expirado.
   */
  const loadDraft = useCallback((): any | null => {
    const key = keyRef.current;
    if (!key) return null;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const payload: DraftPayload = JSON.parse(raw);

      // Verifica expiração (24h)
      if (Date.now() - payload.savedAt > DRAFT_EXPIRY_MS) {
        localStorage.removeItem(key);
        return null;
      }

      return payload.formulario ?? null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Remove o rascunho após envio bem-sucedido.
   */
  const clearDraft = useCallback(() => {
    const key = keyRef.current;
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignorar
    }
  }, []);

  return { saveDraft, loadDraft, clearDraft };
}
