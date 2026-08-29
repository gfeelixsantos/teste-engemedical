import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
} from "@heroui/react";

import { PSC_PROVIDERS } from "@/lib/constants/psc-providers";
import { ProviderIcon } from "@/components/shared/ProviderIcon";

interface PscProviderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (provider: string) => void;
}

export function PscProviderSelector({
  isOpen,
  onClose,
  onSelect,
}: PscProviderSelectorProps) {
  // Filter out the "Nenhum" option for the selector
  const providers = PSC_PROVIDERS.filter((p) => p.psc !== "");

  return (
    <Modal backdrop="blur" isOpen={isOpen} onClose={onClose}>
      <ModalContent className="border border-[#44735e]/20">
        <ModalHeader className="flex flex-col gap-1 text-[#2a4a3a]">
          Selecione seu provedor de assinatura
        </ModalHeader>
        <ModalBody className="pb-6">
          <div className="grid grid-cols-2 gap-3">
            {providers.map((item) => (
              <Button
                key={item.psc}
                className="justify-start h-16 px-3 hover:bg-[#e8f4e3] border-[#44735e]/30 transition-colors focus-visible:ring-2 focus-visible:ring-[#44735e]/40"
                variant="bordered"
                onPress={() => onSelect(item.psc)}
              >
                <div className="flex items-center gap-3 w-full">
                  <ProviderIcon
                    className="flex-shrink-0"
                    name={item.psc}
                    size={50}
                  />
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-bold text-[15px] text-gray-800 leading-none">
                      {item.psc}
                    </span>
                    <span className="text-[12px] text-gray-500 font-medium leading-none tracking-wide">
                      {item.provider}
                    </span>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
