'use client';

import CountUp from 'react-countup';
import type { AbsenteismoKPIs } from '../types';
import {
  FileText,
  CalendarX,
  DollarSign,
  Clock,
  CreditCard,
  Users,
} from 'lucide-react';

interface Props {
  kpis?: AbsenteismoKPIs;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-200 w-9 h-9" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function KpiCards({ kpis, isLoading }: Props) {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const mediaDias =
    kpis.totalAtestados > 0
      ? kpis.totalDiasPerdidos / kpis.totalAtestados
      : 0;

  const cards = [
    {
      label: 'Total de Licenças',
      value: kpis.totalAtestados,
      format: 'number' as const,
      icon: FileText,
      color: 'bg-[#E8601C]',
    },
    {
      label: 'Dias Perdidos',
      value: kpis.totalDiasPerdidos,
      format: 'number' as const,
      icon: CalendarX,
      color: 'bg-[#D32F2F]',
    },
    {
      label: 'Custo Total',
      value: kpis.custoTotal,
      format: 'currency' as const,
      icon: DollarSign,
      color: 'bg-[#E8601C]',
    },
    {
      label: 'Média Dias/Licença',
      value: mediaDias,
      format: 'decimal' as const,
      icon: Clock,
      color: 'bg-[#F44336]',
    },
    {
      label: 'Custo Mensal',
      value: kpis.custoTotal / 12,
      format: 'currency' as const,
      icon: CreditCard,
      color: 'bg-[#C62828]',
    },
    {
      label: 'Funcionários Afetados',
      value: kpis.totalFuncionarios,
      format: 'number' as const,
      icon: Users,
      color: 'bg-[#FF5722]',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {card.format === 'currency' ? (
                  <>
                    R$&nbsp;
                    <CountUp
                      end={card.value}
                      decimals={2}
                      decimal=","
                      separator="."
                      prefix=""
                    />
                  </>
                ) : card.format === 'decimal' ? (
                  <CountUp end={card.value} decimals={1} decimal="," />
                ) : (
                  <CountUp end={card.value} separator="." />
                )}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
