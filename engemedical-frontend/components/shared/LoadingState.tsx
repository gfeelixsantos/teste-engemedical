"use client";

import Image from "next/image";

export type LoadingVariant = "page" | "section" | "action";

interface LoadingStateProps {
  variant?: LoadingVariant;
  title?: string;
  description?: string;
  className?: string;
  showBrand?: boolean;
}

const variantClasses: Record<LoadingVariant, string> = {
  page: "min-h-screen px-6 py-12",
  section: "min-h-[220px] rounded-2xl bg-white px-6 py-10",
  action: "inline-flex min-h-5 min-w-5 items-center justify-center",
};

function BrandMark({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      priority={priority}
      alt=""
      className="relative h-9 w-9 object-contain"
      height={36}
      src="/images/icone.png"
      width={36}
    />
  );
}

function PageLoading({ title, description }: Required<Pick<LoadingStateProps, "title" | "description">>) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#03121f] px-6 py-12 text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(6,152,194,0.24),transparent_30%),radial-gradient(circle_at_82%_76%,rgba(166,206,57,0.16),transparent_28%),linear-gradient(135deg,#03121f_0%,#052439_55%,#071c1a_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:68px_68px]" />

      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/15 bg-white/[0.08] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl motion-reduce:transition-none sm:p-10">
        <div className="relative mx-auto mb-7 grid h-28 w-28 place-items-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-brand-cyan/35 motion-safe:animate-[spin_8s_linear_infinite] motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-3 rounded-full border border-dashed border-brand-lime/30 motion-safe:animate-[spin_6s_linear_infinite_reverse] motion-reduce:animate-none" />
          <span aria-hidden="true" className="absolute inset-7 rounded-full bg-brand-cyan/10 blur-xl motion-safe:animate-pulse motion-reduce:animate-none" />
          <BrandMark priority />
        </div>

        <Image
          priority
          alt="Engemedical Brasil"
          className="mx-auto mb-6 h-auto w-[min(74vw,250px)] object-contain opacity-95"
          height={110}
          src="/images/logo.png"
          width={250}
        />
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-brand-lime">Ambiente corporativo</p>
        <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
        {description && <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>}

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10" role="presentation">
          <span aria-hidden="true" className="block h-full w-2/5 rounded-full bg-gradient-to-r from-brand-cyan via-brand-green to-brand-lime motion-safe:animate-[loading-progress_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

function SectionLoading({ title, description, showBrand }: Required<Pick<LoadingStateProps, "title" | "description" | "showBrand">>) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      {showBrand && (
        <div className="relative mb-5 flex h-14 w-14 items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-brand-cyan/20 border-t-brand-cyan border-r-brand-lime motion-safe:animate-spin motion-reduce:animate-none" />
          <BrandMark />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <span aria-hidden="true" className="mt-5 h-1 w-28 overflow-hidden rounded-full bg-brand-cyan/10">
        <span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-brand-cyan to-brand-lime motion-safe:animate-shimmer motion-reduce:animate-none" />
      </span>
    </div>
  );
}

export default function LoadingState({
  variant = "section",
  title = "Carregando",
  description = "Aguarde um momento...",
  className = "",
  showBrand = variant !== "action",
}: LoadingStateProps) {
  if (variant === "action") {
    return (
      <span aria-label={title} aria-live="polite" className={`inline-flex items-center gap-2 text-brand-cyan ${className}`} role="status">
        <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-brand-cyan/25 border-t-brand-cyan motion-safe:animate-spin motion-reduce:animate-none" />
        {description && <span className="sr-only">{description}</span>}
      </span>
    );
  }

  if (variant === "page") {
    return <PageLoading description={description} title={title} />;
  }

  return (
    <div aria-label={title} aria-live="polite" className={`${variantClasses[variant]} flex items-center justify-center ${className}`} role="status">
      <SectionLoading description={description} showBrand={showBrand} title={title} />
    </div>
  );
}
