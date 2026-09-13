'use client';

interface XmlPillsProps {
  selectedXml: string;
  onSelectXml: (layout: string) => void;
  counts?: Record<string, number>;
}

const XML_OPTIONS = [
  { id: 'S2210', label: 'S2210' },
  { id: 'S2220', label: 'S2220' },
  { id: 'S2230', label: 'S2230' },
  { id: 'S2240', label: 'S2240' },
  { id: 'Sem evento identificado', label: 'Sem evento identificado' },
];

export function XmlPillsFilter({ selectedXml, onSelectXml }: XmlPillsProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 text-center">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Registro XML
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onSelectXml('')}
          className={`px-6 py-2 rounded-full border text-xs font-semibold transition-all shadow-sm ${
            selectedXml === ''
              ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300'
              : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
          }`}
        >
          Todos os Registros
        </button>

        {XML_OPTIONS.map((opt) => {
          const isSelected = selectedXml === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectXml(isSelected ? '' : opt.id)}
              className={`px-8 py-2 rounded-full border text-xs font-semibold transition-all shadow-sm ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-300'
                  : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
