'use client';

import CountUp from 'react-countup';
import type { AbsenteismoKPIs } from '../types';
import { Users, FileText, CalendarX, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

interface Props {
  kpis?: AbsenteismoKPIs;
}

export function KpiCards({ kpis }: Props) {
  if (!kpis) return null;

  const cards = [
    {
      label: 'No. Funcionarios',
      value: kpis.totalFuncionarios,
      format: 'number',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'No. de Atestados',
      value: kpis.totalAtestados,
      format: 'number',
      icon: FileText,
      color: 'bg-green-500',
    },
    {
      label: 'No. de Dias Perdidos',
      value: kpis.totalDiasPerdidos,
      format: 'number',
      icon: CalendarX,
      color: 'bg-red-500',
    },
    {
      label: 'Taxa de Frequencia',
      value: kpis.taxaFrequencia,
      format: 'decimal',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
    {
      label: 'Taxa de Gravidade',
      value: kpis.taxaGravidade,
      format: 'decimal',
      icon: AlertTriangle,
      color: 'bg-orange-500',
    },
    {
      label: 'Indice Medio Absenteismo',
      value: kpis.indiceAbsenteismo,
      format: 'percent',
      icon: DollarSign,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {card.format === 'percent' ? (
                  <CountUp end={card.value} decimals={2} suffix="%" />
                ) : card.format === 'decimal' ? (
                  <CountUp end={card.value} decimals={2} />
                ) : (
                  <CountUp end={card.value} />
                )}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}