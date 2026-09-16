'use client';

import CountUp from 'react-countup';
import type { EsocialKPIs } from '../types';

interface StatusXmlCardsProps {
  kpis?: EsocialKPIs;
  countsByStatus?: {
    concluidos: number;
    inconsistencias: number;
    pendentes: number;
    excluidos: number;
    assinados: number;
  };
  totalRegistros?: number;
}

export function StatusXmlCards({ kpis, countsByStatus, totalRegistros }: StatusXmlCardsProps) {
  const concluidos = countsByStatus?.concluidos ?? kpis?.concluidos ?? 55395;
  const inconsistencias = countsByStatus?.inconsistencias ?? kpis?.inconsistencias ?? 28645;
  const pendentes = countsByStatus?.pendentes ?? kpis?.pendentes ?? 1694;
  const excluidos = countsByStatus?.excluidos ?? 124;
  const assinados = countsByStatus?.assinados ?? 43;

  const total = totalRegistros || (concluidos + inconsistencias + pendentes + excluidos + assinados) || 1;

  const cards = [
    {
      label: 'Concluido',
      count: concluidos,
      pct: Math.round((concluidos / total) * 100),
      bgColor: 'bg-[#15803d]', // Verde eSocial
    },
    {
      label: 'Inconsistencias',
      count: inconsistencias,
      pct: Math.round((inconsistencias / total) * 100),
      bgColor: 'bg-[#991b1b]', // Vinho / Vermelho Escuro
    },
    {
      label: 'Pendente',
      count: pendentes,
      pct: Math.round((pendentes / total) * 100),
      bgColor: 'bg-[#f97316]', // Laranja
    },
    {
      label: 'Excluido',
      count: excluidos,
      pct: Math.round((excluidos / total) * 100),
      bgColor: 'bg-[#4b5563]', // Cinza
    },
    {
      label: 'Assinado',
      count: assinados,
      pct: Math.round((assinados / total) * 100),
      bgColor: 'bg-[#0e7490]', // Teal / Azul escuro
    },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
      <h2 className="text-base font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Status dos Arquivos XML
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col items-center justify-between rounded-lg shadow-sm overflow-hidden border border-gray-200/60 transition-transform hover:scale-[1.02]"
          >
            {/* Bloco Colorido */}
            <div className={`w-full py-6 text-center text-white ${card.bgColor}`}>
              <div className="text-xl font-black tracking-tight leading-none mb-1">
                <CountUp end={card.count} separator="." />
              </div>
              <div className="text-xs font-semibold opacity-90">{card.pct}%</div>
            </div>
            {/* Rótulo Inferior */}
            <div className="w-full py-2 bg-slate-50 text-center text-xs font-semibold text-gray-700 border-t border-gray-100">
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
