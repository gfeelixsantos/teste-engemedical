'use client';

import React from 'react';
import { CalendarCheck, FileSpreadsheet, Users, Calculator } from 'lucide-react';
import { VolumetriaKPIs } from '../types';

interface KpiCardsProps {
  kpis: VolumetriaKPIs;
  loading?: boolean;
}

export function KpiCards({ kpis, loading }: KpiCardsProps) {
  const cards = [
    {
      title: 'Nº de Agendamentos',
      value: kpis.totalAgendamentos.toLocaleString('pt-BR'),
      icon: CalendarCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Nº de Exames',
      value: kpis.totalExames.toLocaleString('pt-BR'),
      icon: FileSpreadsheet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Média de Exames por Agendamento',
      value: kpis.mediaExamesPorAgendamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      icon: Calculator,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Nº Funcionários',
      value: kpis.totalFuncionarios.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="p-5 flex items-center justify-between shadow-md border border-gray-200 rounded-2xl bg-white hover:shadow-lg transition-shadow">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-bold mt-1 text-gray-800">
                {loading ? '...' : card.value}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${card.bgColor}`}>
              <Icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
