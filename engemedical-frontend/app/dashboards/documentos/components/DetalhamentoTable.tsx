'use client';

import { useState } from 'react';
import type { RegistroDocumento } from '../types';
import { getContractValidityRowHoverClass } from '../../../../components/shared/dashboardStatusColors';

interface Props {
  data?: RegistroDocumento[];
}

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  Vigente: 'text-green-700',
  AVencer: 'text-amber-700',
  Vencido: 'text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  Vigente: 'Vigente',
  AVencer: 'À Vencer',
  Vencido: 'Vencido',
};

export default function DetalhamentoTable({ data }: Props) {
  const [page, setPage] = useState(0);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento dos Documentos</h3>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Detalhamento dos Documentos ({data.length})</h3>
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
          <thead className="bg-brand-700 text-white">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-600">Empresa</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Unidade</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Produto</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Vencimento</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr
                key={i}
                className={`cursor-pointer border-b border-gray-100 transition-colors ${getContractValidityRowHoverClass(r.vigenciaContrato)}`}
              >
                <td className="px-3 py-2 max-w-[200px] truncate" title={r.empresa}>{r.empresa}</td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={r.unidade}>{r.unidade}</td>
                <td className="px-3 py-2 font-medium">{r.produto}</td>
                <td className="px-3 py-2">{r.dataVencimento}</td>
                <td className="px-3 py-2">
                  <span className={`font-semibold ${STATUS_COLORS[r.vigenciaContrato] || 'text-gray-700'}`}
                  >
                    {STATUS_LABELS[r.vigenciaContrato] || r.vigenciaContrato}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
