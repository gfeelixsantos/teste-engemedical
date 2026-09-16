"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  UsersRound,
} from "lucide-react";

import { useEmpresas } from "@/components/cliente/EmpresaProvider";

type Activation = {
  status:
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "COMPLETED"
    | "BLOCKED";
  currentStep: "COMPANY" | "EMPLOYEES" | "APPOINTMENT" | "DOCUMENTS" | "REVIEW";
  completedSteps: string[];
  pendingItems: string[];
  progress: number;
};

type ActivationResponse = {
  company: {
    companyCode: string;
    companyName: string;
    cnpj: string;
    filialId: string;
  };
  activation: Activation;
};

const stepLabels: Record<string, string> = {
  COMPANY: "Dados da empresa",
  EMPLOYEES: "Pessoas e funcionários",
  APPOINTMENT: "Reunião de implantação",
  DOCUMENTS: "Documentos e autorizações",
  REVIEW: "Revisão e envio",
};

const statusLabels: Record<Activation["status"], string> = {
  NOT_STARTED: "Ainda não iniciada",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Enviada para análise",
  UNDER_REVIEW: "Em análise pela Engemedical",
  COMPLETED: "Ativação concluída",
  BLOCKED: "Precisa de atenção",
};

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 14) return value || "CNPJ não informado";

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export default function ClienteAtivacaoPage() {
  const { selectedEmpresa, isLoading: empresasLoading } = useEmpresas();
  const [data, setData] = useState<ActivationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const companyCode = selectedEmpresa?.CODIGO
      ? String(selectedEmpresa.CODIGO)
      : "";

    if (!companyCode) {
      setData(null);
      setLoading(false);

      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch(`/api/cliente/ativacao?empresa=${encodeURIComponent(companyCode)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));

        if (!response.ok)
          throw new Error(
            payload.message || "Não foi possível carregar a ativação.",
          );

        return payload as ActivationResponse;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar a ativação.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEmpresa?.CODIGO]);

  if (empresasLoading || loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-sm text-brand-700">
        Carregando sua Central de Ativação...
      </div>
    );
  }

  if (!selectedEmpresa) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
          <AlertCircle className="mb-3 h-6 w-6" />
          <h1 className="text-xl font-semibold">Selecione uma empresa</h1>
          <p className="mt-2 text-sm">
            Escolha uma empresa na navegação lateral para consultar sua
            ativação.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-900">
          <AlertCircle className="mb-3 h-6 w-6" />
          <h1 className="text-xl font-semibold">
            Não foi possível carregar a ativação
          </h1>
          <p className="mt-2 text-sm">
            {error || "Tente novamente em alguns instantes."}
          </p>
        </div>
      </div>
    );
  }

  const activation = data.activation;
  const steps = ["COMPANY", "EMPLOYEES", "APPOINTMENT", "DOCUMENTS", "REVIEW"];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,#E8F5ED_0%,#F8FBF9_35%,#F5F7F6_100%)] p-5 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              <ClipboardCheck className="h-3.5 w-3.5" /> Central de Ativação
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Ative sua empresa com tranquilidade
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Acompanhe as etapas de implantação e conclua apenas o que ainda
              precisa da sua atenção.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-500">Status atual</p>
            <p className="mt-1 text-sm font-semibold text-brand-800">
              {statusLabels[activation.status]}
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-brand-line bg-white p-6 shadow-[0_16px_45px_rgba(41,96,66,0.10)] sm:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                  Empresa ativa
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {data.company.companyName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCnpj(data.company.cnpj)}
                  {data.company.filialId
                    ? ` · Filial ${data.company.filialId}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-3xl font-semibold text-brand-700">
                {activation.progress}%
              </p>
              <p className="text-xs text-slate-500">concluído</p>
            </div>
          </div>
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-brand-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all"
              style={{ width: `${activation.progress}%` }}
            />
          </div>
        </section>

        <section id="activation-steps" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {steps.map((step, index) => {
            const complete = activation.completedSteps.includes(step);
            const current = activation.currentStep === step;

            return (
              <div
                key={step}
                className={`rounded-2xl border p-5 ${complete ? "border-emerald-200 bg-emerald-50/70" : current ? "border-brand-300 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    0{index + 1}
                  </span>
                  {complete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : current ? (
                    <Clock3 className="h-5 w-5 text-brand-600" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  )}
                </div>
                <p className="mt-6 text-sm font-semibold text-slate-800">
                  {stepLabels[step]}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {complete
                    ? "Concluído"
                    : current
                      ? "Próximo passo"
                      : "Pendente"}
                </p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-brand-line bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Próximo passo recomendado
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {activation.pendingItems[0]
                    ? stepLabels[activation.pendingItems[0]] ||
                      activation.pendingItems[0]
                    : "Sua ativação está em dia"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {activation.pendingItems.length
                    ? "Conclua esta pendência para liberar a próxima etapa da implantação."
                    : "Não há pendências para esta empresa no momento."}
                </p>
              </div>
            </div>
            <button
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
              onClick={() => document.getElementById("activation-steps")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              type="button"
            >
              Ver checklist <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-3xl border border-brand-line bg-brand-900 p-6 text-white shadow-sm sm:p-8">
            <UsersRound className="h-6 w-6 text-brand-200" />
            <h2 className="mt-5 text-lg font-semibold">Precisa de ajuda?</h2>
            <p className="mt-2 text-sm leading-6 text-brand-100">
              Nossa equipe acompanha sua ativação e poderá orientar cada etapa.
            </p>
            <button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-brand-300 underline-offset-4">
              Falar com a equipe <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
