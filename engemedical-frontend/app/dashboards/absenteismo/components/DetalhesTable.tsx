'use client';

import { useState } from 'react';
import type { LicencaDetalhe } from '../types';

interface Props {
  data?: LicencaDetalhe[];
  total?: number;
}

export function DetalhesTable({ data, total }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 20;

  if (!data) return null;

  const filtered = data.filter((d) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      d.codigoFuncionario?.toLowerCase().includes(term) ||
      d.cid?.toLowerCase().includes(term) ||
      d.descricaoMotivo?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-white rounded-lg shadow p-6">
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
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Codigo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Funcionario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Inicio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fim
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dias
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                CID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Motivo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Custo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.map((row) => (
              <tr key={row.codigoSequencial} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{row.codigoSequencial}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.codigoFuncionario}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.dataInicio}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.dataFim}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.diasPerdidos}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.cid}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.descricaoMotivo}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
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
            Pagina {page} de {totalPages}
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
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}