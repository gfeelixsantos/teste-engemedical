'use client';

import { useState } from 'react';
import type { MatrizAnoItem } from '../types';

interface Props {
  matriz?: {
    ano: number;
    totais: { concluido: number; inconsistencias: number; pendente: number; assinado: number; excluido: number };
    anos: MatrizAnoItem[];
  };
}

export function MatrizDrilldown({ matriz }: Props) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  if (!matriz || !matriz.anos) return null;

  const toggleYear = (ano: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(ano)) next.delete(ano);
      else next.add(ano);
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Status dos Registros por Periodo e Evento
      </h3>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Periodo</th>
              <th className="px-4 py-2 text-right">Concluido</th>
              <th className="px-4 py-2 text-right">Inconsistencias</th>
              <th className="px-4 py-2 text-right">Pendente</th>
              <th className="px-4 py-2 text-right">Assinado</th>
              <th className="px-4 py-2 text-right">Excluido</th>
            </tr>
          </thead>
          <tbody>
            {matriz.anos.map((ano) => (
              <>
                <tr key={ano.ano} className="bg-gray-50 cursor-pointer" onClick={() => toggleYear(ano.ano)}>
                  <td className="px-4 py-2 font-medium">
                    {expandedYears.has(ano.ano) ? '-' : '+'} {ano.ano}
                  </td>
                  <td className="px-4 py-2 text-right">{ano.concluido.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2 text-right">{ano.inconsistencias.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2 text-right">{ano.pendente.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2 text-right">{ano.assinado.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2 text-right">{ano.excluido.toLocaleString('pt-BR')}</td>
                </tr>
                {expandedYears.has(ano.ano) && ano.meses.map((mes) => {
                  const mesKey = `${ano.ano}-${mes.mesNum}`;
                  return (
                    <>
                      <tr key={mesKey} className="cursor-pointer hover:bg-gray-100" onClick={() => toggleMonth(mesKey)}>
                        <td className="px-4 py-2 pl-8">
                          {expandedMonths.has(mesKey) ? '-' : '+'} {mes.mes}
                        </td>
                        <td className="px-4 py-2 text-right">{mes.concluido.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2 text-right">{mes.inconsistencias.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2 text-right">{mes.pendente.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2 text-right">{mes.assinado.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2 text-right">{mes.excluido.toLocaleString('pt-BR')}</td>
                      </tr>
                      {expandedMonths.has(mesKey) && mes.eventos.map((ev) => (
                        <tr key={`${mesKey}-${ev.evento}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2 pl-16">{ev.evento}</td>
                          <td className="px-4 py-2 text-right">{ev.concluido.toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2 text-right">{ev.inconsistencias.toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2 text-right">{ev.pendente.toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2 text-right">{ev.assinado.toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2 text-right">{ev.excluido.toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right">{matriz.totais.concluido.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-2 text-right">{matriz.totais.inconsistencias.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-2 text-right">{matriz.totais.pendente.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-2 text-right">{matriz.totais.assinado.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-2 text-right">{matriz.totais.excluido.toLocaleString('pt-BR')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}