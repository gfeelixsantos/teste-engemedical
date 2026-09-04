'use client';

import CountUp from 'react-countup';
import type { EsocialKPIs } from '../types';
import { Building2, AlertTriangle, FileCode } from 'lucide-react';

interface Props {
  kpis?: EsocialKPIs;
}

export function KpiCards({ kpis }: Props) {
  if (!kpis) return null;

  const cards = [
    {
      label: 'No. de Empresas',
      value: kpis.totalEmpresas,
      format: 'number' as const,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      label: '% Registros Inconsistentes',
      value: kpis.pctInconsistentes,
      format: 'percent' as const,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      label: 'No. de Registros (XML)',
      value: kpis.totalRegistrosXml,
      format: 'number' as const,
      icon: FileCode,
      color: 'bg-green-500',
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
                {card.format === 'percent' ? (
                  <CountUp end={card.value} decimals={1} suffix="%" />
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