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
import type { EmpresaStatusItem } from '../types';

interface Props {
  data?: EmpresaStatusItem[];
}

export function NaoConcluidosEmpresa({ data }: Props) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.empresa.length > 25 ? d.empresa.substring(0, 25) + '...' : d.empresa,
    Inconsistencias: d.inconsistencias,
    Pendente: d.pendente,
    Assinado: d.assinado,
    Excluido: d.excluido,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
        Analise de Registros por Empresa (Nao Concluidos)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="Inconsistencias" stackId="a" fill="#991b1b" />
          <Bar dataKey="Pendente" stackId="a" fill="#f97316" />
          <Bar dataKey="Assinado" stackId="a" fill="#0d9488" />
          <Bar dataKey="Excluido" stackId="a" fill="#374151" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}