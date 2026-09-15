"use client";

import type { ClienteFuncionarioItem } from "@/lib/cliente/funcionarios/types";

import { FuncionarioStatusBadge } from "./FuncionarioStatusBadge";

interface FuncionariosTableProps {
  items: ClienteFuncionarioItem[];
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export function FuncionariosTable({ items }: FuncionariosTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#CBE3D3] bg-white shadow-[0_12px_30px_rgba(47,125,86,0.06)]">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left">
          <caption className="sr-only">Lista de funcionários da empresa selecionada</caption>
          <thead className="bg-[#F2FAF5] text-xs uppercase tracking-[0.1em] text-[#5E7F6C]">
            <tr>
              <th className="px-5 py-3 font-semibold" scope="col">Funcionário / código</th>
              <th className="px-5 py-3 font-semibold" scope="col">Unidade / cargo</th>
              <th className="px-5 py-3 font-semibold" scope="col">Admissão / situação</th>
              <th className="px-5 py-3 font-semibold" scope="col">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3F0E7] text-sm text-[#173D2B]">
            {items.map((item) => (
              <tr key={item.codigo} className="transition hover:bg-[#F9FDFC]">
                <td className="px-5 py-4 align-top">
                  <p className="font-semibold">{item.nome}</p>
                  <p className="mt-1 text-xs text-[#6A8A78]">
                    Código {item.codigo} · Matrícula {item.matricula || "—"}
                  </p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p>{item.unidade || "—"}</p>
                  <p className="mt-1 text-xs text-[#6A8A78]">{item.cargo || "Cargo não informado"}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p>{formatDate(item.dataAdmissao)}</p>
                  <p className="mt-1 text-xs text-[#6A8A78]">{item.situacao || "Situação não informada"}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <FuncionarioStatusBadge status={item.status} statusLabel={item.statusLabel} />
                  <p className="mt-2 max-w-[220px] text-xs leading-5 text-[#6A8A78]">{item.statusReason}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
