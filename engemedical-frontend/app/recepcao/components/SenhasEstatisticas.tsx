import { Tooltip } from "@heroui/react";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  FilePlus,
  Pause,
  Users,
  X,
  BarChart3,
  Eye,
} from "lucide-react";

import { Ticket } from "@/lib/ticket/ticket";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { PreparationRequest } from "@/lib/ticket/ticket";
import { StatisticsSection } from "@/app/dashboard/components/StatisticsSection";

// Componente de botão de grupo para estatísticas - Compacto para header
const StatButton: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}> = ({ icon, value, label, color, onClick, ...rest }) => (
  <button
    aria-label={label}
    className="flex gap-2 items-center justify-center p-2 rounded-lg transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#104e35] min-w-[50px] cursor-pointer"
    onClick={onClick}
    type="button"
    {...rest}
  >
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 ${color}`}
    >
      {icon}
    </div>
    <span className="text-lg font-bold text-gray-900">{value}</span>
    <span className="text-xs text-gray-600 text-center leading-tight mt-1">
      {label}
    </span>
  </button>
);

// Componente de modal de estatísticas em tela cheia refatorado
export const StatsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  estatisticasSenhas: Record<string, number>;
  tickets: Ticket[];
  agendamentos: Scheduling[];
  preparationRequests: PreparationRequest[];
}> = ({
  isOpen,
  onClose,
  estatisticasSenhas,
  tickets,
  agendamentos,
  preparationRequests,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full h-full max-h-screen overflow-hidden flex flex-col max-w-6xl border border-[#44735e]/15">
              {/* Cabeçalho do modal */}
              <div className="p-4 border-b border-[#44735e]/15 flex justify-between items-center bg-[#f5f9f7]">
                <div>
                  <h2 className="text-xl font-bold text-[#2a4a3a]">
                    Estatísticas de Atendimentos
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Visão geral do desempenho
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Fechar"
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#104e35]"
                    onClick={onClose}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Conteúdo do modal */}
              <div className="flex-1 overflow-y-auto p-4">
                <StatisticsSection />
              </div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

type StatsContext = "recepcao" | "atendimento";

interface CardConfig {
  key: string;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
  color: string;
}

const RECEPCAO_CARDS: CardConfig[] = [
  { key: "aguardando", label: "Aguardando", tooltip: "Aguardando atendimento", icon: <Clock size={12} />, color: "bg-amber-100 text-amber-600" },
  { key: "preparacao", label: "Preparo", tooltip: "Em preparação da documentação", icon: <Pause size={12} />, color: "bg-blue-100 text-blue-600" },
  { key: "raiox", label: "Raio-X", tooltip: "Encaminhados para Raio-X", icon: <Eye size={12} />, color: "bg-purple-100 text-purple-600" },
  { key: "total", label: "Totais", tooltip: "Total de senhas", icon: <Users size={12} />, color: "bg-gradient-to-r from-[#104e35] to-[#a6ce39] text-white" },
];

const ATENDIMENTO_CARDS: CardConfig[] = [
  { key: "pendentes", label: "Aguardando", tooltip: "Aguardando atendimento", icon: <Clock size={12} />, color: "bg-amber-100 text-amber-600" },
  { key: "finalizados", label: "Finalizados", tooltip: "Atendidos", icon: <CheckCircle size={12} />, color: "bg-green-100 text-green-600" },
  { key: "aguardandoRecepcao", label: "Recepção", tooltip: "Senhas aguardando atendimento na recepção", icon: <FilePlus size={12} />, color: "bg-red-100 text-red-600" },
  { key: "total", label: "Total", tooltip: "Total de atendidos (aguardando + finalizados)", icon: <Users size={12} />, color: "bg-gradient-to-r from-[#104e35] to-[#a6ce39] text-white" },
];

export interface SenhasEstatisticasProps {
  context: StatsContext;
  estatisticasSenhas: Record<string, number>;
  onSetStatsModalOpen: (status: boolean) => void;
}

export default function SenhasEstatisticas({
  context,
  estatisticasSenhas,
  onSetStatsModalOpen,
}: SenhasEstatisticasProps) {
  const cards = context === "recepcao" ? RECEPCAO_CARDS : ATENDIMENTO_CARDS;

  return (
    <>
      <div className="hidden lg:flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
        {cards.map((card) => (
          <Tooltip key={card.key} content={card.tooltip} color="foreground" placement="bottom" showArrow={true} closeDelay={0}>
            <StatButton
              color={card.color}
              icon={card.icon}
              label={card.label}
              value={estatisticasSenhas[card.key] ?? 0}
              onClick={() => onSetStatsModalOpen(true)}
            />
          </Tooltip>
        ))}
      </div>

      <div className="lg:hidden">
        <button
          aria-label="Ver estatísticas"
          className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#104e35]"
          onClick={() => onSetStatsModalOpen(true)}
        >
          <BarChart3 className="text-[#104e35]" size={16} />
        </button>
      </div>
    </>
  );
}
