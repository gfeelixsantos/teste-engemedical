"use client";

import { Card, CardBody } from "@heroui/react";
import { ClipboardSignature, Construction } from "lucide-react";

export function AssinaturaAtendimentoSection() {
  return (
    <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <CardBody className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardSignature
            size={28}
            aria-hidden="true"
            style={{ color: "#44735e" }}
          />
          <h2 className="text-xl font-semibold text-gray-800">
            Assinatura Atendimento
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200">
            <Construction size={28} className="text-amber-500" aria-hidden="true" />
          </div>
          <div className="space-y-2 max-w-md">
            <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Em desenvolvimento
            </span>
            <p className="text-sm text-gray-500 leading-relaxed">
              Esta seção está em desenvolvimento. Em breve você poderá configurar
              o comportamento da assinatura durante o atendimento.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
