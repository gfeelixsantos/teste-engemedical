'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';
import type { VigenciaPorTipoItem, StatusDocumentoItem } from '../types';

interface DocumentosGraficosProps {
  vigenciaGeral?: { label: string; value: number; color: string }[];
  vigenciaPorTipo?: VigenciaPorTipoItem[];
  statusDocumentos?: StatusDocumentoItem[];
}

const FALLBACK_VIGENCIA = [
  { label: 'Contrato Vigente', value: 28, color: '#15803d' },
  { label: 'Contrato Vencido', value: 3, color: '#dc2626' },
];

const FALLBACK_TIPO: VigenciaPorTipoItem[] = [
  { tipo: 'PGR - MATRIZ', vigentes: 16, aVencer: 0, vencidos: 2 },
  { tipo: 'PCMSO - MATRIZ', vigentes: 15, aVencer: 0, vencidos: 1 },
];

const FALLBACK_STATUS: StatusDocumentoItem[] = [
  { status: 'Ativo', quantidade: 31 },
];

const RENDERIZADOR_LABEL = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
  value,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.02) return null;
  return (
    <text
      x={x}
      y={y}
      fill="#1e293b"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${name} ${(percent * 100).toFixed(2)}%`}
    </text>
  );
};

export function DocumentosGraficosGerais({
  vigenciaGeral,
  vigenciaPorTipo,
  statusDocumentos,
}: DocumentosGraficosProps) {
  const vigencia = (vigenciaGeral && vigenciaGeral.length > 0) ? vigenciaGeral : FALLBACK_VIGENCIA;
  const tipos = (vigenciaPorTipo && vigenciaPorTipo.length > 0) ? vigenciaPorTipo : FALLBACK_TIPO;
  const status = (statusDocumentos && statusDocumentos.length > 0) ? statusDocumentos : FALLBACK_STATUS;

  // bar data: número de documentos (vigentes + vencidos total por tipo)
  const barData = tipos.map(t => ({
    tipo: t.tipo,
    total: t.vigentes + t.aVencer + t.vencidos,
  }));

  // donut status colors
  const STATUS_COLORS = ['#0e7490', '#15803d', '#eab308', '#dc2626', '#4b5563'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-md p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 1: Vigência dos Documentos - PGR e PCMSO (Donut) */}
        <div className="flex flex-col items-center">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-1">
            Vigência dos Documentos - PGR e PCMSO
          </h3>
          <p className="text-[10px] text-gray-400 text-center mb-2">Contrato Vigente ● Contrato Vencido</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={vigencia}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                labelLine={false}
                label={RENDERIZADOR_LABEL}
              >
                {vigencia.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => val.toLocaleString('pt-BR')} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legenda */}
          <div className="flex flex-col gap-1 text-[11px] font-semibold text-gray-700 mt-1">
            {vigencia.map(v => (
              <span key={v.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: v.color }} />
                {v.label} ({v.value.toLocaleString('pt-BR')})
              </span>
            ))}
          </div>
        </div>

        {/* 2: Nº de Documentos (Barras Verticais por tipo) */}
        <div className="flex flex-col items-center">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Nº de Documentos
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip formatter={(val: number) => val.toLocaleString('pt-BR')} />
              <Bar dataKey="total" fill="#0e7490" barSize={50} radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="total"
                  position="top"
                  style={{ fontSize: 13, fontWeight: 700, fill: '#1e293b' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-1 text-center">Documentos</p>
        </div>

        {/* 3: Status de Documentos (Donut) */}
        <div className="flex flex-col items-center">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
            Status de Documentos
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={status}
                dataKey="quantidade"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {status.map((entry, idx) => (
                  <Cell key={idx} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => val.toLocaleString('pt-BR')} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 text-[11px] font-semibold text-gray-700 mt-1">
            {status.map((s, i) => (
              <span key={s.status} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                {s.status} {s.quantidade}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
