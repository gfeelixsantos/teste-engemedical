'use client';

import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CountUp from 'react-countup';
import type { AcoesPgrSectionData } from '../types';

interface Props { data?: AcoesPgrSectionData; }

const colors = ['#0e7490', '#15803d', '#eab308', '#dc2626', '#64748b'];

function HorizontalBars({ title, data, dataKey, nameKey }: { title: string; data: { [key: string]: string | number }[]; dataKey: string; nameKey: string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-center text-sm font-bold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(100, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis type="category" dataKey={nameKey} width={122} tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={(value) => String(value).slice(0, 22)} />
          <Tooltip formatter={(value: number) => [value, 'Ações']} />
          <Bar dataKey={dataKey} fill="#056b86" barSize={22} radius={[0, 3, 3, 0]}>
            <LabelList dataKey={dataKey} position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AcoesPgrSection({ data }: Props) {
  if (!data || data.totalAcoes === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-md">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-wide text-slate-800">Gestão de Ações - PGR</h2>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"><CountUp end={0} duration={1.2} /> ações</span>
        </div>
        <p className="text-sm text-slate-500">Nenhum plano de ação foi retornado pelo Exporta Dados 218764.</p>
      </section>
    );
  }

  const situacao = data.porSituacao.map((item) => ({ name: item.situacao, value: item.qtd }));
  const priorities = [
    ['Imediata', data.prioridades.imediata], ['Alta', data.prioridades.alta],
    ['Média', data.prioridades.media], ['Baixa', data.prioridades.baixa],
  ];

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-md">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold tracking-wide text-slate-800">Gestão de Ações - PGR</h2>
        <div className="rounded-md bg-slate-100 px-4 py-2 text-center text-xs font-bold text-slate-600">
          <span className="block text-xl text-cyan-700"><CountUp end={data.totalAcoes} duration={1.2} separator="." /></span>
          Nº de Ações no PGR
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr_210px]">
        <div>
          <h3 className="mb-1 text-center text-sm font-bold text-slate-700">Total de Ações por Situação</h3>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={situacao} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                {situacao.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Ações']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <HorizontalBars title="Total de Ações por Nome da Ação" data={data.porNomeAcao} dataKey="qtd" nameKey="acao" />
        <div>
          <h3 className="mb-2 text-center text-sm font-bold text-slate-700">Prioridade</h3>
          <div className="space-y-1.5">
            {priorities.map(([label, value]) => <div key={label} className="flex items-center justify-between rounded border border-emerald-200 px-3 py-1.5 text-xs"><span className="font-semibold text-slate-600">{label}</span><b className="text-cyan-700"><CountUp end={value} duration={1.2} separator="." /></b></div>)}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h3 className="mb-2 text-center text-sm font-bold text-slate-700">Ações por Categoria</h3>
        <div className="h-7 rounded bg-emerald-600 px-3 text-center text-sm font-bold leading-7 text-white"><CountUp end={data.porCategoria.reduce((sum, item) => sum + item.qtd, 0)} duration={1.2} separator="." /></div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <HorizontalBars title="Ações por Responsável" data={data.porResponsavel} dataKey="qtd" nameKey="responsavel" />
        <HorizontalBars title="Ações por Empresa" data={data.porEmpresa} dataKey="qtd" nameKey="empresa" />
        <HorizontalBars title="Ações por Unidade" data={data.porUnidade} dataKey="qtd" nameKey="unidade" />
      </div>

    </section>
  );
}
