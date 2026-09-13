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
  page: "min-h-[320px] px-6 py-12",
  section: "min-h-[220px] px-6 py-10",
  action: "inline-flex min-h-5 min-w-5 items-center justify-center",
};

function BrandMark({ priority = false, size = 36 }: { priority?: boolean; size?: number }) {
  return (
    <Image
      priority={priority}
      alt=""
      className="relative object-contain"
      height={size}
      src="/images/icone.png"
      width={size}
    />
  );
}

function OrbitalRings() {
  return (
    <>
      <span
        aria-hidden="true"
        className="premium-orbit-1 absolute inset-0 rounded-full"
      />
      <span
        aria-hidden="true"
        className="premium-orbit-2 absolute inset-0 rounded-full"
      />
      <span
        aria-hidden="true"
        className="premium-orbit-3 absolute inset-0 rounded-full"
      />
    </>
  );
}

function ParticleDots() {
  return (
    <>
      <span aria-hidden="true" className="premium-particle premium-particle-1" />
      <span aria-hidden="true" className="premium-particle premium-particle-2" />
      <span aria-hidden="true" className="premium-particle premium-particle-3" />
      <span aria-hidden="true" className="premium-particle premium-particle-4" />
      <span aria-hidden="true" className="premium-particle premium-particle-5" />
      <span aria-hidden="true" className="premium-particle premium-particle-6" />
    </>
  );
}

function PremiumPageLoader({
  title,
  description,
  className = "",
}: Required<Pick<LoadingStateProps, "title" | "description">> &
  Pick<LoadingStateProps, "className">) {
  return (
    <div
      aria-label={title}
      aria-live="polite"
      className={`premium-loading-bg flex min-h-[320px] w-full items-center justify-center px-6 py-12 ${className}`}
      role="status"
    >
      <div className="flex w-full max-w-sm flex-col items-center px-8 py-9 text-center">
        <div className="premium-spinner-container relative grid h-28 w-28 place-items-center">
          <div className="premium-glow-orb absolute inset-0 rounded-full" />
          <OrbitalRings />
          <ParticleDots />
          <div className="premium-center-ring absolute inset-2 rounded-full" />
          <div className="premium-center-core relative z-10 grid h-16 w-16 place-items-center rounded-full bg-white shadow-lg shadow-brand-cyan/10">
            <BrandMark priority size={32} />
          </div>
        </div>
        <div className="mt-7">
          <h3 className="premium-title text-base font-bold tracking-tight text-brand-midnight">
            {title}
          </h3>
          {description && (
            <p className="premium-description mt-1.5 text-sm text-brand-muted">
              {description}
            </p>
          )}
        </div>
        <div className="premium-progress-track mt-6 h-1 w-36 overflow-hidden rounded-full bg-brand-cyan/8">
          <span className="premium-progress-fill block h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan" />
        </div>
      </div>
    </div>
  );
}

function PremiumSectionLoader({
  title,
  description,
  showBrand,
}: Required<Pick<LoadingStateProps, "title" | "description" | "showBrand">>) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      {showBrand && (
        <div className="premium-spinner-container relative mb-5 grid h-20 w-20 place-items-center">
          <div className="premium-glow-orb-sm absolute inset-0 rounded-full" />
          <span
            aria-hidden="true"
            className="premium-orbit-1 absolute inset-0 rounded-full"
          />
          <span
            aria-hidden="true"
            className="premium-orbit-2 absolute inset-0 rounded-full"
          />
          <ParticleDots />
          <div className="premium-center-ring absolute inset-1.5 rounded-full" />
          <div className="premium-center-core relative z-10 grid h-12 w-12 place-items-center rounded-full bg-white shadow-md shadow-brand-cyan/10">
            <BrandMark size={28} />
          </div>
        </div>
      )}
      <h3 className="premium-title loading-title text-base font-semibold">{title}</h3>
      {description && (
        <p className="premium-description loading-description mt-1 text-sm">
          {description}
        </p>
      )}
      <div className="premium-progress-track mt-5 h-1 w-28 overflow-hidden rounded-full bg-brand-cyan/8">
        <span className="premium-progress-fill block h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand-green to-brand-cyan" />
      </div>
    </div>
  );
}

function ActionSpinner() {
  return (
    <span
      aria-hidden="true"
      className="premium-action-spinner h-4 w-4 rounded-full"
    />
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
      <span
        aria-label={title}
        aria-live="polite"
        className={`inline-flex items-center gap-2 text-brand-cyan ${className}`}
        role="status"
      >
        <ActionSpinner />
        {description && <span className="sr-only">{description}</span>}
      </span>
    );
  }

  if (variant === "page") {
    return (
      <PremiumPageLoader
        className={className}
        description={description}
        title={title}
      />
    );
  }

  return (
    <div
      aria-label={title}
      aria-live="polite"
      className={`${variantClasses[variant]} flex items-center justify-center ${className}`}
      role="status"
    >
      <PremiumSectionLoader
        description={description}
        showBrand={showBrand}
        title={title}
      />
    </div>
  );
}
