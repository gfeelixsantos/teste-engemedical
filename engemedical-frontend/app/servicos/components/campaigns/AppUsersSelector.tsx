"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Input, Checkbox, RadioGroup, Radio, Chip, Spinner, Button } from "@heroui/react";
import { campaignsClient } from "@/lib/campaigns/campaigns-client";
import { Users, Search, CheckCircle2, UserCheck, ShieldCheck } from "lucide-react";

interface AppUsersSelectorProps {
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
}

export function AppUsersSelector({ selectedUserIds, onChange }: AppUsersSelectorProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"all" | "selected">(
    selectedUserIds.length === 0 ? "all" : "selected"
  );

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await campaignsClient.getAppUsers();
      // Filtrar apenas usuários com e-mail cadastrado
      const validUsers = (data || []).filter((u: any) => u.email && u.email.trim().length > 0);
      setUsers(validUsers);
    } catch (err) {
      console.error("Erro ao carregar usuários da aplicação:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.nome?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.perfil?.toLowerCase().includes(q) ||
        u.codigo?.toString().includes(q)
    );
  }, [users, search]);

  const toggleUser = (codigo: string) => {
    const codeStr = String(codigo);
    if (selectedUserIds.includes(codeStr)) {
      onChange(selectedUserIds.filter((id) => id !== codeStr));
    } else {
      onChange([...selectedUserIds, codeStr]);
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredCodes = filteredUsers.map((u) => String(u.codigo));
    const merged = Array.from(new Set([...selectedUserIds, ...allFilteredCodes]));
    onChange(merged);
  };

  const handleClearSelection = () => {
    onChange([]);
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as "all" | "selected");
    if (newMode === "all") {
      onChange([]); // Array vazio indica enviar para todos os usuários
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-default-200 bg-default-50/60 p-4 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Usuários da Aplicação (Supabase)</h4>
            <p className="text-xs text-default-500">
              Disparo para a equipe de operadores, médicos e administradores cadastrados
            </p>
          </div>
        </div>

        <Chip size="sm" variant="flat" color="success" className="font-semibold">
          {users.length} Usuários com E-mail
        </Chip>
      </div>

      <RadioGroup
        value={mode}
        onValueChange={handleModeChange}
        orientation="horizontal"
        className="gap-6"
      >
        <Radio value="all">
          <span className="text-xs font-semibold">Todos os Usuários Ativos ({users.length})</span>
        </Radio>
        <Radio value="selected">
          <span className="text-xs font-semibold">Selecionar Usuários Específicos</span>
        </Radio>
      </RadioGroup>

      {mode === "selected" && (
        <div className="flex flex-col gap-3 border-t border-default-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              size="sm"
              placeholder="Pesquisar por nome, e-mail ou perfil..."
              value={search}
              onValueChange={setSearch}
              startContent={<Search className="h-3.5 w-3.5 text-default-400" />}
              className="max-w-xs"
            />

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                color="primary"
                onPress={handleSelectAllFiltered}
              >
                Selecionar Todos ({filteredUsers.length})
              </Button>
              {selectedUserIds.length > 0 && (
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  onPress={handleClearSelection}
                >
                  Limpar ({selectedUserIds.length})
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner size="sm" color="success" label="Carregando usuários do Supabase..." />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-default-200 bg-white p-2 flex flex-col gap-1 scrollbar-thin">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-default-400">
                  Nenhum usuário encontrado.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(String(u.codigo));
                  return (
                    <div
                      key={u.codigo}
                      onClick={() => toggleUser(String(u.codigo))}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : "hover:bg-default-100 text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          isSelected={isSelected}
                          onValueChange={() => toggleUser(String(u.codigo))}
                          color="success"
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{u.nome}</span>
                            <Chip size="sm" variant="flat" color="default" className="text-[10px] h-4">
                              {u.perfil || "OPERADOR"}
                            </Chip>
                          </div>
                          <span className="text-[11px] font-mono text-default-500">{u.email}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-default-400">
                        #{u.codigo}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
