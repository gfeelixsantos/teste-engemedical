'use client';

import CountUp from 'react-countup';
import type { EsocialKPIs } from '../types';
import {
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  FileX,
} from 'lucide-react';

interface Props {
  kpis?: EsocialKPIs;
}

const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow p-4 animate-pulse">
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-lg bg-gray-200 w-9 h-9" />
      <div className="flex-1">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-5 bg-gray-200 rounded w-14" />
      </div>
    </div>
  </div>
);

export function KpiCards({ kpis }: Props) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Eventos',
      value: kpis.totalRegistros,
      icon: Activity,
      color: 'bg-blue-500',
    },
    {
      label: 'Concluídos',
      value: kpis.concluidos,
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
    {
      label: 'Pendentes',
      value: kpis.pendentes,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      label: 'Erros',
      value: kpis.inconsistencias,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      label: 'Xmls Válidos',
      value: kpis.xmlsValidos,
      icon: FileCheck,
      color: 'bg-green-500',
    },
    {
      label: 'Xmls Inválidos',
      value: kpis.xmlsInvalidos,
      icon: FileX,
      color: 'bg-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-gray-900">
                <CountUp end={card.value} separator="." />
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
