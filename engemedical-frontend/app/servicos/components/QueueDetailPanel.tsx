"use client";

import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import {
  X,
  RefreshCw,
  Users,
  Clock,
  Shield,
  AlertTriangle,
  Mail,
  FileText,
  Upload,
  FileCheck,
  Send,
  Package,
  HardDrive,
  Inbox,
  ChevronDown,
  ChevronRight,
  Braces,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";

import {
  useQueuePeek,
  QUEUE_WORKER_MAP,
  requeueMessage,
} from "@/hooks/useQueueMonitor";

const QUEUE_ICONS: Record<string, React.ReactNode> = {
  "resultados-exames": <FileText className="h-5 w-5" />,
  email: <Send className="h-5 w-5" />,
  socged: <Upload className="h-5 w-5" />,
  "aso-processing": <FileCheck className="h-5 w-5" />,
  "aso-enriquecimento": <FileCheck className="h-5 w-5" />,
  "exames-enriquecimento": <FileCheck className="h-5 w-5" />,
  "google-drive-upload": <HardDrive className="h-5 w-5" />,
  "resultado-exame-soc": <Package className="h-5 w-5" />,
  "ged-batch": <Package className="h-5 w-5" />,
};

function getQueueIcon(name: string): React.ReactNode {
  return QUEUE_ICONS[name] || <Inbox className="h-5 w-5" />;
}

const DLQ_TO_ACTIVE_QUEUE: Record<string, string> = {
  "email-falhas": "email",
  "ged-batch-falhas": "ged-batch",
  "aso-enriquecimento-falhas": "aso-enriquecimento",
  "exames-enriquecimento-falhas": "exames-enriquecimento",
  "aso-processing-falhas": "aso-processing",
};

function getFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    schedulingId: "Agendamento",
    nomeFuncionario: "Funcionário",
    nomeEmpresa: "Empresa",
    tipoExame: "Tipo de Exame",
    tipoExameNome: "Nome do Exame",
    createdAt: "Criado em",
    to: "Destinatário",
    cc: "Cópia",
    bcc: "Cópia Oculta",
    subject: "Assunto",
    templatename: "Template",
    template: "Template",
    from: "Remetente",
    jobId: "Job",
    empresaCodigo: "Cód. Empresa",
    empresaNome: "Empresa",
    grupo: "Grupo",
    medico: "Médico",
    parecer: "Parecer",
    url: "URL",
    commandId: "Comando",
    codEmpresa: "Cód. Empresa",
    codFuncionario: "Cód. Funcionário",
    cpfFuncionario: "CPF",
    sequencial: "Sequencial",
    sequencialFicha: "Seq. Ficha",
    prontuario: "Prontuário",
    socgedCode: "Código SOCGED",
    nomeArquivo: "Nome do Arquivo",
    nomeGed: "Nome GED",
    codigoGed: "Código GED",
    tipoGed: "Tipo GED",
    classificacao: "Classificação",
    createdBy: "Criado por",
    documentoType: "Tipo Documento",
    requestedAt: "Solicitado em",
    requestId: "ID Requisição",
    examIndex: "Índice Exame",
    codigoExame: "Cód. Exame",
    action: "Ação",
    assinaturaDigitalObrigatoria: "Assinatura Obrigatória",
    updateAt: "Atualizado em",
    emailSent: "Email Enviado",
    fileUrl: "URL do Arquivo",
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").trim();
}

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayValue(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime()) && value.length > 10) {
        return date.toLocaleString("pt-BR");
      }
    } catch {
      // not a date
    }
    return value;
  }
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function ArrayField({ label, value }: { label: string; value: unknown[] }) {
  const [expanded, setExpanded] = useState(false);

  if (value.length === 0) {
    return (
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="text-xs text-gray-400 italic">Vazio</span>
      </div>
    );
  }

  const isObjectArray = value.some((v) => isObjectValue(v));

  if (!isObjectArray) {
    return (
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {label} ({value.length})
        </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {value.slice(0, 10).map((item, i) => (
            <span
              key={i}
              className="inline-block rounded bg-[#44735E]/10 px-2 py-0.5 text-xs font-medium text-[#44735E]"
            >
              {formatValue(item)}
            </span>
          ))}
          {value.length > 10 && (
            <span className="text-xs text-gray-400">
              +{value.length - 10} mais
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 hover:text-[#44735E]"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {label} ({value.length} {value.length === 1 ? "item" : "itens"})
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {value.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-100 bg-gray-50 p-2"
            >
              <p className="mb-1 text-[10px] font-bold text-gray-500">
                #{i + 1}
              </p>
              {isObjectValue(item) ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {Object.entries(item).map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-[9px] text-gray-400">
                        {getFieldLabel(k)}
                      </span>
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {formatValue(v)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-700">
                  {formatValue(item)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectField({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(value);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 hover:text-[#44735E]"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {label}
        <span className="text-gray-300">({entries.length} campos)</span>
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-[9px] text-gray-400">
                  {getFieldLabel(k)}
                </span>
                {isObjectValue(v) || isArrayValue(v) ? (
                  <span className="text-xs text-gray-500 italic">
                    [objeto complexo]
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {formatValue(v)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JsonToggle({ payload }: { payload: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-[#44735E]/30 hover:bg-[#44735E]/5 hover:text-[#44735E]"
        onClick={() => setExpanded(!expanded)}
      >
        <Braces className="h-3.5 w-3.5" />
        {expanded ? "Ocultar JSON" : "Ver JSON completo"}
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-900"
        >
          <div className="max-h-60 overflow-auto p-3">
            <pre className="text-[11px] leading-relaxed text-green-400">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MessagePayload({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) {
    return (
      <p className="text-sm text-gray-400 italic">Payload não disponível</p>
    );
  }

  const entries = Object.entries(payload);

  return (
    <div className="space-y-3">
      {/* Simple fields */}
      {entries
        .filter(([, v]) => !isObjectValue(v) && !isArrayValue(v))
        .map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              {getFieldLabel(key)}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">
              {formatValue(value)}
            </span>
          </div>
        ))}

      {/* Array fields */}
      {entries
        .filter(([, v]) => isArrayValue(v))
        .map(([key, value]) => (
          <ArrayField key={key} label={getFieldLabel(key)} value={value as unknown[]} />
        ))}

      {/* Object fields */}
      {entries
        .filter(([, v]) => isObjectValue(v))
        .map(([key, value]) => (
          <ObjectField
            key={key}
            label={getFieldLabel(key)}
            value={value as Record<string, unknown>}
          />
        ))}

      {/* JSON toggle */}
      <JsonToggle payload={payload} />
    </div>
  );
}

interface QueueDetailPanelProps {
  queueName: string;
  messageCount: number;
  onClose: () => void;
}

function RequeueModal({
  queueName,
  payload,
  onClose,
  onSuccess,
}: {
  queueName: string;
  payload: Record<string, unknown> | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [editedJson, setEditedJson] = useState(
    JSON.stringify(payload, null, 2) || "{}"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetQueue = DLQ_TO_ACTIVE_QUEUE[queueName];

  const handleSubmit = async () => {
    if (!targetQueue) {
      setError("Fila destino não mapeada");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedPayload = JSON.parse(editedJson);
      await requeueMessage(queueName, targetQueue, parsedPayload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reenfileirar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Reenfileirar Mensagem
            </h3>
            <p className="text-sm text-gray-500">
              De <span className="font-medium text-red-600">{queueName}</span> para{" "}
              <span className="font-medium text-green-600">{targetQueue}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Payload (JSON editável)
          </label>
          <textarea
            value={editedJson}
            onChange={(e) => setEditedJson(e.target.value)}
            className="h-64 w-full rounded-lg border border-gray-200 bg-gray-900 p-3 font-mono text-xs leading-relaxed text-green-400 focus:border-[#44735E] focus:outline-none focus:ring-1 focus:ring-[#44735E]"
            spellCheck={false}
          />

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            startContent={!isSubmitting ? <RotateCcw className="h-4 w-4" /> : undefined}
          >
            Reenfileirar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function QueueDetailPanel({
  queueName,
  messageCount,
  onClose,
}: QueueDetailPanelProps) {
  const { data: peekData, loading: peekLoading, refetch } = useQueuePeek(queueName);
  const workerInfo = QUEUE_WORKER_MAP[queueName];
  const [requeueTarget, setRequeueTarget] = useState<{
    payload: Record<string, unknown> | null;
  } | null>(null);

  const isDlq = queueName in DLQ_TO_ACTIVE_QUEUE;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-[#44735E]/20 bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#44735E]/15 bg-gradient-to-r from-[#44735E] to-[#2a4d3d] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white">
              {getQueueIcon(queueName)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {workerInfo?.label || queueName}
              </h3>
              <p className="text-sm text-white/70">
                {workerInfo?.description || "Fila Azure Queue Storage"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Worker Metadata */}
          {workerInfo && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Mensagens
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-[#44735E]">
                  {messageCount}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Consumidor
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-gray-800 truncate">
                  {workerInfo.consumer}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Concorrência
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-gray-800">
                  {workerInfo.concurrency}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    Visibilidade
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-gray-800">
                  {workerInfo.visibilitySeconds}s
                </p>
              </div>
            </div>
          )}

          {/* Peek Messages */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h4 className="text-sm font-semibold text-gray-800">
                Últimas mensagens na fila
              </h4>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => refetch()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-gray-400 ${peekLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {peekLoading && !peekData ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Spinner color="primary" size="sm" />
                  <p className="mt-2 text-xs text-gray-400">
                    Consultando fila...
                  </p>
                </div>
              ) : peekData?.messages && peekData.messages.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {peekData.messages.map((msg, index) => (
                    <motion.div
                      key={msg.messageId || index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="px-4 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-400">
                          {formatDate(msg.insertedOn)}
                        </span>
                        <div className="flex items-center gap-2">
                          {msg.dequeueCount > 0 && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {msg.dequeueCount} rejeição
                              {msg.dequeueCount > 1 ? "ões" : ""}
                            </span>
                          )}
                          {isDlq && (
                            <Button
                              size="sm"
                              variant="flat"
                              color="primary"
                              startContent={<RotateCcw className="h-3 w-3" />}
                              onPress={() =>
                                setRequeueTarget({ payload: msg.payload })
                              }
                            >
                              Reenfileirar
                            </Button>
                          )}
                        </div>
                      </div>
                      <MessagePayload payload={msg.payload} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Inbox className="mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Fila vazia</p>
                  <p className="text-xs">Nenhuma mensagem encontrada</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {requeueTarget && (
        <RequeueModal
          queueName={queueName}
          payload={requeueTarget.payload}
          onClose={() => setRequeueTarget(null)}
          onSuccess={() => refetch()}
        />
      )}
    </motion.div>
  );
}
