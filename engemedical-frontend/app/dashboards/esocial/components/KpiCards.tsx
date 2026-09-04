'use client';

import CountUp from 'react-countup';
import type { EsocialKPIs } from '../types';
import { Building2, FileCode, DollarSign, TrendingUp } from 'lucide-react';

interface Props {
  kpis?: EsocialKPIs;
}

export function KpiCards({ kpis }: Props) {
  if (!kpis) return null;

  const cards = [
    {
      label: 'No. de Empresas (eSocial)',
      value: kpis.empresasComEventos,
      format: 'number' as const,
      icon: Building2,
      color: 'bg-blue-500',
      sub: `de ${kpis.empresasFaturamento} no faturamento`,
    },
    {
      label: 'Total Eventos eSocial',
      value: kpis.totalRegistrosXml,
      format: 'number' as const,
      icon: FileCode,
      color: 'bg-green-500',
      sub: 'eventos registrados',
    },
    {
      label: 'Valor Total Eventos',
      value: kpis.valorTotalEventos,
      format: 'currency' as const,
      icon: DollarSign,
      color: 'bg-purple-500',
      sub: 'valor faturado',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {card.format === 'currency' ? (
                  <>R$ <CountUp end={card.value} decimals={0} separator="." /></>
                ) : (
                  <CountUp end={card.value} />
                )}
              </p>
              {card.sub && <p className="text-xs text-gray-400">{card.sub}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}