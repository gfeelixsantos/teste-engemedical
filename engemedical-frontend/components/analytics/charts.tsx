"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from "recharts";
import {
  PieChart as PieChartIcon,
  Calendar,
  Car,
  User,
  Clock,
  ClipboardList
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface MonthlyData {
  month: string;
  compromissos: number;
}

export interface VehicleData {
  name: string;
  compromissos: number;
}

export interface EmployeeData {
  name: string;
  compromissos: number;
}

export interface PeakHourData {
  hour: string;
  compromissos: number;
}

export interface ProfessionalWorkloadEntry {
  name: string;
  [type: string]: string | number;
}

const TYPE_LABEL_MAP: Record<string, string> = {
  ASSESSORIA: "Assessoria",
  AVALIACAO_DE_CAMPO: "Aval. de Campo",
  COMERCIAL: "Comercial",
  IN_COMPANY: "In Company",
  LEVA_E_TRAS: "Leva e Trás",
  TREINAMENTO: "Treinamento",
  VISITA_TECNICA: "Visita Técnica",
  PERICIA: "Perícia",
  OUTRO: "Outro",
};

const TYPE_COLORS: Record<string, string> = {
  ASSESSORIA: "#9333ea",
  AVALIACAO_DE_CAMPO: "#0d9488",
  COMERCIAL: "#ea580c",
  IN_COMPANY: "#4f46e5",
  LEVA_E_TRAS: "#ec4899",
  TREINAMENTO: "#ca8a04",
  VISITA_TECNICA: "#2563eb",
  PERICIA: "#dc2626",
  OUTRO: "#6b7280",
};

// Custom chart-header style helper
function ChartHeader({ Icon, color, bg, title, subtitle }: { Icon: LucideIcon; color: string; bg: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

// Custom Recharts tooltip wrapper
function CustomTooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-md text-xs">
      {children}
    </div>
  );
}

export function DistributionByTypeChart({ data }: { data: ChartData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Map enum keys → display labels in the data
  const labeledData = data.map(item => ({
    ...item,
    name: TYPE_LABEL_MAP[item.name] || item.name,
  }));

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
        {payload.map((entry: any, index: number) => {
          const count = entry.payload.value;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={index} className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-semibold text-gray-800 truncate">{entry.value}</span>
                <span className="text-xs text-gray-500">({count} · {pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <ChartHeader Icon={PieChartIcon} color="text-blue-600" bg="bg-blue-50" title="Distribuição por Tipo" subtitle={`${total} compromissos no total`} />

      <div className="h-[450px] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={labeledData}
              cx="50%"
              cy="40%"
              innerRadius={50}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
            >
              {labeledData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#6b7280"} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pct = total > 0 ? Math.round(((payload[0].value as number) / total) * 100) : 0;
                  return (
                    <CustomTooltipBox>
                      <p className="font-semibold text-gray-900">{payload[0].name}</p>
                      <p className="text-gray-600">{payload[0].value} compromissos — <strong>{pct}%</strong></p>
                    </CustomTooltipBox>
                  );
                }
                return null;
              }}
            />
            <Legend content={renderCustomLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function VolumeByMonthChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <ChartHeader Icon={Calendar} color="text-green-600" bg="bg-green-50" title="Volume por Mês" subtitle="Últimos 6 meses" />

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <CustomTooltipBox>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="text-green-600 font-semibold">{payload[0].value} compromissos</p>
                    </CustomTooltipBox>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="compromissos" fill="#44735E" radius={[4, 4, 0, 0]} barSize={36}>
              <LabelList dataKey="compromissos" position="top" style={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ""} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CommitmentsByVehicleChart({ data }: { data: VehicleData[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <ChartHeader Icon={Car} color="text-purple-600" bg="bg-purple-50" title="Compromissos por Veículo" subtitle="Distribuição de uso da frota" />

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} width={110} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <CustomTooltipBox>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="text-purple-600 font-semibold">{payload[0].value} compromissos</p>
                    </CustomTooltipBox>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="compromissos" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={22}>
              <LabelList dataKey="compromissos" position="right" style={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TopEmployeesChart({ data }: { data: EmployeeData[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <ChartHeader Icon={User} color="text-amber-600" bg="bg-amber-50" title="Funcionários Mais Acionados" subtitle="Top 10 por participação" />

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#374151" }}
              width={90}
              tickFormatter={(value: string) => value.split(" ")[0]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <CustomTooltipBox>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="text-amber-600 font-semibold">{payload[0].value} participações</p>
                    </CustomTooltipBox>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="compromissos" fill="#D97706" radius={[0, 4, 4, 0]} barSize={22}>
              <LabelList dataKey="compromissos" position="right" style={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PeakHoursChart({ data }: { data: PeakHourData[] }) {
  const max = Math.max(...data.map(d => d.compromissos), 1);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <ChartHeader Icon={Clock} color="text-rose-600" bg="bg-rose-50" title="Horários de Pico" subtitle="Compromissos por faixa horária do dia" />

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <CustomTooltipBox>
                      <p className="font-semibold text-gray-900">Faixa {label}</p>
                      <p className="text-rose-600 font-semibold">{payload[0].value} compromissos</p>
                    </CustomTooltipBox>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="compromissos" radius={[4, 4, 0, 0]} barSize={28}>
              {data.map((entry, index) => {
                const intensity = max > 0 ? entry.compromissos / max : 0;
                const fill = intensity >= 0.8 ? "#dc2626" : intensity >= 0.5 ? "#ea580c" : intensity >= 0.25 ? "#ca8a04" : "#44735E";
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Intensidade:</span>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#44735E]" /><span className="text-xs text-gray-600">Baixa</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#ca8a04]" /><span className="text-xs text-gray-600">Moderada</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#ea580c]" /><span className="text-xs text-gray-600">Alta</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#dc2626]" /><span className="text-xs text-gray-600">Pico</span></div>
      </div>
    </div>
  );
}

export function ProfessionalWorkloadChart({ data, types }: { data: ProfessionalWorkloadEntry[]; types: string[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <ChartHeader Icon={ClipboardList} color="text-indigo-600" bg="bg-indigo-50" title="Carga por Profissional" subtitle="Participações por tipo de compromisso" />

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#374151" }}
              width={90}
              tickFormatter={(value: string) => value.split(" ")[0]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <CustomTooltipBox>
                      <p className="font-semibold text-gray-900 mb-1">{label}</p>
                      {payload.map((p: any, i: number) => (
                        <p key={i} style={{ color: p.fill }} className="font-medium">{TYPE_LABEL_MAP[p.dataKey] || p.dataKey}: {p.value}</p>
                      ))}
                    </CustomTooltipBox>
                  );
                }
                return null;
              }}
            />
            {types.map((type) => (
              <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[type] || "#6b7280"} barSize={22} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100">
        {types.map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || "#6b7280" }} />
            <span className="text-xs font-medium text-gray-700">{TYPE_LABEL_MAP[type] || type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
