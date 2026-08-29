"use client";

import { useState, useEffect } from "react";

export interface IUserInfo {
  nome: string;
  perfil: string;
  codigo: string;
  conselho?: string;
  ufconselho?: string;
}

export function useUser() {
  const [user, setUser] = useState<IUserInfo | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/auth", { credentials: "include" });

        if (response.status === 200) {
          const { user } = await response.json();

          setUser(user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        setUser(null);
      }
    }

    fetchUser();
  }, []);

  return user;
}
