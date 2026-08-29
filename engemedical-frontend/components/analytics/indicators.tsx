"use client";

import { Calendar, Clock, TrendingUp, Users, Truck, Activity, CheckCircle, AlertCircle, XCircle, Clock as ClockIcon } from "lucide-react";
import { format, isToday, isTomorrow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Event {
  id: string;
  title: string;
  type: string;
  company?: string;
  participants?: string[];
  vehicle?: string;
  start: Date;
  end: Date;
}

export interface IndicatorCardProps {
  title: string;
  value: string | React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: "success" | "warning" | "error" | "info";
  className?: string;
}

export function IndicatorCard({ title, value, subtitle, icon, status = "info", className = "" }: IndicatorCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200 text-green-900";
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-900";
      case "error":
        return "bg-red-50 border-red-200 text-red-900";
      case "info":
      default:
        return "bg-blue-50 border-blue-200 text-blue-900";
    }
  };

  const getIconColor = () => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "warning":
        return "text-amber-600";
      case "error":
        return "text-red-600";
      case "info":
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${getStatusColor()} p-6 hover:shadow-md transition-all ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium uppercase tracking-wider">{title}</h3>
        {icon && <div className={`p-2 rounded-lg bg-white ${getIconColor()}`}>{icon}</div>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className="text-sm mt-2 opacity-80">{subtitle}</div>
      )}
    </div>
  );
}

export function calculateFleetUtilization(events: Event[], vehicles: string[]): {
  totalVehicles: number;
  occupiedToday: number;
  utilizationRate: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const occupiedToday = events.filter(event => 
    isToday(event.start) && event.start <= endOfToday
  ).length;

  return {
    totalVehicles: vehicles.length,
    occupiedToday,
    utilizationRate: vehicles.length > 0 ? Math.round((occupiedToday / vehicles.length) * 100) : 0
  };
}

export function findMostDemandedVehicle(events: Event[]): { name: string; count: number } {
  const vehicleCounts = events.reduce((acc, event) => {
    if (event.vehicle) {
      acc[event.vehicle] = (acc[event.vehicle] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(vehicleCounts).sort(([, a], [, b]) => b - a);
  const [name, count] = sorted[0] || ["Nenhum", 0];
  
  const vehicleLabelMap: Record<string, string> = {
    UNIDADE_MOVEL: "Unidade Móvel",
    UNIDADE_RAIO_X: "Unidade Raio-X",
    DOBLO_I: "Doblô I",
    DOBLO_II: "Doblô II",
    UP: "Up",
    PICKUP: "Pickup",
    MOBI: "Mobi"
  };

  return {
    name: vehicleLabelMap[name] || name.replace(/_/g, " "),
    count
  };
}

export function findMostDemandedEmployee(events: Event[]): { name: string; count: number } {
  const employeeCounts = events.reduce((acc, event) => {
    if (event.participants && event.participants.length > 0) {
      event.participants.forEach(participant => {
        acc[participant] = (acc[participant] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(employeeCounts).sort(([, a], [, b]) => b - a);
  const [name, count] = sorted[0] || ["Nenhum", 0];

  return { name, count };
}

export function getNextEvents(events: Event[], limit: number = 5): Event[] {
  const now = new Date();
  return events
    .filter(event => event.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit);
}

export function IndicatorsPanel({ 
  events, 
  vehicles, 
  getFormattedDate, 
  getStatusBadge, 
  isMobile = false 
}: {
  events: Event[];
  vehicles: { id: string; title: string }[];
  getFormattedDate: (date: Date) => string;
  getStatusBadge: (event: Event, now: Date) => React.ReactNode;
  isMobile?: boolean;
}) {
  const fleetInfo = calculateFleetUtilization(events, vehicles.map(v => v.id));
  const mostDemandedVehicle = findMostDemandedVehicle(events);
  const mostDemandedEmployee = findMostDemandedEmployee(events);
  const nextEvents = getNextEvents(events);

  const getStatusColor = (rate: number) => {
    if (rate >= 80) return "error";
    if (rate >= 60) return "warning";
    return "success";
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 80) return <XCircle className="h-4 w-4" />;
    if (rate >= 60) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getUtilizationSubtitle = () => {
    if (fleetInfo.utilizationRate === 0) return "Todos os veículos disponíveis";
    return `${fleetInfo.occupiedToday} de ${fleetInfo.totalVehicles} veículos em uso`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <IndicatorCard
        title="Taxa de Utilização da Frota"
        value={`${fleetInfo.utilizationRate}%`}
        subtitle={getUtilizationSubtitle()}
        icon={getStatusIcon(fleetInfo.utilizationRate)}
        status={getStatusColor(fleetInfo.utilizationRate)}
        className="col-span-1"
      />
      
      <IndicatorCard
        title="Veículo Mais Demandado"
        value={mostDemandedVehicle.name}
        subtitle={`${mostDemandedVehicle.count} compromissos agendados`}
        icon={<Truck className="h-4 w-4" />}
        status="info"
        className="col-span-1"
      />
      
      <IndicatorCard
        title="Funcionário Mais Acionado"
        value={mostDemandedEmployee.name}
        subtitle={`${mostDemandedEmployee.count} compromissos registrados`}
        icon={<Users className="h-4 w-4" />}
        status="info"
        className="col-span-1"
      />
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 col-span-1 md:col-span-2 lg:col-span-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <ClockIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Próximos 5 Compromissos</h3>
            <p className="text-sm text-gray-600">Próximos eventos agendados</p>
          </div>
        </div>
        
        {nextEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum compromisso futuro agendado</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {nextEvents.map((event) => {
              const now = new Date();
              const isToday = event.start.toDateString() === now.toDateString();
              const isTomorrow = event.start.toDateString() === addDays(now, 1).toDateString();
              
              return (
                <div key={event.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isToday && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">HOJE</span>
                      )}
                      {isTomorrow && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">AMANHÃ</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {getFormattedDate(event.start)}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-gray-900 truncate" title={event.title}>{event.title}</div>
                  <div className="text-xs text-gray-600 mt-1 truncate" title={event.vehicle || "N/A"}>{event.vehicle || "N/A"}</div>
                  <div className="text-xs text-gray-500 mt-1 truncate" title={event.participants?.join(", ") || "N/A"}>
                    {event.participants?.join(", ") || "N/A"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getFormattedDate(event.start)} às {format(event.start, "HH:mm")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
