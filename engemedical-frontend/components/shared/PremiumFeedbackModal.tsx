"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  ArrowRight,
} from "lucide-react";

export type PremiumFeedbackVariant = "success" | "error" | "warning" | "info";

interface PremiumFeedbackModalProps {
  isOpen: boolean;
  variant: PremiumFeedbackVariant;
  title: string;
  message: string;
  detail?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  isLoading?: boolean;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onClose: () => void;
}

const variantMap = {
  success: {
    Icon: CheckCircle2,
    label: "Tudo certo",
    iconClass: "text-emerald-500 bg-emerald-50 border-emerald-200",
    accentClass: "from-emerald-400 via-brand-cyan to-brand-green",
  },
  error: {
    Icon: XCircle,
    label: "Atenção necessária",
    iconClass: "text-red-500 bg-red-50 border-red-200",
    accentClass: "from-red-400 via-amber-300 to-brand-cyan",
  },
  warning: {
    Icon: AlertTriangle,
    label: "Revise antes de continuar",
    iconClass: "text-amber-500 bg-amber-50 border-amber-200",
    accentClass: "from-amber-300 via-brand-cyan to-brand-green",
  },
  info: {
    Icon: Info,
    label: "Informação",
    iconClass: "text-brand-blue bg-brand-cyan/10 border-brand-cyan/25",
    accentClass: "from-brand-blue via-brand-cyan to-brand-green",
  },
} satisfies Record<
  PremiumFeedbackVariant,
  {
    Icon: typeof CheckCircle2;
    label: string;
    iconClass: string;
    accentClass: string;
  }
>;

export function PremiumFeedbackModal({
  isOpen,
  variant,
  title,
  message,
  detail,
  primaryLabel = "Entendi",
  secondaryLabel,
  isLoading = false,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
}: PremiumFeedbackModalProps) {
  const { Icon, label, iconClass, accentClass } = variantMap[variant];

  const handlePrimary = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }

    onClose();
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop: "bg-brand-midnight/30 backdrop-blur-md",
        base: "border border-brand-cyan/20 bg-white shadow-[0_28px_88px_rgba(0,46,66,0.22)]",
        closeButton: "text-slate-400 hover:bg-slate-100 hover:text-brand-deep",
      }}
      isDismissable={!isLoading}
      isOpen={isOpen}
      placement="center"
      size="md"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0 px-6 pb-0 pt-6">
          <div className={`mb-5 h-1.5 w-24 rounded-full bg-gradient-to-r ${accentClass}`} />
          <div className="flex items-start gap-4">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${iconClass}`}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">
                {label}
              </p>
              <h2 className="text-xl font-semibold leading-7 tracking-tight text-brand-midnight">
                {title}
              </h2>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="px-6 py-4">
          <p className="text-sm leading-6 text-slate-600">{message}</p>
          {detail && (
            <div className="rounded-lg border border-brand-line bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              {detail}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="flex justify-end gap-2 border-t border-brand-line/80 px-6 py-4">
          {secondaryLabel && (
            <Button
              className="font-semibold text-slate-600"
              isDisabled={isLoading}
              radius="sm"
              variant="light"
              onPress={onSecondaryAction || onClose}
            >
              {secondaryLabel}
            </Button>
          )}
          <Button
            className="bg-brand-midnight font-semibold text-white shadow-[0_14px_32px_rgba(0,46,66,0.2)]"
            endContent={<ArrowRight className="h-4 w-4" />}
            isLoading={isLoading}
            radius="sm"
            onPress={handlePrimary}
          >
            {primaryLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
