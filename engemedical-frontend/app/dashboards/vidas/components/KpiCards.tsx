'use client';

import CountUp from 'react-countup';
import type { VidasKPIs } from '../types';
import { Users, Building2, Heart, DollarSign, TrendingUp, Package, UserX } from 'lucide-react';

interface Props {
  kpis?: VidasKPIs;
}

const CARDS_ROW1 = [
  { key: 'totalRegistros', label: 'Total Registros', icon: Users, color: 'bg-blue-500' },
  { key: 'totalEmpresas', label: 'Empresas', icon: Building2, color: 'bg-indigo-500' },
  { key: 'totalVidas', label: 'Vidas Ativas', icon: Heart, color: 'bg-green-500' },
  { key: 'valorTotalFaturado', label: 'Valor Faturado (R$)', icon: DollarSign, color: 'bg-emerald-600', isCurrency: true },
];

const CARDS_ROW2 = [
  { key: 'mediaValorPorVida', label: 'Media Valor/Vida', icon: TrendingUp, color: 'bg-teal-500', isCurrency: true },
  { key: 'empresasComPlano', label: 'Com Plano', icon: Package, color: 'bg-cyan-500' },
  { key: 'empresasSemPlano', label: 'Sem Plano', icon: UserX, color: 'bg-red-500' },
];

export default function KpiCards({ kpis }: Props) {
  const renderCards = (cards: typeof CARDS_ROW1) =>
    cards.map(({ key, label, icon: Icon, color, isCurrency }) => (
      <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 shadow-md hover:shadow-lg transition">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-2`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-2xl font-bold text-gray-800">
          {kpis ? (
            <CountUp
              end={kpis[key as keyof VidasKPIs] as number}
              duration={1.2}
              separator="."
              decimals={isCurrency ? 2 : 0}
              decimal=","
              prefix={isCurrency ? 'R$ ' : ''}
            />
          ) : (
            <span className="inline-block h-7 w-20 bg-gray-200 rounded animate-pulse" />
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    ));

  return (
    <div className="space-y-3">
      {/* Row 1: 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {renderCards(CARDS_ROW1)}
      </div>
      {/* Row 2: 3 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {renderCards(CARDS_ROW2)}
      </div>
    </div>
  );
}
