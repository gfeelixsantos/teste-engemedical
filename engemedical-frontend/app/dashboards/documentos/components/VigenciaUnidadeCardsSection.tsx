'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import CountUp from 'react-countup';
import type { VigenciaPorUnidadeItem } from '../types';

interface VigenciaUnidadeSectionProps {
  pcmso?: VigenciaPorUnidadeItem[];
  pgr?: VigenciaPorUnidadeItem[];
  pcmsoKpis?: { aVencer: number; vencidos: number; vigentes: number };
  pgrKpis?: { aVencer: number; vencidos: number; vigentes: number };
}

const FALLBACK_PCMSO: VigenciaPorUnidadeItem[] = [
  { unidade: '001 - PROTECTA MATRIZ CE - 08.639.527/0001-72', vigentes: 1, aVencer: 0, vencidos: 0 },
  { unidade: '002 - PROTECTA BA - 08.639.527/0002-53', vigentes: 1, aVencer: 0, vencidos: 0 },
  { unidade: '003 - PROTECTA SE - 08.639.527/0003-34', vigentes: 1, aVencer: 0, vencidos: 0 },
  { unidade: '004 - PROTECTA PB - 08.639.527/0004-15', vigentes: 1, aVencer: 0, vencidos: 0 },
];

const FALLBACK_PGR: VigenciaPorUnidadeItem[] = [
  { unidade: '001 - PROTECTA MATRIZ CE - 08.639.527/0001-72', vigentes: 1, aVencer: 0, vencidos: 0 },
  { unidade: '002 - PROTECTA BA - 08.639.527/0002-53', vigentes: 1, aVencer: 0, vencidos: 0 },
  { unidade: '003 - PROTECTA SE - 08.639.527/0003-34', vigentes: 1, aVencer: 0, vencidos: 0 },
  { unidade: '004 - PROTECTA PB - 08.639.527/0004-15', vigentes: 1, aVencer: 0, vencidos: 0 },
  { unidade: '005 - PROTECTA GO - 08.639.527/0005-04', vigentes: 1, aVencer: 0, vencidos: 0 },
];

function truncateUnidade(label: string, maxLen = 22) {
  if (!label) return '';
  const parts = label.split(' - ');
  // Keep code prefix (e.g., 001) and shorten name
  if (parts.length >= 2) {
    const prefix = parts[0];
    const rest = parts.slice(1).join(' - ');
    if (rest.length > maxLen) return `${prefix} - ${rest.substring(0, maxLen)}...`;
    return `${prefix} - ${rest}`;
  }
  return label.length > maxLen ? label.substring(0, maxLen) + '...' : label;
}

function VigenciaUnitChart({
  title,
  data,
  kpis,
}: {
  title: string;
  data: VigenciaPorUnidadeItem[];
  kpis: { aVencer: number; vencidos: number; vigentes: number };
}) {
  const chartData = data.map(d => ({
    unidade: truncateUnidade(d.unidade),
    Vigentes: d.vigentes,
    'À Vencer': d.aVencer,
    Vencidos: d.vencidos,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {/* Legend row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <div className="flex items-center gap-4 text-[11px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803d] inline-block" />
            Vigentes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] inline-block" />
            À Vencer
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] inline-block" />
            Vencidos
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Column chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="unidade"
                tick={{ fontSize: 9, fill: '#475569' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Vigentes" fill="#15803d" barSize={22}>
                <LabelList dataKey="Vigentes" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#15803d' }} />
              </Bar>
              <Bar dataKey="À Vencer" fill="#eab308" barSize={22}>
                <LabelList dataKey="À Vencer" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#b45309' }} />
              </Bar>
              <Bar dataKey="Vencidos" fill="#dc2626" barSize={22}>
                <LabelList dataKey="Vencidos" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#dc2626' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mini-cards laterais */}
        <div className="flex flex-col justify-center gap-3 min-w-[90px]">
          <div className="rounded-lg bg-white border border-gray-100 shadow-sm p-3 text-center">
            <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">À Vencer</div>
            <div className="text-xl font-extrabold text-amber-600">
              <CountUp end={kpis.aVencer} />
            </div>
          </div>
          <div className="rounded-lg bg-white border border-gray-100 shadow-sm p-3 text-center">
            <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Vencidos</div>
            <div className="text-xl font-extrabold text-red-600">
              <CountUp end={kpis.vencidos} />
            </div>
          </div>
          <div className="rounded-lg bg-white border border-gray-100 shadow-sm p-3 text-center">
            <div className="text-[10px] font-bold text-green-700 uppercase mb-1">Vigentes</div>
            <div className="text-xl font-extrabold text-green-700">
              <CountUp end={kpis.vigentes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VigenciaUnidadeCardsSection({
  pcmso,
  pgr,
  pcmsoKpis,
  pgrKpis,
}: VigenciaUnidadeSectionProps) {
  const pcmsoData = (pcmso && pcmso.length > 0) ? pcmso : FALLBACK_PCMSO;
  const pgrData = (pgr && pgr.length > 0) ? pgr : FALLBACK_PGR;

  const pcmsoK = pcmsoKpis ?? {
    aVencer: 0,
    vencidos: 1,
    vigentes: 14,
  };

  const pgrK = pgrKpis ?? {
    aVencer: 0,
    vencidos: 2,
    vigentes: 14,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <h2 className="text-base font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Vigência de Documentos - PGR e PCMSO
      </h2>

      <div className="space-y-8">
        <VigenciaUnitChart
          title="Vigência do PCMSO por Unidade"
          data={pcmsoData}
          kpis={pcmsoK}
        />
        <VigenciaUnitChart
          title="Vigência do PGR por Unidade"
          data={pgrData}
          kpis={pgrK}
        />
      </div>
    </div>
  );
}
