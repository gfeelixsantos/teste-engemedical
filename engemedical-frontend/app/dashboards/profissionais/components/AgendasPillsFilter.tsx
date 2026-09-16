'use client';

interface Props {
  agendas: string[];
  selectedAgenda: string;
  onSelectAgenda: (agenda: string) => void;
  statusFilter: string;
  onChangeStatus: (status: string) => void;
}

const DEFAULT_AGENDAS = [
  'AMANDA KELLY GOMES LUCIO',
  'ANA CRISTINA DO CARMO SILVA',
  'ELISA MARIA DUARTE LOURENCO',
  'ESTAGIARIO 3C SERVICOS',
  'IZABELLA FIGUEIREDO LOPES DIAS',
  'NAYARA MARIANNE LOPES OSORIO',
  'ROSELI PEREIRA DA SILVA',
];

export function AgendasPillsFilter({
  agendas,
  selectedAgenda,
  onSelectAgenda,
  statusFilter,
  onChangeStatus,
}: Props) {
  const lista = (agendas && agendas.length > 0) ? agendas : DEFAULT_AGENDAS;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-md mb-4 space-y-3">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        Agendas / Profissionais
      </div>

      {/* Pills Horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => onSelectAgenda('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
            selectedAgenda === ''
              ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
              : 'bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100'
          }`}
        >
          Todas
        </button>
        {lista.map((ag) => (
          <button
            key={ag}
            onClick={() => onSelectAgenda(selectedAgenda === ag ? '' : ag)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedAgenda === ag
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                : 'bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100'
            }`}
          >
            {ag}
          </button>
        ))}
      </div>

      {/* Dropdown Status da Situação */}
      <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
        <label className="text-xs font-bold text-gray-600 uppercase">Status da Situação:</label>
        <select
          value={statusFilter}
          onChange={(e) => onChangeStatus(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
        >
          <option value="Todos">Todos</option>
          <option value="Aguardando Atendimento">Aguardando Atendimento</option>
          <option value="Não Atendido">Não Atendido</option>
          <option value="Atendido">Atendido</option>
        </select>
      </div>
    </div>
  );
}
