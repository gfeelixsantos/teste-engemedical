'use client';

import CountUp from 'react-countup';
import type { VidasKPIs } from '../types';
import { Users, Building2, Heart, DollarSign, TrendingUp, Package, UserX } from 'lucide-react';

interface Props {
  kpis?: VidasKPIs;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CARDS = [
  { key: 'totalRegistros', label: 'Total de Registros', icon: Users, color: 'bg-blue-500' },
  { key: 'totalEmpresas', label: 'Empresas', icon: Building2, color: 'bg-indigo-500' },
  { key: 'totalVidas', label: 'Vidas Ativas', icon: Heart, color: 'bg-green-500' },
  { key: 'valorTotalFaturado', label: 'Valor Total Faturado', icon: DollarSign, color: 'bg-emerald-600', isCurrency: true },
  { key: 'mediaVidasPorEmpresa', label: 'Média Vidas/Empresa', icon: TrendingUp, color: 'bg-teal-500' },
  { key: 'empresasComPlano', label: 'Empresas c/ Plano', icon: Package, color: 'bg-cyan-500' },
  { key: 'empresasSemPlano', label: 'Empresas s/ Plano', icon: UserX, color: 'bg-red-500' },
];

export default function KpiCards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {CARDS.map(({ key, label, icon: Icon, color, isCurrency }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
          <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-2`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {kpis ? (
              isCurrency ? (
                formatCurrency(kpis[key as keyof VidasKPIs] as number)
              ) : (
                <CountUp end={kpis[key as keyof VidasKPIs] as number} duration={1.2} separator="." />
              )
            ) : (
              <span className="inline-block h-7 w-20 bg-gray-200 rounded animate-pulse" />
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
