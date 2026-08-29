"use client";

import { useState, useEffect, useCallback } from "react";
import { NEST_URL } from "@/config/constants";

export interface User {
  codigo: string;
  cpf: string;
  nome: string;
  email?: string;
  telefone?: string;
  perfil: string;
  conselho?: string;
  uf_conselho?: string;
  registro_conselho?: string;
  ativo: boolean;
  ultimo_login?: string;
  criado_em?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${NEST_URL}users`);
      if (!res.ok) throw new Error("Falha ao buscar usuários");
      const data: User[] = await res.json();
      setUsers(data);
    } catch {
      console.warn("API de usuários indisponível");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}
