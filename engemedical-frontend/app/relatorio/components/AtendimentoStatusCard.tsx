import { Chip, Tooltip } from "@heroui/react";
import {
  AlertTriangle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import React from "react";

import { AtendimentoAuthInfo } from "@/lib/scheduling/interface/scheduling";
import { buildViewerUrl, buildDocFilename } from "@/lib/blob/blob-proxy";

type StatusColor =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger";

interface AtendimentoStatusCardProps {
  hasAsoData: boolean;
  parecerAso: string;
  asoStatusLabel: string;
  asoStatusColor: string;
  profissionalAso?: string | null;
  atendimentoStatusLabel: string;
  atendimentoStatusColor: StatusColor;
  signatureLabel: string;
  signatureDate: string;
  emailLabel: string;
  asoUrl?: string | null;
  validacaoUrl?: string | null;
  observacoesParecer: string[];
  hasAsoError: boolean;
  asoErrorMessage?: string | null;
  autenticacaoAtendimento?: AtendimentoAuthInfo | null;
  employeeNome?: string;
  altura?: string | null;
  confinado?: string | null;
}

const AtendimentoStatusCard: React.FC<AtendimentoStatusCardProps> = ({
  hasAsoData,
  parecerAso,
  asoStatusLabel,
  asoStatusColor,
  profissionalAso,
  atendimentoStatusLabel,
  atendimentoStatusColor,
  signatureLabel,
  signatureDate,
  emailLabel,
  asoUrl,
  validacaoUrl,
  observacoesParecer,
  hasAsoError,
  asoErrorMessage,
  autenticacaoAtendimento,
  employeeNome,
  altura,
  confinado,
}) => {
  const metodoAutenticacao = autenticacaoAtendimento?.metodo || "SOC";
  const termoCienciaUrl =
    autenticacaoAtendimento?.evidencias?.termoCienciaUrl || null;
  const termoLabel =
    metodoAutenticacao === "SOC"
      ? "Verificar SOCGED"
      : termoCienciaUrl
        ? "Disponível para consulta"
        : "Não disponível neste atendimento";

  const dataPart = signatureDate?.split(",")[0]?.trim() || "";
  const nomePart = employeeNome || "";

  const formatParecer = (value?: string | null): string | null => {
    if (!value) return null;
    return value.replace(/_/g, " ").toUpperCase();
  };

  const alturaLabel = formatParecer(altura);
  const confinadoLabel = formatParecer(confinado);

  return (
    <div className="mt-2">
      <div className="p-1">
        <div
          className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${
            hasAsoData ? "xl:grid-cols-3" : "xl:grid-cols-1"
          }`}
        >
          <section className="space-y-3">
            <h4 className="font-medium text-sm text-gray-600">
              Status do Atendimento
            </h4>
            <Chip
              className="font-semibold text-white"
              color={atendimentoStatusColor}
              size="lg"
            >
              {atendimentoStatusLabel}
            </Chip>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Autenticação do atendimento
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {metodoAutenticacao || "Não informado"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Termo de aceite
                </label>
                {termoCienciaUrl ? (
                  <a
                    className="text-sm font-medium text-[#44735e] hover:underline uppercase"
                    href={buildViewerUrl(termoCienciaUrl, buildDocFilename(['CMSO_TERMO_CIENCIA', nomePart, dataPart]))}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Visualizar
                  </a>
                ) : (
                  <span className="text-sm text-gray-900 uppercase">{termoLabel}</span>
                )}
              </div>
            </div>
          </section>

          {hasAsoData && (
            <section className="space-y-3">
              <h4 className="font-medium text-sm text-gray-600">
                Parecer ASO
              </h4>

              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-900 uppercase">{parecerAso}</p>
                <div className="flex items-center gap-1">
                  {asoUrl && (
                    <Tooltip
                      color="foreground"
                      content="Ver ASO"
                      disableAnimation={true}
                    >
                      <a
                        className="rounded-full p-1.5 text-[#44735e] transition-colors hover:bg-green-50"
                        href={buildViewerUrl(asoUrl, buildDocFilename(['CMSO_ASO', nomePart, dataPart]))}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <FileText size={16} />
                      </a>
                    </Tooltip>
                  )}
                  {validacaoUrl && (
                    <Tooltip
                      color="foreground"
                      content="Validar assinatura"
                      disableAnimation={true}
                    >
                      <a
                        className="rounded-full p-1.5 text-[#44735e] transition-colors hover:bg-green-50"
                        href={buildViewerUrl(validacaoUrl, buildDocFilename(['CMSO_VALIDACAO', metodoAutenticacao, nomePart, dataPart]))}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ShieldCheck size={16} />
                      </a>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {alturaLabel && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Trabalho em Altura
                    </label>
                    <p className="text-sm text-gray-900 uppercase">{alturaLabel}</p>
                  </div>
                )}

                {confinadoLabel && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Espaço Confinado
                    </label>
                    <p className="text-sm text-gray-900 uppercase">{confinadoLabel}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">
                    Situação
                  </label>
                  <p
                    className="text-sm text-gray-900 uppercase"
                  >
                    {asoStatusLabel}
                  </p>
                </div>
              </div>
            </section>
          )}

          {hasAsoData && (
            <section className="space-y-3">
              <h4 className="font-medium text-sm text-gray-600">
                Médico Responsável
              </h4>
              <p className="text-sm text-gray-900 uppercase">
                {profissionalAso || "Não informado"}
              </p>
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">
                    Tipo de Assinatura
                  </label>
                  <p className="text-sm text-gray-900 uppercase">{signatureLabel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">
                    Atualização
                  </label>
                  <p className="text-sm text-gray-600">
                    {signatureDate}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">
                    E-mail
                  </label>
                  <p className="text-sm text-gray-900 uppercase">{emailLabel}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {observacoesParecer.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Observações do parecer
            </p>
            <p className="text-xs text-amber-900">
              {observacoesParecer.join(" | ")}
            </p>
          </div>
        )}

        {hasAsoError && asoErrorMessage && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
              <AlertTriangle size={12} />
              Erro no fluxo ASO
            </p>
            <p className="text-xs font-medium text-red-900">
              {asoErrorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(AtendimentoStatusCard);
