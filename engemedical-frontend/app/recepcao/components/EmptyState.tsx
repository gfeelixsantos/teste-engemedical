import React, { ReactNode } from "react";
import { Button } from "@heroui/react";
import { WifiOff } from "lucide-react";

// Interface para tipagem robusta
interface EmptyStateProps {
  /** Título principal (ex: "Nenhum atendimento encontrado") */
  title?: string;
  /** Descrição adicional */
  description?: string;
  /** Ícone opcional (default: Inbox) */
  icon?: ReactNode;
  /** Texto do botão opcional */
  actionLabel?: string;
  /** Callback quando clica no botão */
  onAction?: () => void;
}

// Componente para o ícone
const EmptyStateIcon: React.FC<{ icon: ReactNode }> = ({ icon }) => (
  <div
    aria-hidden="true"
    className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100"
  >
    {icon}
  </div>
);

// Componente para o conteúdo de texto
const EmptyStateContent: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="space-y-1">
    <h3 className="text-lg font-semibold text-gray-900" role="alert">
      {title}
    </h3>
    <p className="text-sm text-gray-600">{description}</p>
  </div>
);

// Componente para o botão de ação
const EmptyStateAction: React.FC<{
  actionLabel: string;
  onAction: () => void;
}> = ({ actionLabel, onAction }) => (
  <Button
    aria-label={actionLabel}
    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md 
      hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
      focus:ring-offset-2 transition-colors shadow-sm"
    onPress={onAction}
  >
    {actionLabel}
  </Button>
);

// Componente principal
const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Nenhum registro encontrado",
  description = "Não há dados disponíveis para exibir no momento.",
  icon = <WifiOff className="text-red-400" size={36} />,
  actionLabel,
  onAction,
}) => {
  return (
    <section
      aria-describedby="empty-state-description"
      aria-label="Estado vazio"
      className="flex flex-col items-center justify-center py-16 text-center space-y-4 rounded-lg"
      role="alertdialog"
    >
      <EmptyStateIcon icon={icon} />
      <EmptyStateContent description={description} title={title} />
      {actionLabel && onAction && (
        <EmptyStateAction actionLabel={actionLabel} onAction={onAction} />
      )}
    </section>
  );
};

export default EmptyState;
