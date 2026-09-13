'use client';

import { Calendar, CalendarCheck, Percent, TrendingUp, TrendingDown } from 'lucide-react';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import type { VolumetriaKPIs } from '../types';

/* ── Smartrics brand palette ── */
const BRAND = {
  primary: '#28B1CF', // ENGE Blue
  accent: '#a6ce39',  // ENGE Green
  primaryLight: '#EFFBFD',
  accentLight: '#f0f9e4',
};

function TrendBadge({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const positive = percent >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
      style={{
        color: positive ? '#16a34a' : '#dc2626',
        backgroundColor: positive ? '#dcfce7' : '#fef2f2',
      }}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

export function VolumetriaKPIs({ kpis }: { kpis: VolumetriaKPIs }) {
  const totalAtendidos = kpis.totalAtendidos ?? kpis.atendidos ?? 0;
  const indiceAtendidos =
    kpis.totalAgendamentos > 0
      ? Math.round((totalAtendidos / kpis.totalAgendamentos) * 1000) / 10
      : 0;

  const cards = [
    {
      label: 'Agendamentos',
      value: kpis.totalAgendamentos ?? 0,
      icon: Calendar,
      color: BRAND.primary,
      bg: BRAND.primaryLight,
      trend: null as number | null,
    },
    {
      label: 'Atendimentos',
      value: totalAtendidos,
      icon: CalendarCheck,
      color: BRAND.accent,
      bg: BRAND.accentLight,
      trend: null as number | null,
    },
    {
      label: 'Índice Atendimento',
      value: indiceAtendidos,
      suffix: '%',
      icon: Percent,
      color: '#16a34a',
      bg: '#dcfce7',
      trend: null as number | null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border p-4"
          style={{ backgroundColor: card.bg, borderColor: `${card.color}30` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-lg border bg-white"
                style={{ borderColor: `${card.color}40` }}
              >
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600 block">
                  {card.label}
                </span>
                <div className="text-xl font-bold text-gray-900">
                  {card.suffix ? (
                    <CountUp
                      end={card.value}
                      duration={1.2}
                      decimals={1}
                      decimal=","
                      suffix={card.suffix}
                    />
                  ) : (
                    <CountUp end={card.value} duration={1.2} separator="." />
                  )}
                </div>
              </div>
            </div>
            <TrendBadge percent={card.trend} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
