"use client";
import React from "react";

import { Ticket } from "@/lib/ticket/ticket";

interface Props {
  tickets: Ticket[];
}

const GROUPS = [
  {
    id: "preferencial",
    label: "Pref",
    color: "bg-red-500",
    textColor: "text-red-400",
  },
  {
    id: "prioridade",
    label: "Prio",
    color: "bg-blue-500",
    textColor: "text-blue-400",
  },
  {
    id: "agendados",
    label: "Agend",
    color: "bg-orange-500",
    textColor: "text-orange-400",
  },
  {
    id: "atendimento",
    label: "Geral",
    color: "bg-gray-500",
    textColor: "text-gray-400",
  },
];

const TicketGroupFloatingBar = ({ tickets }: Props) => {
  const preparacao = tickets.filter(
    (t) => t.status === "EM PREPARAÇÃO" || t.status === "ENCAMINHADO RAIO-X",
  );

  const sorted = [...tickets].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  const preferenciais = sorted.filter(
    (s) => s.preferencial && preparacao.every((p) => p.id !== s.id),
  );
  const agendados = sorted.filter(
    (s) =>
      s.prefixo === "C" &&
      !s.preferencial &&
      preparacao.every((p) => p.id !== s.id),
  );
  const comPrefixo = sorted.filter(
    (s) =>
      s.prefixo &&
      s.prefixo !== "C" &&
      !s.preferencial &&
      preparacao.every((p) => p.id !== s.id),
  );
  const normais = sorted.filter(
    (s) =>
      !s.preferencial && !s.prefixo && preparacao.every((p) => p.id !== s.id),
  );

  const counts: Record<string, number> = {
    preferencial: preferenciais.length,
    agendados: agendados.length,
    prioridade: comPrefixo.length,
    atendimento: normais.length,
  };

  const scrollToSection = (sectionId: string) => {
    const targetEl = document.getElementById(`ticket-group-${sectionId}`);

    targetEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (tickets.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 bg-foreground/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-700 px-2 py-2">
      {GROUPS.map((group) => (
        <button
          key={group.id}
          onClick={() => scrollToSection(group.id)}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          title={`Ir para ${group.label}`}
        >
          <span className="text-xs text-white font-medium">{group.label}</span>
          <span className={`text-sm font-bold ${group.id === 'agendados' ? 'text-orange-400' : group.textColor}`}>
            {counts[group.id]}
          </span>
        </button>
      ))}
    </div>
  );
};

export default TicketGroupFloatingBar;
