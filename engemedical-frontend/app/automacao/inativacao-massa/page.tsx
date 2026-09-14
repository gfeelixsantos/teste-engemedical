"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Loader2,
  Search,
  UserMinus,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import AppLoading from "@/components/shared/AppLoading";
import { AutomationPageHeader } from "@/components/shared/AutomationPageHeader";
import { PremiumFeedbackModal, type PremiumFeedbackVariant } from "@/components/shared/PremiumFeedbackModal";
type Company = {
  CODIGO?: string | number;
  RAZAOSOCIAL?: string;
  NOMEABREVIADO?: string;
  CNPJ?: string;
  CIDADE?: string;
  UF?: string;
};
type Run = {
  _id?: string;
  id?: string;
  createdAt?: string;
  status?: string;
  reportFileName?: string | null;
};
const companyName = (c: Company) =>
  c.NOMEABREVIADO || c.RAZAOSOCIAL || "Empresa sem nome";
const formatDate = (v?: string) =>
  v
    ? new Date(v).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
export default function InativacaoMassaPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ open: boolean; variant: PremiumFeedbackVariant; title: string; message: string; detail?: string; primaryLabel?: string; secondaryLabel?: string; onPrimaryAction?: () => void }>({ open: false, variant: "info", title: "", message: "" });
  useEffect(() => {
    fetch("/api/automacao/inativacao-massa")
      .then(async (r) => {
        if (!r.ok) throw new Error("Falha ao carregar a automação");
        return r.json();
      })
      .then((p) => {
        setCompanies(
          Array.isArray(p.companies)
            ? p.companies
            : (p.companies?.companies ?? []),
        );
        setRuns(
          Array.isArray(p.runs)
            ? p.runs
            : (p.runs?.runs ?? p.runs?.items ?? []),
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const visible = companies.filter((c) =>
    `${companyName(c)} ${c.CODIGO ?? ""} ${c.CNPJ ?? ""} ${c.CIDADE ?? ""} ${c.UF ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const toggle = (code: string) =>
    setSelected((s) =>
      s.includes(code) ? s.filter((x) => x !== code) : [...s, code],
    );
  const verify = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/automacao/inativacao-massa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", companyCodes: selected }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.message);
      setResults(p.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na verificação");
    } finally {
      setBusy(false);
    }
  };
  const execute = async () => {
    if (!selected.length) return;
    setFeedback({ open: true, variant: "warning", title: "Executar inativação no SOC?", message: "A execução real enviará chamadas SOAP ao SOC para as empresas selecionadas.", detail: "Essa ação altera os registros no SOC. Confirme somente após revisar a verificação.", primaryLabel: "Executar agora", secondaryLabel: "Voltar", onPrimaryAction: () => { setFeedback((f) => ({ ...f, open: false })); void executeConfirmed(); } });
  };
  const executeConfirmed = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/automacao/inativacao-massa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "execute", companyCodes: selected, dryRun: false }) });
      const p = await r.json(); if (!r.ok) throw new Error(p.message); setExecutionId(p.executionId ?? null); setFeedback({ open: true, variant: "success", title: "Processamento iniciado", message: "A inativação foi encaminhada para processamento.", detail: "Você pode acompanhar a execução nesta página e cancelá-la enquanto houver registros pendentes." });
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na execução"); } finally { setBusy(false); }
  };
  const cancel = async () => { if (!executionId) return; await fetch("/api/automacao/inativacao-massa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", executionId }) }); setExecutionId(null); setBusy(false); };
  const download = async (id: string) => {
    const r = await fetch("/api/automacao/inativacao-massa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "download-report", runId: id }),
    });
    if (!r.ok) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await r.blob());
    a.download = "relatorio-inativacao.xlsx";
    a.click();
  };
  return (
    <>
      <AppShell
      onLogout={() => {
        localStorage.removeItem("user");
        router.push("/");
      }}
    >
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <AppLoading
              title="Carregando inativação"
              description="Preparando empresas e histórico..."
            />
          ) : (
            <>
              <AutomationPageHeader
                icon={UserMinus}
                title="Inativação em Massa"
                subtitle="Selecione empresas, confira os dados e acompanhe os resultados."
              />
              <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Rotina automática ativa · dia 23 às 22:00
              </div>
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm">
                  <div className="border-b border-brand-line bg-brand-surface/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-display text-lg font-bold text-brand-midnight">
                          Empresas cadastradas
                        </h2>
                        <p className="text-xs text-brand-muted">
                          {selected.length} selecionada(s) · {visible.length}{" "}
                          encontrada(s)
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSelected(
                            visible.map((c) => String(c.CODIGO ?? "")),
                          )
                        }
                        className="text-xs font-bold text-brand-700"
                      >
                        Selecionar encontradas
                      </button>
                    </div>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-line bg-white px-3 py-2">
                      <Search className="h-4 w-4 text-brand-muted" />
                      <input
                        aria-label="Pesquisar empresas"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Razão social, CNPJ, cidade ou código da empresa"
                        className="w-full text-xs outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-[500px] overflow-auto">
                    {visible.map((c) => {
                      const code = String(c.CODIGO ?? "");
                      return (
                        <label
                          key={code}
                          className="flex cursor-pointer items-center gap-3 border-b border-brand-line p-4 hover:bg-brand-surface"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(code)}
                            onChange={() => toggle(code)}
                          />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-sm text-brand-midnight">
                              {companyName(c)}
                            </b>
                            <span className="text-xs text-brand-muted">
                              {c.CNPJ || "CNPJ não informado"} · Código {code}
                            </span>
                          </span>
                          <span className="text-xs text-brand-muted">
                            {[c.CIDADE, c.UF].filter(Boolean).join(" / ")}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
                <section className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-brand-line bg-brand-surface/60 p-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-brand-midnight">
                        Empresas selecionadas
                      </h2>
                      <p className="text-xs text-brand-muted">
                        A verificação é uma simulação e não altera os dados.
                      </p>
                    </div>
                    <button
                      disabled={!selected.length || busy}
                      onClick={verify}
                      className="rounded-xl bg-brand-cyan px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
                          Verificando
                        </>
                      ) : (
                        "Verificar"
                      )}
                    </button>
                    <button
                      disabled={!selected.length || busy}
                      onClick={execute}
                      className="ml-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 disabled:opacity-40"
                    >
                      Executar inativação
                    </button>
                    {executionId && <button onClick={cancel} className="ml-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700">Cancelar processamento</button>}
                  </div>
                  {selected.length ? (
                    selected.map((code) => {
                      const r = results.find((x) => x.companyCode === code);
                      return (
                        <div
                          key={code}
                          className="flex items-center gap-3 border-b border-brand-line p-4"
                        >
                          <UserMinus className="h-4 w-4 text-brand-600" />
                          <div className="flex-1">
                            <b className="block text-sm text-brand-midnight">
                              Código {code}
                            </b>
                            <span className="text-xs text-brand-muted">
                              {r
                                ? `Verificado · ${r.details?.totalFuncionariosEncontrados ?? 0} colaborador(es)`
                                : "Aguardando verificação"}
                            </span>
                          </div>
                          <button
                            onClick={() => toggle(code)}
                            className="text-xs text-red-600"
                          >
                            Remover
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-sm text-brand-muted">
                      Nenhuma empresa selecionada.
                    </div>
                  )}
                </section>
              </div>
              <section className="mt-5 overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm">
                <div className="border-b border-brand-line p-4">
                  <h2 className="font-display text-lg font-bold text-brand-midnight">
                    Relatórios e histórico
                  </h2>
                  <p className="text-xs text-brand-muted">
                    Histórico das verificações automáticas.
                  </p>
                </div>
                {runs.length ? (
                  runs.map((r, i) => {
                    const id = String(r._id ?? r.id ?? "");
                    return (
                      <div
                        key={id || i}
                        className="flex items-center gap-3 border-b border-brand-line p-4"
                      >
                        <div className="flex-1">
                          <b className="block text-sm text-brand-midnight">
                            Verificação de {formatDate(r.createdAt)}
                          </b>
                          <span className="text-xs text-brand-muted">
                            {r.status ?? "—"}
                          </span>
                        </div>
                        <button
                          disabled={!r.reportFileName}
                          onClick={() => download(id)}
                          className="rounded-lg p-2 text-brand-600 disabled:opacity-30"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="p-8 text-center text-sm text-brand-muted">
                    Nenhuma verificação registrada.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
      </AppShell>
      <PremiumFeedbackModal
        isOpen={feedback.open}
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
        detail={feedback.detail}
        primaryLabel={feedback.primaryLabel}
        secondaryLabel={feedback.secondaryLabel}
        onPrimaryAction={feedback.onPrimaryAction}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
      />
    </>
  );
}
