'use client';

import { useState } from 'react';
import type { RegistroEsocial } from '../types';

interface Props {
  registros?: RegistroEsocial[];
  total?: number;
}

const STATUS_COLORS: Record<string, string> = {
  Concluido: 'bg-green-100 text-green-700',
  Inconsistencias: 'bg-red-100 text-red-700',
  Pendente: 'bg-orange-100 text-orange-700',
  Excluido: 'bg-gray-100 text-gray-700',
  Assinado: 'bg-teal-100 text-teal-700',
};

export function TabelaRegistros({ registros, total }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 20;

  if (!registros) return null;

  const filtered = registros.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.empresa?.toLowerCase().includes(term) ||
      r.funcionario?.toLowerCase().includes(term) ||
      r.evento?.toLowerCase().includes(term) ||
      r.statusEvento?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Eventos eSocial ({total || filtered.length} registros)
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Geracao</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arquivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{row.empresa}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.funcionario}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {row.evento}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[row.statusEvento] || 'bg-gray-100'}`}>
                    {row.statusEvento}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.dataGeracao}</td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{row.nomeArquivo}</td>
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