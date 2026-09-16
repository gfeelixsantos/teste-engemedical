import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type DashboardPageHeaderProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
};

export function DashboardPageHeader({
  title,
  subtitle,
  icon: Icon,
  eyebrow = 'Dashboards',
  backHref = '/dashboards',
  backLabel = 'Voltar',
  onRefresh,
  isRefreshing = false,
}: DashboardPageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="group inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          <span className="hidden sm:inline">{backLabel}</span>
          <span className="sm:hidden">{backLabel}</span>
        </Link>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
            {eyebrow}
          </p>
          <div className="mt-1 flex items-center justify-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-brand-700 sm:text-4xl">{title}</h1>
            <Icon aria-hidden="true" className="h-7 w-7 shrink-0 text-[#00A63C] sm:h-8 sm:w-8" strokeWidth={3} />
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isRefreshing}
            aria-label="Atualizar dados"
            title="Atualizar dados"
            className="group relative shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-brand-700 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : 'transition-transform group-hover:rotate-180'}`} />
            <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-max rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 translate-y-1">
              Atualizar dados
            </span>
          </button>
        ) : (
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
