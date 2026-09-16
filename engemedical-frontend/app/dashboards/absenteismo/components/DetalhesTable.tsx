'use client';

import { useState } from 'react';
import type { LicencaDetalhe } from '../types';

interface Props {
  data?: LicencaDetalhe[];
  total?: number;
  isLoading?: boolean;
}

function SkeletonTable() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-56" />
        <div className="h-9 bg-gray-200 rounded w-40" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetalhesTable({ data, total, isLoading }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 10;

  if (isLoading || !data) return <SkeletonTable />;

  const filtered = data.filter((d) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      d.empresaCodigo?.toLowerCase().includes(term) ||
      d.codigoFuncionario?.toLowerCase().includes(term) ||
      d.cid?.toLowerCase().includes(term) ||
      d.descricaoMotivo?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Detalhes dos Atestados ({total || filtered.length} registros)
        </h3>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-brand-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Empresa
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Funcionário
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                CID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dias
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Custo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.map((row) => (
              <tr key={row.codigoSequencial} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-900">
                  {row.empresaCodigo}
                </td>
                <td className="px-4 py-3 text-xs text-gray-900">
                  {row.codigoFuncionario}
                </td>
                <td className="px-4 py-3 text-xs text-gray-900">{row.cid}</td>
                <td className="px-4 py-3 text-xs text-gray-900">
                  {row.diasPerdidos}
                </td>
                <td className="px-4 py-3 text-xs text-gray-900">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(row.custoTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
