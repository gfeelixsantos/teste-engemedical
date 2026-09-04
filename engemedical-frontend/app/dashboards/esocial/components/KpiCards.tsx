'use client';

import CountUp from 'react-countup';
import type { EsocialKPIs } from '../types';
import { Building2, FileCode, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  kpis?: EsocialKPIs;
}

export function KpiCards({ kpis }: Props) {
  if (!kpis) return null;

  const cards = [
    {
      label: 'No. de Registros',
      value: kpis.totalRegistros,
      icon: FileCode,
      color: 'bg-blue-500',
    },
    {
      label: 'No. de Empresas',
      value: kpis.totalEmpresas,
      icon: Building2,
      color: 'bg-green-500',
    },
    {
      label: 'Concluidos',
      value: kpis.concluidos,
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
    {
      label: 'Inconsistencias',
      value: kpis.inconsistencias,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      label: 'Pendentes',
      value: kpis.pendentes,
      icon: Clock,
      color: 'bg-orange-500',
    },
    {
      label: 'Taxa Conclusao',
      value: kpis.taxaConclusao,
      format: 'percent' as const,
      icon: CheckCircle,
      color: 'bg-teal-500',
    },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-gray-900">
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