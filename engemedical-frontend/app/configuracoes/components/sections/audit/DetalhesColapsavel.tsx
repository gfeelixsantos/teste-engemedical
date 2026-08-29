"use client";

import { useState } from "react";

import { AuditLogRecord } from "@/lib/audit-log/types";

import {
  buildAuditExpandedDetails,
  hasExpandedAuditDetails,
} from "./presentation.mjs";

interface DetalhesColapsavelProps {
  record: AuditLogRecord;
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function DetalhesColapsavel({ record }: DetalhesColapsavelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!hasExpandedAuditDetails(record)) {
    return <span className="text-xs text-gray-400">Sem detalhes</span>;
  }

  const details = buildAuditExpandedDetails(record);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
      >
        Ver detalhes
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes do Registro</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="grid gap-4 text-sm text-gray-700 md:grid-cols-2">
                <div>
                  <span className="font-semibold text-gray-900">Perfil:</span>{" "}
                  {renderValue(details.perfil)}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Unidade:</span>{" "}
                  {renderValue(details.unidade)}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Funcionário:</span>{" "}
                  {details.paciente_nome || details.paciente_codigo
                    ? `${renderValue(details.paciente_nome)}${details.paciente_nome && details.paciente_codigo ? " (" : ""}${renderValue(details.paciente_codigo)}${details.paciente_nome && details.paciente_codigo ? ")" : ""}`
                    : "—"}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Tipo de recurso:</span>{" "}
                  {renderValue(details.recurso_tipo)}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Recurso ID:</span>{" "}
                  {renderValue(details.recurso_id)}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">IP:</span> {renderValue(details.ip)}
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-900">User-Agent:</span>{" "}
                  <span className="break-all">{renderValue(details.user_agent)}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-900">Código de rastreio:</span>{" "}
                  {renderValue(details.request_id)}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm font-semibold text-gray-900">
                  Detalhes sanitizados
                </div>
                <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800 border border-gray-200">
                  {renderValue(details.detalhes)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
