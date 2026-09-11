'use client';

import { useState } from 'react';
import type { RegistroVida } from '../types';

interface Props {
  data?: RegistroVida[];
}

const PAGE_SIZE = 20;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function RegistrosTable({ data }: Props) {
  const [page, setPage] = useState(0);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Registros de Faturamento</h3>
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-50 rounded animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Registros de Faturamento ({data.length} registros)
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Anterior
          </button>
          <span>Página {page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-600">Empresa</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Unidade</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Produto</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Vidas</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Valor/Vida</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Mes</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 max-w-[200px] truncate" title={r.empresa}>{r.empresa}</td>
                <td className="px-3 py-2 max-w-[150px] truncate" title={r.unidade}>{r.unidade}</td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={r.produto}>{r.produto}</td>
                <td className="px-3 py-2 text-right font-medium">{r.qtdVidas.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(r.valorVida)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.valorTotal)}</td>
                <td className="px-3 py-2">{r.mesCobranca}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
