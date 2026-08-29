"use client";

import { useState, useEffect } from "react";
import { NEST_URL } from "@/config/constants";
import {
  UNIDADES_ATENDIMENTO,
  SALAS_EXAMES,
  SALAS_RECEPCAO,
} from "@/config/constants";

export interface Unit {
  id: string;
  nome: string;
  nome_exibicao?: string;
  ativo: boolean;
  ordem: number;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  whatsapp?: string;
  email?: string;
  horario_funcionamento?: string;
  qrcode_path?: string;
  salas: {
    recepcao: string[];
    exames: string[];
  };
}

const fallbackUnits: Unit[] = UNIDADES_ATENDIMENTO.map((nome, index) => ({
  id: nome,
  nome,
  nome_exibicao: nome.charAt(0) + nome.slice(1).toLowerCase(),
  ativo: true,
  ordem: index + 1,
  salas: { recepcao: SALAS_RECEPCAO, exames: SALAS_EXAMES },
}));

export function useUnits(admin?: boolean, enabled = true) {
  const [units, setUnits] = useState<Unit[]>(fallbackUnits);
  const [loading, setLoading] = useState(enabled);

  async function loadData() {
    if (!enabled) {
      setLoading(false);
      setUnits(fallbackUnits);
      return;
    }

    setLoading(true);
    try {
      const url = admin ? `${NEST_URL}units?admin=true` : `${NEST_URL}units`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao buscar unidades");
      const data: Unit[] = await res.json();
      setUnits(data);
    } catch {
      /* fallback já está definido no estado inicial */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setUnits(fallbackUnits);
      return;
    }

    loadData();
  }, [enabled]);

  return {
    units,
    loading,
    refetch: loadData,
    unidades: units.map((u) => u.nome),
  };
}
