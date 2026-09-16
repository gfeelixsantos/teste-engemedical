'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ConvocacaoExame } from '../types';
import {
  getExamStatusRowHoverClass,
  getExamStatusTextClass,
} from '../../../../components/shared/dashboardStatusColors';

export function DrilldownTable({ data }: { data: ConvocacaoExame[] }) {
  const formatDateStr = (dStr: string | null) => {
    if (!dStr) return '';
    const date = new Date(dStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
  };

  const renderStatusBadge = (situacao: string) => {
    const statusClass = getExamStatusTextClass(situacao);

    switch (situacao) {
      case 'Em Dia':
        return (
          <div className={`flex items-center gap-1.5 font-semibold ${statusClass}`}>
            <span>Em Dia</span>
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${statusClass}`} />
          </div>
        );
      case 'A Vencer':
        return (
          <div className={`flex items-center gap-1.5 font-semibold ${statusClass}`}>
            <span>A Vencer</span>
            <AlertTriangle className={`h-4 w-4 shrink-0 ${statusClass}`} />
          </div>
        );
      case 'Vencido':
      case 'Nunca Realizado':
      case 'Sem Data de Resultado':
      default:
        return (
          <div className={`flex items-center gap-1.5 font-semibold ${statusClass}`}>
            <span>{situacao}</span>
            <XCircle className={`h-4 w-4 shrink-0 ${statusClass}`} />
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
        <thead className="bg-brand-700 text-white font-semibold border-b border-brand-800 uppercase text-[11px]">
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
              className={`cursor-pointer transition-colors ${getExamStatusRowHoverClass(row.situacaoExame)}`}
            >
              <td className="px-3 py-2 font-medium text-gray-900 max-w-[150px] truncate">
                {row.nomeEmpresa}
              </td>
              <td className="px-3 py-2 max-w-[140px] truncate">{row.unidade}</td>
              <td className="px-3 py-2 max-w-[120px] truncate">{row.setor}</td>
              <td className="px-3 py-2 max-w-[140px] truncate">{row.cargo}</td>
              <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">
                {row.nomeFuncionario}
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
