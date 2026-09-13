"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Clock, Download, Search, ShieldCheck, UserMinus } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import AppLoading from "@/components/shared/AppLoading";

type Company = { CODIGO?: string | number; RAZAOSOCIAL?: string; NOMEABREVIADO?: string };
type Run = { _id?: string; id?: string; createdAt?: string; status?: string; totalEmpresasElegiveis?: number; totalFuncionariosPrevistos?: number; totalFuncionariosInativados?: number; erros?: unknown[]; reportFileName?: string | null };
const date = (value?: string) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function InativacaoMassaPage() {
  const router = useRouter();
  const [data, setData] = useState<{ companies: Company[]; runs: Run[] } | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/automacao/inativacao-massa").then(async r => {
    if (!r.ok) throw new Error("Não foi possível carregar a automação");
    return r.json();
  }).then((payload) => {
    const companiesPayload = Array.isArray(payload?.companies) ? payload.companies : payload?.companies?.companies ?? payload?.companies?.items ?? [];
    const runsPayload = Array.isArray(payload?.runs) ? payload.runs : payload?.runs?.runs ?? payload?.runs?.items ?? [];
    setData({ companies: Array.isArray(companiesPayload) ? companiesPayload : [], runs: Array.isArray(runsPayload) ? runsPayload : [] });
  }).catch(e => setError(e.message));

  useEffect(() => { load(); }, []);

  const companies = useMemo(() => (data?.companies ?? []).filter(c =>
    `${c.NOMEABREVIADO ?? c.RAZAOSOCIAL ?? ""} ${c.CODIGO ?? ""}`.toLowerCase().includes(query.toLowerCase())
  ), [data, query]);

  const latest = data?.runs?.[0];
  const toggle = (code: string) => setSelected(s => s.includes(code) ? s.filter(x => x !== code) : [...s, code]);

  const download = async (id: string) => {
    const r = await fetch("/api/automacao/inativacao-massa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "download-report", runId: id })
    });
    if (!r.ok) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob());
    a.download = "relatorio-inativacao.xlsx";
    a.click();
  };

  return (
    <AppShell onLogout={() => { localStorage.removeItem("user"); router.push("/login"); }}>
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        {!data && !error ? <AppLoading title="Carregando inativação" description="Preparando dados..." /> : (
          <>
            <div className="mb-4 flex items-center gap-2 text-sm text-brand-muted">
              <span>Automações</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold text-brand-midnight">Inativação em Massa</span>
            </div>
            <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-cyan">Controle operacional</p>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-midnight">Inativação em Massa</h1>
                <p className="mt-1 max-w-2xl text-sm text-brand-muted">Acompanhe o ciclo automatizado de inativação no SOC com segurança e rastreabilidade.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Cron ativo · dia 23 às 22:00
              </div>
            </section>
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-center text-sm text-red-700">
                {error}
                <button onClick={load} className="ml-3 font-bold underline">Tentar novamente</button>
              </div>
            ) : (
              <>
                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Metric icon={<Clock />} label="Última execução" value={date(latest?.createdAt)} />
                  <Metric icon={<ShieldCheck />} label="Empresas elegíveis" value={String(latest?.totalEmpresasElegiveis ?? 0)} />
                  <Metric icon={<UserMinus />} label="Funcionários inativados" value={String(latest?.totalFuncionariosInativados ?? 0)} />
                  <Metric icon={<Download />} label="Relatório" value={latest?.reportFileName ?? "Pendente"} />
                </div>
                <div className="rounded-2xl border border-brand-line bg-white shadow-sm">
                  <div className="border-b border-brand-line p-4">
                    <h2 className="font-display text-base font-bold text-brand-midnight">Empresas</h2>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-line bg-brand-surface px-3 py-2">
                      <Search className="h-4 w-4 text-brand-muted" />
                      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar empresa..." className="w-full bg-transparent text-xs outline-none" />
                    </div>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto">
                    {companies.map(c => {
                      const code = String(c.CODIGO ?? "");
                      const isSelected = selected.includes(code);
                      return (
                        <button key={code} onClick={() => toggle(code)} className={`flex w-full items-center gap-3 border-b border-brand-line px-4 py-3 text-left transition ${isSelected ? "bg-brand-cyan-50" : "hover:bg-brand-surface"}`}>
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${isSelected ? "bg-brand-cyan text-white" : "bg-brand-surface text-brand-muted"}`}>
                            {isSelected ? "✓" : code}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-brand-midnight">{c.NOMEABREVIADO ?? c.RAZAOSOCIAL}</p>
                            <p className="text-[11px] text-brand-muted">Código {code}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-cyan-50 text-brand-600">{icon}</div>
      <p className="text-xs font-semibold text-brand-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-brand-midnight">{value}</p>
    </div>
  );
}
