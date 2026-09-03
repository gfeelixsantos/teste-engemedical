'use client';

import CountUp from 'react-countup';
import { CheckCircle, XCircle } from 'lucide-react';
import type { ConvocacaoKPIs } from '../types';

export function KpiCards({ kpis }: { kpis: ConvocacaoKPIs }) {
  return (
    <div className="space-y-6">
      {/* Exames Em Dia */}
      <div className="text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 mx-auto mb-2">
          <CheckCircle className="h-7 w-7 text-blue-600" />
        </div>
        <span className="text-xs font-medium text-gray-500 block mb-1">
          Exames Em Dia
        </span>
        <div className="text-4xl font-bold text-blue-600">
          <CountUp end={kpis.examesEmDia} duration={1.5} separator="." />
        </div>
      </div>

      {/* Exames Vencidos */}
      <div className="text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 mx-auto mb-2">
          <XCircle className="h-7 w-7 text-red-600" />
        </div>
        <span className="text-xs font-medium text-gray-500 block mb-1">
          Exames Vencidos
        </span>
        <div className="text-4xl font-bold text-red-600">
          <CountUp
            end={kpis.examesVencidos}
            duration={1.5}
            separator="."
          />
        </div>
      </div>
    </div>
  );
}
