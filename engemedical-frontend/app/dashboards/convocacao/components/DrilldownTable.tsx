'use client';

import { useState } from 'react';
import type { ConvocacaoExame } from '../types';

const SITUACAO_COLORS: Record<string, string> = {
  'Em Dia': 'bg-emerald-100 text-emerald-700',
  'A Vencer': 'bg-amber-100 text-amber-700',
  Vencido: 'bg-red-100 text-red-700',
  'Nunca Realizado': 'bg-purple-100 text-purple-700',
  'Sem Data de Resultado': 'bg-gray-100 text-gray-600',
};

const PAGE_SIZE = 50;

export function DrilldownTable({ data }: { data: ConvocacaoExame[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              {[
                'Empresa',
                'Unidade',
                'Setor',
                'Cargo',
                'Funcionário',
                'Exame',
                'Vencimento',
                'Situação',
                'Dias',
              ].map((h) => (
                <th
                  key={h}
                  className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={`${row.codigoFuncionario}-${row.exame}-${i}`}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-2 py-1.5 max-w-[140px] truncate">
                  {row.nomeEmpresa}
                </td>
                <td className="px-2 py-1.5 max-w-[120px] truncate">
                  {row.unidade}
                </td>
                <td className="px-2 py-1.5 max-w-[100px] truncate">
                  {row.setor}
                </td>
                <td className="px-2 py-1.5 max-w-[120px] truncate">
                  {row.cargo}
                </td>
                <td className="px-2 py-1.5 max-w-[140px] truncate font-medium">
                  {row.nomeFuncionario}
                </td>
                <td className="px-2 py-1.5 max-w-[120px] truncate">
                  {row.exame}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {row.vencimento
                    ? new Date(row.vencimento).toLocaleDateString('pt-BR')
                    : '—'}
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      SITUACAO_COLORS[row.situacaoExame] ||
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {row.situacaoExame}
                  </span>
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">
                  {row.diasAVencerVencido}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
