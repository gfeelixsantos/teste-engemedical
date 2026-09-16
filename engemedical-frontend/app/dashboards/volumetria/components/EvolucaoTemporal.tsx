'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { PorPeriodoItem } from '../types';

interface EvolucaoTemporalProps {
  porPeriodo: PorPeriodoItem[];
}

export function EvolucaoTemporal({ porPeriodo }: EvolucaoTemporalProps) {
  return (
    <div className="p-6 shadow-md border border-gray-200 rounded-2xl bg-white space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-lg font-bold">Agendamentos por Período</h3>
          <p className="text-xs text-muted-foreground">Evolução de Nº de Agendamentos e Nº de Exames ao longo dos meses</p>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={porPeriodo} margin={{ top: 15, right: 20, left: -10, bottom: 10 }}>
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                value.toLocaleString('pt-BR'),
                name === 'agendamentos' ? 'Nº de Agendamentos' : 'Nº de Exames',
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend
              formatter={(value) => (value === 'agendamentos' ? 'Nº de Agendamentos' : 'Nº de Exames')}
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
            />
            <Line
              type="monotone"
              dataKey="agendamentos"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="exames"
              stroke="#0284c7"
              strokeWidth={3}
              dot={{ r: 4, fill: '#0284c7' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
