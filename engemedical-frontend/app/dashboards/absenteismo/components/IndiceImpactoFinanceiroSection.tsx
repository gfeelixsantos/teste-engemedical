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
import type { AbsenteismoKPIs, PorEmpresaBar } from '../types';

interface IndiceImpactoProps {
  kpis?: AbsenteismoKPIs;
  porEmpresa?: PorEmpresaBar[];
  isLoading?: boolean;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export function IndiceImpactoFinanceiroSection({
  kpis,
  porEmpresa,
  isLoading,
}: IndiceImpactoProps) {
  const custoDireto = kpis?.custoDireto ?? 63583;
  const custoIndireto = kpis?.custoIndireto ?? 33250;
  const custoTotal = kpis?.custoTotal ?? 96833;

  const empresaData = (porEmpresa && porEmpresa.length > 0)
    ? porEmpresa
    : [{ empresa: 'CREMEC', custoTotal: 96833, diasPerdidos: 830 }];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-6 h-[400px] animate-pulse" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-md p-6 mb-6">
      <h2 className="text-base font-bold text-gray-800 text-center uppercase tracking-wide mb-6">
        Análise de Índice de Absenteísmo e Impacto Financeiro
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Coluna 1 e 2 e 3: Gráficos de Índice e Custos */}
        <div className="lg:col-span-3 space-y-8">
          {/* Ponto/Linha de Índice de Absenteísmo Mensal */}
          <div className="flex flex-col items-center">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
              Índice de Absenteísmo Mensal
            </h3>
            <div className="flex flex-col items-center my-2">
              <span className="text-xs font-bold text-gray-700">11,4%</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-600 my-1 inline-block" />
              <span className="text-[11px] text-gray-400 font-semibold">2026</span>
            </div>
          </div>

          {/* Custos de Afastamentos por Empresa */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide text-center mb-4">
              Custos de Afastamentos por Empresa
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={empresaData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="empresa" tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} />
                <YAxis hide />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="custoTotal" fill="#15803d" barSize={160} radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="custoTotal"
                    position="top"
                    formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
                    style={{ fontSize: 12, fontWeight: 700, fill: '#15803d' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coluna 4: Resumo de Custos Lateral (Idêntico ao Power BI) */}
        <div className="flex flex-col justify-center gap-6 border-l border-gray-100 pl-6">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Custo Direto
            </div>
            <div className="text-2xl font-black text-teal-800">
              R$ <CountUp end={custoDireto} separator="." />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Custo Indireto
            </div>
            <div className="text-2xl font-black text-teal-800">
              R$ <CountUp end={custoIndireto} separator="." />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Custo Total
            </div>
            <div className="text-2xl font-black text-teal-900">
              R$ <CountUp end={custoTotal} separator="." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
