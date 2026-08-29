import React from "react";
import { Card, CardBody } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

// Interface para tipagem robusta
interface DisconnectedStateProps {
  /** Mensagem principal de desconexão */
  message?: string;
  /** Mensagem adicional com instruções */
  additionalMessage?: string;
}

// Componente para o ícone de alerta
const AlertIcon: React.FC = () => (
  <AlertTriangle
    aria-hidden="true"
    className="h-12 w-12 mx-auto mb-4 text-yellow-600"
  />
);

// Componente para as mensagens
const MessageContent: React.FC<DisconnectedStateProps> = ({
  message,
  additionalMessage,
}) => (
  <div className="space-y-2">
    <p className="text-lg font-semibold text-gray-900" role="alert">
      {message}
    </p>
    <p className="text-sm text-gray-600">{additionalMessage}</p>
  </div>
);

// Componente principal
const DisconnectedState: React.FC<DisconnectedStateProps> = ({
  message = "Sistema Desconectado",
  additionalMessage = 'Selecione uma sala e clique em "Conectar" para visualizar as senhas',
}) => {
  return (
    <section aria-label="Estado de desconexão do sistema" className="mt-6">
      <Card
        aria-describedby="disconnected-message"
        className="bg-white rounded-lg border border-gray-200 shadow-md 
          hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        role="alertdialog"
        shadow="sm"
      >
        <CardBody className="p-8 text-center">
          <AlertIcon />
          <MessageContent
            additionalMessage={additionalMessage}
            message={message}
          />
        </CardBody>
      </Card>
    </section>
  );
};

export default DisconnectedState;
