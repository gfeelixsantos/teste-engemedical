'use client';

import CountUp from 'react-countup';
import { FileText, CheckCircle, Clock, Shield } from 'lucide-react';
import type { ConvocacaoKPIs } from '../types';

const fmt = new Intl.NumberFormat('pt-BR');
const fmtPct = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

interface KpiItem {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  isPercent?: boolean;
}

export function KpiCards({ kpis }: { kpis: ConvocacaoKPIs }) {
  const items: KpiItem[] = [
    {
      label: 'Total de Exames',
      value: kpis.totalExames,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Func. com Exames Em Dia',
      value: kpis.percentFuncionariosEmDia,
      suffix: `${fmt.format(kpis.totalFuncionariosConvocados)} convocados`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      isPercent: true,
    },
    {
      label: 'Func. com Exames à Vencer',
      value: kpis.funcComExamesAVencer,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Conformidade Total',
      value: kpis.percentConformidadeTotal,
      suffix: `${fmt.format(kpis.examesDentroDoPrazo)} / ${fmt.format(kpis.examesForaDoPrazo)}`,
      icon: Shield,
      color: 'text-brand-600',
      bgColor: 'bg-brand-50',
      isPercent: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`grid h-9 w-9 place-items-center rounded-lg ${item.bgColor}`}
              >
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-500 leading-tight">
                {item.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {item.isPercent ? (
                <CountUp
                  end={item.value * 100}
                  duration={1.5}
                  decimals={1}
                  decimal=","
                  suffix="%"
                  formattingFn={(v) =>
                    v.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }) + '%'
                  }
                />
              ) : (
                <CountUp
                  end={item.value}
                  duration={1.5}
                  separator="."
                />
              )}
            </div>
            {item.suffix && (
              <p className="text-xs text-gray-400 mt-1">{item.suffix}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
