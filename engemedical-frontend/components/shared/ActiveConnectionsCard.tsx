"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  SelectItem,
  Chip,
  Button,
  Badge,
  Spinner,
  addToast,
} from "@heroui/react";
import {
  Users,
  Search,
  Video,
  Wifi,
  Clock,
  RefreshCw,
  Building2,
  Stethoscope,
  UserCheck,
  Activity,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { useSocket } from "@/lib/websocket/hooks/useSocket";
import { EventType, UserPresencePayload } from "@/lib/websocket/events/events";
import { getCurrentUser } from "@/lib/utils";
import { WebsocketType } from "@/lib/websocket/enums/websocket.enum";

function formatDuration(conectadoEmIso: string): string {
  if (!conectadoEmIso) return "há pouco";
  const diffMs = Date.now() - new Date(conectadoEmIso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `há ${hours}h ${mins % 60}m`;
}

function getTypeBadge(type: string) {
  switch (type) {
    case "USER_ATENDIMENTO":
      return { label: "Atendimento", color: "primary" as const, icon: Stethoscope };
    case "USER_RECEPCAO":
      return { label: "Recepção", color: "success" as const, icon: UserCheck };
    case "USER_PREPARO":
      return { label: "Preparo", color: "secondary" as const, icon: Layers };
    case "TELEATENDIMENTO":
      return { label: "Telemedicina", color: "warning" as const, icon: Video };
    default:
      return { label: type.replace("USER_", ""), color: "default" as const, icon: Activity };
  }
}

export function ActiveConnectionsCard() {
  const [user, setUser] = useState<{ nome: string; codigo: string; unidade?: string } | null>(null);
  const [presences, setPresences] = useState<UserPresencePayload[]>([]);
  const [selectedUnidade, setSelectedUnidade] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { socket, connect, registerHandlers } = useSocket({ showLifecycleToasts: false });

  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      setUser(u);
      connect({
        type: WebsocketType.GED_BATCH,
        nome: u.nome,
        id: u.codigo,
      });
    }
  }, [connect]);

  const [copiedSocketId, setCopiedSocketId] = useState<string | null>(null);

  const handleCopyInvite = (url?: string, socketId?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    if (socketId) {
      setCopiedSocketId(socketId);
      setTimeout(() => setCopiedSocketId(null), 2500);
    }
    addToast({
      title: "Convite Copiado!",
      description: "A URL do teleatendimento foi copiada para a área de transferência.",
      severity: "success",
      color: "foreground",
      variant: "flat",
    });
  };

  const handlePresenceUpdated = useCallback((payload: UserPresencePayload[]) => {
    if (Array.isArray(payload)) {
      setPresences(payload);
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const unsub = registerHandlers({
      [EventType.PRESENCE_UPDATED]: handlePresenceUpdated as never,
    });

    // Solicita estado inicial
    socket.emit(EventType.PRESENCE_REQUEST);

    return unsub;
  }, [socket, registerHandlers, handlePresenceUpdated]);

  const handleManualRefresh = () => {
    if (!socket) return;
    setIsRefreshing(true);
    socket.emit(EventType.PRESENCE_REQUEST);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  // Lista de unidades únicas presentes nos dados
  const unidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    presences.forEach((p) => {
      if (p.unidade) set.add(p.unidade.toUpperCase());
    });
    return Array.from(set).sort();
  }, [presences]);

  // Desduplicação inteligente por Usuário + Unidade
  const uniquePresences = useMemo(() => {
    const map = new Map<string, UserPresencePayload>();
    presences.forEach((p) => {
      // Ignora conexões puras de Teleatendimento na lista principal
      if (p.type === "TELEATENDIMENTO") return;

      const key = `${p.nome?.toLowerCase()}_${p.unidade?.toUpperCase()}`;
      if (!map.has(key)) {
        map.set(key, { ...p });
      } else {
        const existing = map.get(key)!;
        existing.isTeleatendimentoActive = existing.isTeleatendimentoActive || p.isTeleatendimentoActive;
        if (p.inviteUrl) existing.inviteUrl = p.inviteUrl;
        if (p.sala && !existing.sala) existing.sala = p.sala;
      }
    });
    return Array.from(map.values());
  }, [presences]);

  // Filtragem
  const filteredPresences = useMemo(() => {
    return uniquePresences.filter((p) => {
      const matchUnidade =
        selectedUnidade === "ALL" || p.unidade?.toUpperCase() === selectedUnidade;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nome?.toLowerCase().includes(q) ||
        p.sala?.toLowerCase().includes(q) ||
        p.unidade?.toLowerCase().includes(q) ||
        p.type?.toLowerCase().includes(q);

      return matchUnidade && matchSearch;
    });
  }, [uniquePresences, selectedUnidade, searchQuery]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = presences.length;
    const atendimento = presences.filter((p) => p.type === "USER_ATENDIMENTO").length;
    const recepcao = presences.filter((p) => p.type === "USER_RECEPCAO").length;
    const emVideo = presences.filter((p) => p.isTeleatendimentoActive).length;
    return { total, atendimento, recepcao, emVideo };
  }, [presences]);

  return (
    <Card className="w-full border border-gray-200/80 shadow-md backdrop-blur-md transition-all">
      <CardHeader className="flex flex-col gap-4 border-b border-gray-100 bg-linear-to-r from-gray-50/80 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100/50 shadow-2xs">
            <Wifi className="h-6 w-6 animate-pulse text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Conexões Ativas</h2>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-ping" />
            </div>
            <p className="text-xs text-gray-500">
              Usuários e estações operacionais conectados em tempo real via WebSocket
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip
            size="sm"
            variant="flat"
            color="success"
            startContent={<Users className="h-3.5 w-3.5" />}
            className="font-semibold"
          >
            {stats.total} Online
          </Chip>
          {stats.emVideo > 0 && (
            <Chip
              size="sm"
              variant="flat"
              color="warning"
              startContent={<Video className="h-3.5 w-3.5" />}
              className="font-semibold"
            >
              {stats.emVideo} Em chamada
            </Chip>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label="Atualizar lista"
            onPress={handleManualRefresh}
            className="text-gray-500 hover:text-gray-900"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary-500" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardBody className="p-6">
        {/* Controles de Filtro */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Input
              size="sm"
              placeholder="Buscar por nome, sala ou setor..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="h-4 w-4 text-gray-400" />}
              isClearable
              onClear={() => setSearchQuery("")}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 shrink-0 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> Unidade:
            </span>
            <Select
              size="sm"
              className="w-48"
              selectedKeys={[selectedUnidade]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                if (selected) setSelectedUnidade(selected);
              }}
              aria-label="Filtrar por unidade"
            >
              {[
                { key: "ALL", label: "Todas as Unidades" },
                ...unidadesDisponiveis.map((u) => ({ key: u, label: u })),
              ].map((item) => (
                <SelectItem key={item.key}>{item.label}</SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Lista Grid de Conexões com Scroll Dedicado */}
        {filteredPresences.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 shadow-2xs">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">
              Nenhuma conexão ativa encontrada
            </h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              {searchQuery || selectedUnidade !== "ALL"
                ? "Nenhum usuário corresponde aos filtros selecionados."
                : "Quando operadores ou médicos acessarem o sistema, suas conexões aparecerão aqui em tempo real."}
            </p>
          </div>
        ) : (
          <div className="max-h-[580px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPresences.map((presence) => {
              const badgeInfo = getTypeBadge(presence.type);
              const BadgeIcon = badgeInfo.icon;

              return (
                <div
                  key={presence.socketId}
                  className="group relative flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-xs transition-all hover:border-primary-200 hover:shadow-md"
                >
                  <div>
                    {/* Top row: Avatar + Name + Tempo (canto direito) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 font-semibold text-white shadow-xs">
                          {presence.nome ? presence.nome.substring(0, 2).toUpperCase() : "??"}
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {presence.nome}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <Chip size="sm" variant="flat" color={badgeInfo.color} className="h-5 px-1.5 text-[10px] font-semibold">
                              <span className="flex items-center gap-1">
                                <BadgeIcon className="h-3 w-3" />
                                {badgeInfo.label}
                              </span>
                            </Chip>

                            {presence.isTeleatendimentoActive && (
                              <Chip size="sm" variant="flat" color="warning" className="h-5 px-1.5 text-[10px] font-bold border border-amber-300/60 bg-amber-100/80 text-amber-900">
                                <span className="flex items-center gap-1">
                                  <Video className="h-3 w-3 text-amber-600 animate-pulse" />
                                  Telemedicina
                                </span>
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tempo online no canto superior direito */}
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-gray-400">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {formatDuration(presence.conectadoEm)}
                      </span>
                    </div>

                    {/* Metadata: Sala / Unidade */}
                    <div className="mt-3.5 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-600">
                      {presence.sala && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-medium">Sala:</span>
                          <span className="font-semibold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                            {presence.sala}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">Unidade:</span>
                        <span className="font-semibold text-gray-700">{presence.unidade || "Global"}</span>
                      </div>

                      {presence.inviteUrl && (
                        <div className="mt-2 pt-1">
                          <Button
                            size="sm"
                            variant="flat"
                            color="warning"
                            className="h-7 w-full text-xs font-semibold shadow-2xs"
                            startContent={copiedSocketId === presence.socketId ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                            onPress={() => handleCopyInvite(presence.inviteUrl!, presence.socketId)}
                          >
                            {copiedSocketId === presence.socketId ? "Copiado!" : "Copiar Link do Convite"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </CardBody>
    </Card>
  );
}
