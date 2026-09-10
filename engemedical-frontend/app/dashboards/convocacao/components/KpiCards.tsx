'use client';

import CountUp from 'react-countup';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import type { ConvocacaoKPIs } from '../types';

interface TrendProps {
  value: number | undefined;
}

function TrendBadge({ value }: TrendProps) {
  if (value === undefined || value === 0) return null;
  const isPositive = value > 0;
  const color = isPositive ? '#10b981' : '#ef4444';
  return (
    <div className="flex items-center gap-0.5">
      <TrendingUp className="h-3 w-3" style={{ color }} />
      <span className="text-xs font-semibold" style={{ color }}>
        {Math.abs(value).toFixed(1)}%
      </span>
    </div>
  );
}

export function KpiCards({ kpis }: { kpis: ConvocacaoKPIs }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Exames Em Dia */}
      <div className="p-4 rounded-xl border bg-green-50 border-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-green-200 bg-white">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <span className="text-xs font-medium text-gray-600 block">Exames Em Dia</span>
              <div className="text-lg font-bold text-gray-900">
                <CountUp end={kpis.examesEmDia} duration={1.2} separator="." />
              </div>
            </div>
          </div>
          <TrendBadge value={kpis.tendenciaExamesEmDia} />
        </div>
      </div>

      {/* A Vencer */}
      <div className="p-4 rounded-xl border bg-orange-50 border-orange-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-orange-200 bg-white">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <span className="text-xs font-medium text-gray-600 block">A Vencer</span>
              <div className="text-lg font-bold text-gray-900">
                <CountUp end={kpis.examesAVencer} duration={1.2} separator="." />
              </div>
            </div>
          </div>
          <TrendBadge value={kpis.tendenciaExamesAVencer} />
        </div>
      </div>

      {/* Exames Vencidos */}
      <div className="p-4 rounded-xl border bg-red-50 border-red-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-red-200 bg-white">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <span className="text-xs font-medium text-gray-600 block">Exames Vencidos</span>
              <div className="text-lg font-bold text-gray-900">
                <CountUp end={kpis.examesVencidos} duration={1.2} separator="." />
              </div>
            </div>
          </div>
          <TrendBadge value={kpis.tendenciaExamesVencidos} />
        </div>
      </div>
    </div>
  );
}