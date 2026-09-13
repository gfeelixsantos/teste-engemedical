'use client';

import React from 'react';

/**
 * Componente que injeta definições SVG de degradês e sombras de alto padrão
 * para uso nos gráficos do Recharts em toda a aplicação.
 */
export function ChartGradients() {
  return (
    <svg style={{ height: 0, width: 0, position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* Teal Gradient (Cor Primária Engemedical) */}
        <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#28B1CF" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#28B1CF" stopOpacity={0.2} />
        </linearGradient>

        {/* Cyan Gradient (Cor Secundária Engemedical) */}
        <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#086b94" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#086b94" stopOpacity={0.2} />
        </linearGradient>

        {/* Emerald Gradient (Verde Sucesso) */}
        <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
        </linearGradient>

        {/* Amber Gradient (Alerta) */}
        <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2} />
        </linearGradient>

        {/* Indigo Gradient (Destaque) */}
        <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
        </linearGradient>

        {/* Rose Gradient (Erro/Atenção) */}
        <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.2} />
        </linearGradient>

        {/* Efeito Glow FX para Hover em Elementos */}
        <filter id="glowTeal" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
