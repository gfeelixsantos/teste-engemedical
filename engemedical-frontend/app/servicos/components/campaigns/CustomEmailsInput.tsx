"use client";

import React, { useState, useMemo } from "react";
import { Textarea, Chip, Button, Tooltip } from "@heroui/react";
import { Mail, CheckCircle2, AlertCircle, Trash2, Copy } from "lucide-react";

interface CustomEmailsInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CustomEmailsInput({ emails, onChange }: CustomEmailsInputProps) {
  // Inicializa o rawText com a lista de e-mails já existente (ex: modo edição)
  const [rawText, setRawText] = useState(() => emails.join("\n"));

  // Processa a caixa de texto e separa e-mails válidos dos tokens inválidos/em digitação
  const { validEmails, invalidTokens } = useMemo(() => {
    const tokens = rawText
      .split(/[\s,;\n\r]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const validSet = new Set<string>();
    const invalidSet = new Set<string>();

    tokens.forEach((token) => {
      if (EMAIL_REGEX.test(token)) {
        validSet.add(token);
      } else if (token.includes("@")) {
        // Token parcial ou mal formatado
        invalidSet.add(token);
      }
    });

    return {
      validEmails: Array.from(validSet),
      invalidTokens: Array.from(invalidSet),
    };
  }, [rawText]);

  // Atualiza rawText e notifica o componente pai com a lista exata e desduplicada
  const handleTextChange = (value: string) => {
    setRawText(value);
    const tokens = value
      .split(/[\s,;\n\r]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const validSet = new Set<string>();
    tokens.forEach((t) => {
      if (EMAIL_REGEX.test(t)) {
        validSet.add(t);
      }
    });

    onChange(Array.from(validSet));
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updatedRaw = rawText
      .split(/[\s,;\n\r]+/)
      .filter((t) => t.trim().toLowerCase() !== emailToRemove.toLowerCase())
      .join("\n");
    setRawText(updatedRaw);

    const nextValid = validEmails.filter((e) => e !== emailToRemove.toLowerCase());
    onChange(nextValid);
  };

  const handleClearAll = () => {
    setRawText("");
    onChange([]);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-default-200 bg-default-50/60 p-4 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Lista Customizada de E-mails</h4>
            <p className="text-xs text-default-500">
              Cole ou digite e-mails separados por vírgula, ponto-e-vírgula ou quebra de linha
            </p>
          </div>
        </div>

        {emails.length > 0 && (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            startContent={<Trash2 className="h-3.5 w-3.5" />}
            onPress={handleClearAll}
          >
            Limpar Lista ({emails.length})
          </Button>
        )}
      </div>

      <Textarea
        placeholder={`Cole sua lista aqui...\nExemplo:\njoao@empresa.com.br\nmaria@empresa.com.br, carlos@dominio.com`}
        value={rawText}
        onValueChange={handleTextChange}
        minRows={4}
        maxRows={8}
        variant="bordered"
        className="w-full bg-white text-xs font-mono"
      />

      {/* Indicadores de Validação */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-default-100 pt-3">
        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            variant="flat"
            color={emails.length > 0 ? "success" : "default"}
            startContent={<CheckCircle2 className="h-3.5 w-3.5" />}
            className="font-semibold"
          >
            {emails.length} E-mail{emails.length !== 1 ? "s" : ""} Válido{emails.length !== 1 ? "s" : ""}
          </Chip>

          {invalidTokens.length > 0 && (
            <Chip
              size="sm"
              variant="flat"
              color="danger"
              startContent={<AlertCircle className="h-3.5 w-3.5" />}
              className="font-semibold animate-pulse"
            >
              {invalidTokens.length} Inválido{invalidTokens.length !== 1 ? "s" : ""} Ignorado{invalidTokens.length !== 1 ? "s" : ""}
            </Chip>
          )}
        </div>

        {invalidTokens.length > 0 && (
          <span className="text-[11px] text-danger-600 font-medium">
            Verifique e-mails mal formatados na caixa acima
          </span>
        )}
      </div>

      {/* Chips dos E-mails Válidos */}
      {emails.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-default-100 pt-3">
          <span className="text-xs font-semibold text-gray-700">
            Destinatários Confirmados ({emails.length}):
          </span>
          <div className="max-h-36 overflow-y-auto rounded-lg border border-default-200 bg-white p-2 flex flex-wrap gap-1.5 scrollbar-thin">
            {emails.map((email) => (
              <Chip
                key={email}
                size="sm"
                variant="flat"
                color="primary"
                onClose={() => handleRemoveEmail(email)}
                className="font-mono text-[11px]"
              >
                {email}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
