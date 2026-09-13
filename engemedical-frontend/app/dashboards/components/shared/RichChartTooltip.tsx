'use client';

import React from 'react';

interface RichTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  dataKey?: string;
  payload?: any;
}

interface RichChartTooltipProps {
  active?: boolean;
  payload?: RichTooltipPayloadItem[];
  label?: string;
  totalSum?: number;
  unit?: string;
  valueFormatter?: (val: number) => string;
}

export function RichChartTooltip({
  active,
  payload,
  label,
  totalSum,
  unit = '',
  valueFormatter,
}: RichChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const title = label || payload[0]?.name || payload[0]?.payload?.name || '';
  
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs min-w-[180px] z-50 transition-all duration-150">
      {title && (
        <div className="font-semibold text-slate-200 pb-2 mb-2 border-b border-slate-800 flex items-center justify-between gap-2">
          <span className="truncate max-w-[140px]">{title}</span>
        </div>
      )}

      <div className="space-y-1.5">
        {payload.map((item, idx) => {
          const rawVal = typeof item.value === 'number' ? item.value : parseFloat(String(item.value || 0));
          const formattedVal = valueFormatter ? valueFormatter(rawVal) : `${rawVal.toLocaleString('pt-BR')} ${unit}`.trim();
          const itemColor = item.color || item.fill || '#28B1CF';
          
          let percentage = 0;
          if (totalSum && totalSum > 0 && !isNaN(rawVal)) {
            percentage = Math.round((rawVal / totalSum) * 1000) / 10;
          }

          return (
            <div key={idx} className="flex items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: itemColor }}
                />
                <span className="text-slate-400 font-medium truncate">{item.name || item.dataKey}:</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-white">{formattedVal}</span>
                {percentage > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                    {percentage}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
