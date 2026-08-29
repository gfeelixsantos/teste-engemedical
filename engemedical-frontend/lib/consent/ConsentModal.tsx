"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
} from "@heroui/react";
import { useState } from "react";
import { useConsent, ConsentType } from "./useConsent";

const DOC_LINKS: Record<ConsentType, { href: string; label: string; suffix: string }> = {
  TERMOS_DE_USO: { href: "/termos-de-uso", label: "Termos de Uso", suffix: "na íntegra" },
  POLITICA_PRIVACIDADE: { href: "/privacidade", label: "Política de Privacidade", suffix: "completa" },
};

export function ConsentModal() {
  const { needsConsent, pendingTipo, accept, getContent, error } = useConsent();
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);

  if (!needsConsent || !pendingTipo) return null;

  const content = getContent(pendingTipo);
  if (!content) return null;

  const docLink = DOC_LINKS[pendingTipo];

  async function handleAccept() {
    setAccepting(true);
    await accept(pendingTipo);
    setChecked(false);
    setAccepting(false);
  }

  const isLast = pendingTipo === "POLITICA_PRIVACIDADE";

  return (
    <Modal
      isOpen
      isDismissable={false}
      hideCloseButton
      size="2xl"
      placement="center"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[#44735e]">{content.title}</span>
          </div>
          <p className="text-sm font-normal text-gray-500">
            Versão 1.0 &mdash; Leia atentamente antes de aceitar
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-80 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {content.text}
          </div>
          <div className="mt-2">
            <p className="text-xs text-gray-400 mb-2">
              Ao marcar abaixo e clicar em &quot;Aceitar&quot;, você confirma que leu,
              compreendeu e concorda com os termos apresentados. Caso não concorde,
              feche esta janela e entre em contato com o DPO.
            </p>
            <a
              href={docLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Ler {docLink.label} {docLink.suffix} &rarr;
            </a>
          </div>
        </ModalBody>
        <ModalFooter className="flex flex-col gap-3">
          <Checkbox
            isSelected={checked}
            onValueChange={setChecked}
            size="sm"
          >
            <span className="text-sm">
              Li e aceito os{" "}
              <strong>{content.title.toLowerCase()}</strong>
            </span>
          </Checkbox>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="flat"
              onPress={() => window.open(docLink.href, "_blank")}
              size="sm"
            >
              Ver {docLink.label} {docLink.suffix}
            </Button>
            <Button
              color="primary"
              isDisabled={!checked}
              isLoading={accepting}
              onPress={handleAccept}
              style={{ backgroundColor: "#44735e" }}
            >
              {isLast ? "Aceitar e Continuar" : "Aceitar e Próximo"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
