"use client";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  Search,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useRouter } from "next/navigation";

type Employee = { id: string; name: string; cpf: string; unit: string };
type Document = {
  id: string;
  name: string;
  type: string;
  date: string | null;
  status: "MATCHED" | "PENDING";
  employee?: Employee;
};
type Analysis = {
  id: string;
  fileName: string;
  size: number;
  employees: Employee[];
  documents: Document[];
  summary: { files: number; employees: number; pending: number };
};
const PAGE_SIZE = 25;

export default function ImportacaoHistoricoPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [query, setQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [mode, setMode] = useState("todos");
  const [unitFilter, setUnitFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [employeePage, setEmployeePage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const employees = useMemo(
    () =>
      (analysis?.employees ?? []).filter((e) =>
        `${e.name} ${e.unit} ${e.cpf}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [analysis, query],
  );
  const documents = useMemo(
    () =>
      (analysis?.documents ?? []).filter(
        (d) => {
          const text = `${d.name} ${d.employee?.name ?? ""} ${d.employee?.cpf ?? ""} ${d.employee?.unit ?? ""}`.toLowerCase();
          const type = d.type.toLowerCase();
          const unit = d.employee?.unit ?? "";
          const isAso = type.includes("aso");
          const isEmployee = Boolean(d.employee);
          const isUnit = !d.employee;
          return (!employeeId || d.employee?.id === employeeId) &&
            (!docQuery || text.includes(docQuery.toLowerCase())) &&
            (!mode || mode === "todos" || (mode === "aso" && isAso) || (mode === "funcionario" && isEmployee) || (mode === "unidade" && isUnit) || (mode === "pendencias" && d.status === "PENDING")) &&
            (!unitFilter || unit === unitFilter) &&
            (!typeFilter || d.type === typeFilter) &&
            (!statusFilter || (statusFilter === "pronto" && d.status === "MATCHED") || (statusFilter === "pendente" && d.status === "PENDING"));
        },
      ),
    [analysis, employeeId, docQuery, mode, unitFilter, typeFilter, statusFilter],
  );
  const units = useMemo(() => [...new Set((analysis?.employees ?? []).map((item) => item.unit).filter(Boolean))], [analysis]);
  const types = useMemo(() => [...new Set((analysis?.documents ?? []).map((item) => item.type).filter(Boolean))], [analysis]);
  const pages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  const visible = documents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const employeePages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const visibleEmployees = employees.slice((employeePage - 1) * PAGE_SIZE, employeePage * PAGE_SIZE);
  const analyze = async (file: File) => {
    setError(null);
    setMessage(null);
    if (!/\.(rar|zip)$/i.test(file.name))
      return setError("Selecione um pacote RAR ou ZIP.");
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/automacao/importacao-historico", {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.message ?? "Não foi possível analisar o pacote.",
        );
      setAnalysis({ ...payload, fileName: file.name });
      setPage(1); setEmployeePage(1); setMode("todos"); setUnitFilter(""); setTypeFilter(""); setStatusFilter("");
      setSelected([]);
      setMessage("Análise concluída. Revise os documentos antes de confirmar.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao analisar o pacote.",
      );
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!analysis || !employeeId || !selected.length)
      return setError("Selecione um colaborador e documentos pareados.");
    const body = new FormData();
    body.append("action", "confirm");
    body.append("id", analysis.id);
    body.append("employeeId", employeeId);
    body.append("documentIds", JSON.stringify(selected));
    setBusy(true);
    try {
      const response = await fetch("/api/automacao/importacao-historico", {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message ?? "Não foi possível confirmar.");
      setMessage("Lote controlado preparado para envio ao SOC.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao confirmar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell
      onLogout={() => {
        localStorage.removeItem("user");
        router.push("/login");
      }}
    >
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-center gap-2 text-sm text-brand-muted">
              <span>Automações</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold text-brand-midnight">
                Importação de Histórico
              </span>
            </div>
            <header className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-cyan">
                  Dados do SOC
                </p>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-midnight sm:text-4xl">
                  Importação de Histórico
                </h1>
                <p className="mt-1 text-sm text-brand-muted">
                  Revise os documentos identificados e confirme as pendências
                  para concluir a importação.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-white px-3 py-2 text-xs font-semibold text-brand-700">
                <ShieldCheck className="h-4 w-4 text-brand-cyan" /> Dados
                protegidos
              </div>
            </header>
    {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
    )}
    {busy && (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-cyan/30 bg-brand-cyan-50 px-4 py-3 text-sm font-semibold text-brand-800" role="status" aria-live="polite">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-cyan/30 border-t-brand-cyan" />
        {analysis ? "Preparando a confirmação do lote…" : "Arquivo recebido. Lendo o pacote e analisando os catálogos…"}
      </div>
    )}
            {message && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {message}
              </div>
            )}
            <section className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-brand-line bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-cyan-50 text-brand-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-midnight">
                    {analysis?.fileName ?? "Nenhum pacote selecionado"}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {analysis
                      ? `${(analysis.size / 1024 / 1024).toFixed(1)} MB · Análise concluída`
                      : "Selecione um arquivo RAR ou ZIP"}
                  </p>
                </div>
                {analysis && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-sm font-bold text-brand-deep hover:border-brand-cyan">
                <UploadCloud className="h-4 w-4" />{" "}
                {analysis ? "Substituir arquivo" : "Selecionar arquivo"}
                <input
                  type="file"
                  accept=".rar,.zip"
                  className="sr-only"
                  onChange={(e) =>
                    e.target.files?.[0] && void analyze(e.target.files[0])
                  }
                />
              </label>
            </section>
            <section className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm">
              <div className="grid grid-cols-3 divide-x divide-brand-line border-b border-brand-line">
                <Metric
                  icon={<FileText />}
                  value={analysis?.summary.files ?? "—"}
                  label="arquivos"
                />
                <Metric
                  icon={<Users />}
                  value={analysis?.summary.employees ?? "—"}
                  label="colaboradores"
                />
                <Metric
                  icon={<AlertTriangle />}
                  value={analysis?.summary.pending ?? "—"}
                  label="pendências"
                  warning
                />
              </div>
              <div className="grid min-h-[560px] grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="border-b border-brand-line p-4 md:border-b-0 md:border-r">
                  <h2 className="mb-3 font-display text-base font-bold text-brand-midnight">
                    Unidades e colaboradores
                  </h2>
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-brand-line bg-brand-surface px-3 py-2">
                    <Search className="h-4 w-4 text-brand-muted" />
                    <input
                      aria-label="Buscar colaborador"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1); setEmployeePage(1);
                      }}
                      placeholder="Buscar colaborador..."
                      className="w-full bg-transparent text-xs outline-none"
                    />
                  </div>
                  {visibleEmployees.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => {
                        setEmployeeId(employee.id);
                        setSelected([]);
                        setPage(1);
                      }}
                      className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left ${employeeId === employee.id ? "bg-brand-cyan-50 text-brand-800" : "hover:bg-brand-surface"}`}
                    >
                      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-muted" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold">
                          {employee.name}
                        </span>
                        <span className="block truncate text-[11px] text-brand-muted">
                          {employee.unit || "Unidade não informada"}
                        </span>
                      </span>
                    </button>
                  ))}
                  {analysis && !employees.length && (
                    <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                      Nenhum colaborador identificado no catálogo.
                    </p>
                  )}
                  {employees.length > PAGE_SIZE && (
                    <div className="mt-3 flex items-center justify-between border-t border-brand-line pt-3 text-[11px] text-brand-muted">
                      <span>Página {employeePage} de {employeePages}</span>
                      <span className="flex gap-1">
                        <button aria-label="Página anterior de colaboradores" disabled={employeePage <= 1} onClick={() => setEmployeePage((value) => value - 1)} className="rounded border border-brand-line p-1 disabled:opacity-30"><ArrowLeft className="h-3 w-3" /></button>
                        <button aria-label="Próxima página de colaboradores" disabled={employeePage >= employeePages} onClick={() => setEmployeePage((value) => value + 1)} className="rounded border border-brand-line p-1 disabled:opacity-30"><ArrowRight className="h-3 w-3" /></button>
                      </span>
                    </div>
                  )}
                </aside>
                <div className="min-w-0 p-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="font-display text-lg font-bold text-brand-midnight">
                        Documentos identificados
                      </h2>
                      <p className="text-xs text-brand-muted">
                        {documents.length.toLocaleString("pt-BR")} documento(s)
                        · página {page} de {pages}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-brand-line bg-brand-surface px-3 py-2 lg:w-72">
                      <Search className="h-4 w-4 text-brand-muted" />
                      <input
                        aria-label="Buscar documento"
                        value={docQuery}
                        onChange={(e) => {
                          setDocQuery(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Buscar documento..."
                        className="w-full bg-transparent text-xs outline-none"
                      />
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-brand-line pb-4">
                    {[["todos", "Todos"], ["aso", "Somente ASO"], ["funcionario", "Funcionário"], ["unidade", "Unidade"], ["pendencias", "Pendências"]].map(([value, label]) => <button key={value} onClick={() => { setMode(value); setPage(1); }} className={`rounded-lg border px-3 py-2 text-xs font-bold ${mode === value ? "border-brand-cyan bg-brand-cyan-50 text-brand-800" : "border-brand-line bg-white text-brand-muted hover:bg-brand-surface"}`}>{label}{value === "pendencias" ? ` (${analysis?.summary.pending ?? 0})` : ""}</button>)}
                    <select aria-label="Filtrar unidade" value={unitFilter} onChange={(e) => { setUnitFilter(e.target.value); setPage(1); }} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-muted"><option value="">Todas as unidades</option>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
                    <select aria-label="Filtrar tipo de documento" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-muted"><option value="">Todos os tipos</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                    <select aria-label="Filtrar situação" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-muted"><option value="">Todas situações</option><option value="pronto">Pronto</option><option value="pendente">Revisar</option></select>
                    <button onClick={() => { setMode("todos"); setUnitFilter(""); setTypeFilter(""); setStatusFilter(""); setDocQuery(""); setPage(1); }} className="rounded-lg border border-brand-line bg-white px-3 py-2 text-xs font-bold text-brand-muted hover:bg-brand-surface">Limpar</button>
                  </div>
                  {visible.length ? (
                    <>
                      <div className="overflow-x-auto rounded-xl border border-brand-line">
                        <table className="w-full min-w-[760px] text-left text-xs">
                          <thead className="bg-brand-surface text-[10px] uppercase tracking-wide text-brand-muted">
                            <tr>
                              <th className="w-10 px-3 py-3">✓</th>
                              <th className="px-3 py-3">Tipo</th>
                              <th className="px-3 py-3">Documento</th>
                              <th className="px-3 py-3">Colaborador</th>
                              <th className="px-3 py-3">Data</th>
                              <th className="px-3 py-3">
                                Status do pareamento
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-line">
                            {visible.map((document) => (
                              <tr
                                key={document.id}
                                className={
                                  document.status === "PENDING"
                                    ? "bg-amber-50/40"
                                    : "hover:bg-brand-surface/70"
                                }
                              >
                                <td className="px-3 py-3">
                                  <input
                                    type="checkbox"
                                    disabled={document.status !== "MATCHED"}
                                    checked={selected.includes(document.id)}
                                    onChange={() =>
                                      setSelected((s) =>
                                        s.includes(document.id)
                                          ? s.filter((id) => id !== document.id)
                                          : [...s, document.id],
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-3 py-3 font-semibold">
                                  {document.type}
                                </td>
                                <td
                                  className="max-w-[260px] truncate px-3 py-3 font-semibold"
                                  title={document.name}
                                >
                                  {document.name}
                                </td>
                                <td className="px-3 py-3 text-brand-muted">
                                  {document.employee?.name ??
                                    "Não identificado"}
                                </td>
                                <td className="px-3 py-3 text-brand-muted">
                                  {document.date ?? "—"}
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 font-semibold ${document.status === "MATCHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                                  >
                                    {document.status === "MATCHED"
                                      ? "Pareado automaticamente"
                                      : "Necessita confirmação"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-brand-line pt-3 text-xs text-brand-muted">
                        <span>{selected.length} selecionado(s)</span>
                        <div className="flex gap-2">
                          <button
                            aria-label="Página anterior"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="rounded-lg border border-brand-line p-2 disabled:opacity-30"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Próxima página"
                            disabled={page >= pages}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-lg border border-brand-line p-2 disabled:opacity-30"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-brand-line bg-brand-surface text-center">
                      <FileText className="mb-3 h-8 w-8 text-brand-muted" />
                      <p className="font-semibold text-brand-midnight">
                        Nenhum documento para revisar
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-brand-muted">
                        Envie um pacote para iniciar o pareamento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
            <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row">
              <p className="text-sm text-amber-900">
                <strong>Revisão manual obrigatória.</strong>
                <br />
                <span className="text-xs">
                  Documentos sem pareamento não podem ser enviados ao SOC.
                </span>
              </p>
              <button
                onClick={confirm}
                disabled={busy || !analysis}
                className="rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                Confirmar importação
              </button>
            </div>
          </div>
    </AppShell>
  );
}
function Metric({
  icon,
  value,
  label,
  warning,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-4">
      <span
        className={`grid h-8 w-8 place-items-center rounded-lg ${warning ? "bg-amber-50 text-amber-600" : "bg-brand-cyan-50 text-brand-600"}`}
      >
        {icon}
      </span>
      <span>
        <strong className="block text-lg text-brand-midnight">{value}</strong>
        <small className="text-xs text-brand-muted">{label}</small>
      </span>
    </div>
  );
}
