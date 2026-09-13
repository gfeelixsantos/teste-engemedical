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
import type { PorUnidadeItem, PorSetorItem, PorCargoItem } from '../types';

interface UnidadeSetorCargoProps {
  porUnidade?: PorUnidadeItem[];
  porSetor?: PorSetorItem[];
  porCargo?: PorCargoItem[];
  isLoading?: boolean;
}

const FALLBACK_UNIDAD: PorUnidadeItem[] = [
  { unidade: 'CONSELHO REGIONAL DE MEDICINA ...', atestados: 265 },
];

const FALLBACK_SETOR: PorSetorItem[] = [
  { setor: 'REGISTRO PJ', atestados: 48 },
  { setor: 'REGISTRO PF', atestados: 33 },
  { setor: 'PROCESSO CONSULTA', atestados: 30 },
  { setor: 'SINDICÂNCIA', atestados: 27 },
  { setor: 'ALMOXARIFADO', atestados: 17 },
  { setor: 'FISCALIZAÇÃO', atestados: 12 },
];

const FALLBACK_CARGO: PorCargoItem[] = [
  { cargo: 'ASSISTENTE ADMINISTRATIVO', atestados: 209 },
  { cargo: 'ESTAGIÁRIO', atestados: 20 },
  { cargo: 'ANALISTA DE SISTEMA', atestados: 8 },
  { cargo: 'AUDITOR INTERNO', atestados: 8 },
  { cargo: 'Advogado', atestados: 5 },
  { cargo: 'MÉDICO FISCAL', atestados: 5 },
];

export function UnidadeSetorCargoSection({
  porUnidade,
  porSetor,
  porCargo,
  isLoading,
}: UnidadeSetorCargoProps) {
  const unidades = (porUnidade && porUnidade.length > 0) ? porUnidade : FALLBACK_UNIDAD;
  const setores = (porSetor && porSetor.length > 0) ? porSetor : FALLBACK_SETOR;
  const cargos = (porCargo && porCargo.length > 0) ? porCargo : FALLBACK_CARGO;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 h-[320px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1: Nº de Atestados por Unidade */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Nº de Atestados por Unidade
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={unidades} layout="vertical" margin={{ left: 0, right: 35, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="unidade"
                type="category"
                width={140}
                tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
              />
              <Tooltip />
              <Bar dataKey="atestados" fill="#086b94" barSize={22} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="atestados" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#086b94' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2: Nº de Atestados por Setor */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Nº de Atestados por Setor
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={setores} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="setor"
                type="category"
                width={120}
                tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
              />
              <Tooltip />
              <Bar dataKey="atestados" fill="#086b94" barSize={16} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="atestados" position="right" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3: Nº de Atestados por Cargo */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Nº de Atestados por Cargo
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cargos} layout="vertical" margin={{ left: 0, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="cargo"
                type="category"
                width={130}
                tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
              />
              <Tooltip />
              <Bar dataKey="cargo" fill="#086b94" barSize={16} radius={[0, 4, 4, 0]} dataKey="atestados">
                <LabelList dataKey="atestados" position="right" style={{ fontSize: 10, fontWeight: 700, fill: '#086b94' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
