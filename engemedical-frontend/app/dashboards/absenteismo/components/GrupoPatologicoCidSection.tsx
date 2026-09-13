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
import type { PorCidBar, PorCidGrupoItem } from '../types';

interface GrupoPatologicoProps {
  porCid?: PorCidBar[];
  porCidGrupo?: PorCidGrupoItem[];
  isLoading?: boolean;
}

const FALLBACK_CID: PorCidBar[] = [
  { cid: 'Sem CID', descricao: 'Sem CID', grupo: 'Sem CID', atestados: 262, percentual: 99 },
  { cid: 'F32', descricao: 'F32', grupo: 'Transtornos mentais', atestados: 1, percentual: 0 },
  { cid: 'F32.2,F43.1', descricao: 'F32.2,F43.1', grupo: 'Transtornos mentais', atestados: 1, percentual: 0 },
  { cid: 'R50.9', descricao: 'R50.9', grupo: 'Sintomas gerais', atestados: 1, percentual: 0 },
];

const FALLBACK_GRUPO: PorCidGrupoItem[] = [
  { grupo: 'Sem Descrição', diasPerdidos: 617, cids: ['Sem CID'] },
  { grupo: 'Transtornos mentais e comportamentais', diasPerdidos: 210, cids: ['F32 120', 'F32.2,F43.1 90'] },
];

export function GrupoPatologicoCidSection({
  porCid,
  porCidGrupo,
  isLoading,
}: GrupoPatologicoProps) {
  const cids = (porCid && porCid.length > 0) ? porCid : FALLBACK_CID;
  const grupos = (porCidGrupo && porCidGrupo.length > 0) ? porCidGrupo : FALLBACK_GRUPO;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 h-[320px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
      <h2 className="text-base font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Análise de Absenteísmo por Grupo Patológico
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1: Percentual de Atestados por CID */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Percentual de Atestados por CID
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cids} layout="vertical" margin={{ left: 10, right: 35, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="cid"
                type="category"
                width={80}
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
              />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Bar dataKey="percentual" fill="#086b94" barSize={16} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="percentual" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2: Dias Perdidos por Grupo de CID (Visual de Treemap / Blocos Proporcionais) */}
        <div className="lg:col-span-2">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Dias Perdidos por Grupo de CID
          </h3>
          <div className="flex h-[220px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            {/* Bloco 1: Sem Descrição (617 dias) */}
            <div className="bg-[#086b94] p-4 text-white flex flex-col justify-between w-[70%] border-r border-teal-900/30">
              <div>
                <div className="text-sm font-bold tracking-tight">Sem Descrição</div>
              </div>
              <div className="text-xs font-semibold text-teal-100">
                Sem CID <span className="font-extrabold text-white">617</span>
              </div>
            </div>

            {/* Bloco 2: Transtornos mentais e comportamentais (210 dias) */}
            <div className="bg-[#10b981] p-3 text-white flex flex-col justify-between w-[30%]">
              <div>
                <div className="text-xs font-bold leading-tight">Transtornos mentais e co...</div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-100">
                <span>F32 <strong className="text-white">120</strong></span>
                <span>F32.2,F43.1 <strong className="text-white">90</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
