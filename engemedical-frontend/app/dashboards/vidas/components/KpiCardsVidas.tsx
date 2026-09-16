'use client';

import React from 'react';
import { Users, UserX, UserCheck, Clock, Palmtree, Activity, AlertTriangle } from 'lucide-react';
import { VidasKPIs } from '../types';

interface KpiCardsVidasProps {
  kpis: VidasKPIs;
  loading?: boolean;
}

export function KpiCardsVidas({ kpis, loading }: KpiCardsVidasProps) {
  const cards = [
    {
      title: 'Nº Total de Registros',
      value: kpis.totalRegistros.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Inativos',
      value: kpis.inativos.toLocaleString('pt-BR'),
      icon: UserX,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      title: 'Ativos',
      value: kpis.ativos.toLocaleString('pt-BR'),
      icon: UserCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Pendentes',
      value: kpis.pendentes.toLocaleString('pt-BR'),
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Férias',
      value: kpis.ferias.toLocaleString('pt-BR'),
      icon: Palmtree,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: 'Afastados',
      value: kpis.afastados.toLocaleString('pt-BR'),
      icon: Activity,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      title: '% Inconsistência da Base',
      value: `${kpis.percentInconsistenciaBase}%`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="p-4 flex flex-col justify-between shadow-md border border-gray-200 rounded-xl bg-white hover:shadow-lg transition-shadow text-center">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block truncate">{card.title}</span>
            <h3 className="text-xl font-extrabold mt-1 text-gray-800">
              {loading ? '...' : card.value}
            </h3>
            <div className={`mt-2 p-2 rounded-lg self-center ${card.bgColor}`}>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
