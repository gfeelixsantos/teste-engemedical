'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import type { PorEmpresaRow } from '../types';

interface Props {
  data: PorEmpresaRow[];
}

const PAGE_SIZE = 10;

export function DrilldownTable({ data }: Props) {
  const [page, setPage] = useState(1);

  const sorted = [...(data || [])].sort((a, b) => b.agendamentos - a.agendamentos);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#28B1CF]" />
          <h3 className="text-sm font-semibold text-gray-700">
            Empresas com Mais Compromissos ({sorted.length} empresas)
          </h3>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-brand-700 text-white">
            <tr className="border-b border-gray-200 bg-gray-50">
              {['#', 'Empresa', 'Agendamentos', 'Funcionários', 'Exames'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => {
              const rank = (page - 1) * PAGE_SIZE + i + 1;
              return (
                <tr key={row.nomeEmpresa} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-400">{rank}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate font-medium text-gray-800">
                    {row.nomeEmpresa}
                  </td>
                  <td className="px-3 py-2 text-[#28B1CF] font-semibold">
                    {row.agendamentos.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2">
                    {row.funcionarios.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2">
                    {row.exames.toLocaleString('pt-BR')}
                  </td>
                </tr>
              );
            })}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
