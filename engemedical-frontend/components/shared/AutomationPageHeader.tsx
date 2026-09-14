import type { LucideIcon } from "lucide-react";

type AutomationPageHeaderProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  eyebrow?: string;
};

export function AutomationPageHeader({
  title,
  subtitle,
  icon: Icon,
  eyebrow = "Automações",
}: AutomationPageHeaderProps) {
  return (
    <header className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
        {eyebrow}
      </p>
      <div className="mt-1 flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className="mt-1 h-7 w-7 shrink-0 text-[#00A63C]"
          strokeWidth={3}
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-brand-700 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
