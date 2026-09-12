'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ConvocacaoExame } from '../types';

export function DrilldownTable({ data }: { data: ConvocacaoExame[] }) {
  const formatDateStr = (dStr: string | null) => {
    if (!dStr) return '';
    const date = new Date(dStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
  };

  const renderStatusBadge = (situacao: string) => {
    switch (situacao) {
      case 'Em Dia':
        return (
          <div className="flex items-center gap-1.5 text-green-700 font-semibold">
            <span>Em Dia</span>
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          </div>
        );
      case 'A Vencer':
        return (
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
            <span>A Vencer</span>
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
        );
      case 'Vencido':
      case 'Nunca Realizado':
      case 'Sem Data de Resultado':
      default:
        return (
          <div className="flex items-center gap-1.5 text-red-700 font-semibold">
            <span>{situacao}</span>
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
          </div>
        );
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        Nenhum registro encontrado com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full border border-gray-200 rounded-lg">
      <table className="w-full text-left text-xs text-gray-700 border-collapse">
        <thead className="bg-gray-50 text-gray-800 font-semibold border-b border-gray-200 uppercase text-[11px]">
          <tr>
            <th className="px-3 py-2.5">Empresa</th>
            <th className="px-3 py-2.5">Unidade</th>
            <th className="px-3 py-2.5">Setor</th>
            <th className="px-3 py-2.5">Cargo</th>
            <th className="px-3 py-2.5">Funcionários</th>
            <th className="px-3 py-2.5 text-center">Vencimento</th>
            <th className="px-3 py-2.5 text-center">Periodicidade</th>
            <th className="px-3 py-2.5">Situação</th>
            <th className="px-3 py-2.5">Exame</th>
            <th className="px-3 py-2.5">Dias a Vencer/Vencido</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, idx) => (
            <tr
              key={`${row.codigoEmpresa}-${row.codigoFuncionario}-${idx}`}
              className="hover:bg-gray-50/80 transition-colors"
            >
              <td className="px-3 py-2 font-medium text-gray-900 max-w-[150px] truncate">
                {row.nomeEmpresa}
              </td>
              <td className="px-3 py-2 max-w-[140px] truncate">{row.unidade}</td>
              <td className="px-3 py-2 max-w-[120px] truncate">{row.setor}</td>
              <td className="px-3 py-2 max-w-[140px] truncate">{row.cargo}</td>
              <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">
                {row.nomeFuncionario.startsWith('*') ? row.nomeFuncionario : `*${row.nomeFuncionario}`}
              </td>
              <td className="px-3 py-2 text-center text-gray-600">
                {formatDateStr(row.vencimento)}
              </td>
              <td className="px-3 py-2 text-center text-gray-600 font-medium">
                {row.periodicidade || 12}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {renderStatusBadge(row.situacaoExame)}
              </td>
              <td className="px-3 py-2 font-medium max-w-[200px] truncate" title={row.exame}>
                {row.exame}
              </td>
              <td className="px-3 py-2 font-medium whitespace-nowrap text-gray-600">
                {row.diasAVencerVencido}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
