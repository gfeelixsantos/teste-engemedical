'use client';

import CountUp from 'react-countup';
import type { DocumentosKPIs } from '../types';
import { FileText, Shield, HeartPulse, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Props {
  kpis?: DocumentosKPIs;
}

const CARDS = [
  { key: 'totalDocumentos', label: 'Total Documentos', icon: FileText, color: 'bg-blue-500' },
  { key: 'totalPGR', label: 'PGR Total', icon: Shield, color: 'bg-indigo-500' },
  { key: 'totalPCMSO', label: 'PCMSO Total', icon: HeartPulse, color: 'bg-violet-500' },
  { key: 'vigentes', label: 'Vigentes', icon: CheckCircle, color: 'bg-green-500' },
  { key: 'aVencer', label: 'À Vencer', icon: AlertTriangle, color: 'bg-yellow-500' },
  { key: 'vencidos', label: 'Vencidos', icon: XCircle, color: 'bg-red-500' },
];

export default function KpiCards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CARDS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
          <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-2`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {kpis ? (
              <CountUp end={kpis[key as keyof DocumentosKPIs] as number} duration={1.2} separator="." />
            ) : (
              <span className="inline-block h-7 w-16 bg-gray-200 rounded animate-pulse" />
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
