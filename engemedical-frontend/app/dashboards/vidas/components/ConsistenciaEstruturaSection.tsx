'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { AnaliseEstruturalItem } from '../types';

interface ConsistenciaEstruturaSectionProps {
  analiseEmpresas: AnaliseEstruturalItem[];
  analiseUnidades: AnaliseEstruturalItem[];
  analiseSetores: AnaliseEstruturalItem[];
  empresaFiltro: string;
  consistenciaFiltro: string;
  motivoFiltro: string;
  onEmpresaChange: (val: string) => void;
  onConsistenciaChange: (val: string) => void;
  onMotivoChange: (val: string) => void;
}

export function ConsistenciaEstruturaSection({
  analiseEmpresas,
  analiseUnidades,
  analiseSetores,
  empresaFiltro,
  consistenciaFiltro,
  motivoFiltro,
  onEmpresaChange,
  onConsistenciaChange,
  onMotivoChange,
}: ConsistenciaEstruturaSectionProps) {
  const statusPills = [
    'Afastado', 'Ativo', 'Férias', 'Inativo',
    'Inconsistência da Base de Produto', 'Inconsistência do Cadastro Ativo', 'Pendente'
  ];

  return (
    <div className="p-6 shadow-xs border border-gray-200 rounded-2xl bg-white space-y-6">
      <div className="border-b pb-4 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-800 text-center">Consistência Cadastral por Estrutura Organizacional</h2>

        {/* Filtros Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Empresa</label>
            <select
              value={empresaFiltro}
              onChange={(e) => onEmpresaChange(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Todos">Todas</option>
              <option value="ASO AVULSO - MATRIZ">ASO AVULSO - MATRIZ</option>
              <option value="GRUPO TORA">GRUPO TORA</option>
              <option value="PFM COMERCIAL LTDA - MATRIZ">PFM COMERCIAL LTDA - MATRIZ</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Consistência Cadastral</label>
            <select
              value={consistenciaFiltro}
              onChange={(e) => onConsistenciaChange(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Todos">Todos</option>
              <option value="Consistente">Consistente</option>
              <option value="Inconsistente">Inconsistente</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Motivo da Inconsistência</label>
            <select
              value={motivoFiltro}
              onChange={(e) => onMotivoChange(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Todos">Todos</option>
              <option value="Inconsistência da Base de Produto">Inconsistência da Base de Produto</option>
              <option value="Inconsistência do Cadastro Ativo">Inconsistência do Cadastro Ativo</option>
            </select>
          </div>
        </div>

        {/* Pills de Status */}
        <div className="flex flex-wrap gap-2 pt-2 justify-center">
          {statusPills.map((pill) => (
            <span key={pill} className="text-[11px] px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-medium">
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Gráfico Análise por Empresa */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-center text-gray-700">Análise por Empresa</h4>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analiseEmpresas} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 9 }}
                interval={0}
                tickFormatter={(val: string) => (val.length > 12 ? val.substring(0, 10) + '...' : val)}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 5 }} />
              <Bar dataKey="consistente" name="Consistente" fill="#006699" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inconsistente" name="Inconsistente" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos Unidade e Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t">
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Análise por Unidade</h4>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analiseUnidades} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 9 }}
                  interval={0}
                  tickFormatter={(val: string) => (val.length > 12 ? val.substring(0, 10) + '...' : val)}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 5 }} />
                <Bar dataKey="consistente" name="Consistente" fill="#006699" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inconsistente" name="Inconsistente" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-center text-gray-700">Análise por Setor</h4>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analiseSetores} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 5 }} />
                <Bar dataKey="consistente" name="Consistente" fill="#006699" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inconsistente" name="Inconsistente" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
