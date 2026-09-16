const normalizeStatus = (status?: string) =>
  (status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/** Shared status palette for dashboard tables and interactive status labels. */
export function getDashboardStatusTextClass(status?: string): string {
  switch (normalizeStatus(status)) {
    case 'ativo':
      return 'text-emerald-600 hover:text-emerald-700';
    case 'inativo':
      return 'text-rose-600 hover:text-rose-700';
    case 'pendente':
      return 'text-amber-600 hover:text-amber-700';
    case 'ferias':
      return 'text-cyan-600 hover:text-cyan-700';
    case 'afastado':
    case 'afastados':
      return 'text-gray-600 hover:text-gray-800';
    default:
      return 'text-slate-600 hover:text-slate-800';
  }
}

export function getDashboardStatusRowHoverClass(status?: string): string {
  switch (normalizeStatus(status)) {
    case 'ativo':
      return 'hover:bg-emerald-50';
    case 'inativo':
      return 'hover:bg-rose-50';
    case 'pendente':
      return 'hover:bg-amber-50';
    case 'ferias':
      return 'hover:bg-cyan-50';
    case 'afastado':
    case 'afastados':
      return 'hover:bg-gray-50';
    default:
      return 'hover:bg-slate-50';
  }
}

export function getExamStatusTextClass(status?: string): string {
  switch (normalizeStatus(status)) {
    case 'em dia':
      return 'text-emerald-700';
    case 'a vencer':
      return 'text-amber-700';
    case 'vencido':
      return 'text-orange-700';
    case 'nunca realizado':
      return 'text-sky-700';
    case 'sem data de resultado':
      return 'text-slate-600';
    default:
      return 'text-slate-700';
  }
}

export function getExamStatusRowHoverClass(status?: string): string {
  switch (normalizeStatus(status)) {
    case 'em dia':
      return 'hover:bg-emerald-50';
    case 'a vencer':
      return 'hover:bg-amber-50';
    case 'vencido':
      return 'hover:bg-orange-50';
    case 'nunca realizado':
      return 'hover:bg-sky-50';
    case 'sem data de resultado':
      return 'hover:bg-slate-50';
    default:
      return 'hover:bg-slate-50';
  }
}

export function getContractValidityTextClass(status?: string): string {
  switch (normalizeStatus(status)) {
    case 'vigente':
      return 'text-emerald-700';
    case 'avencer':
    case 'a vencer':
      return 'text-amber-700';
    case 'vencido':
      return 'text-red-700';
    default:
      return 'text-slate-700';
  }
}

export function getContractValidityRowHoverClass(status?: string): string {
  switch (normalizeStatus(status)) {
    case 'vigente':
      return 'hover:bg-emerald-50';
    case 'avencer':
    case 'a vencer':
      return 'hover:bg-amber-50';
    case 'vencido':
      return 'hover:bg-red-50';
    default:
      return 'hover:bg-slate-50';
  }
}
