"use client";

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Snippet,
  Spinner,
} from "@heroui/react";
import {
  ClipboardList,
  User,
  Building2,
  Ticket as TicketIcon,
  Check,
  Clock,
} from "lucide-react";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Socket } from "socket.io-client";

import { emitEvent, EventType } from "@/lib/websocket/events/events";
import { PreparationRequestTypes } from "@/lib/websocket/enums/websocket.enum";
import { IndexDb } from "@/lib/indexDb/indexdb";
import { PreparationRequest, Ticket } from "@/lib/ticket/ticket";

interface PreparationCardProps {
  request: PreparationRequest;
  ticket?: Ticket;
  onAttachments?: () => void;
  onComplete?: () => void;
  disabled: boolean;
}

export function PreparationCard({
  request,
  ticket,
  onAttachments,
  onComplete,
  disabled,
}: PreparationCardProps) {
  const [nomeEmpresa, setNomeEmpresa] = useState<string>();

  const waitingMinutes = useMemo(() => {
    return ticket?.emissao
      ? Math.floor((Date.now() - new Date(ticket.emissao).getTime()) / 60000)
      : 0;
  }, [ticket?.emissao]);

  // Define status com base no tempo de espera
  const statusColor = useMemo((): "default" | "danger" | "warning" => {
    if (waitingMinutes > 90) return "danger";
    if (waitingMinutes > 60) return "warning";

    return "default";
  }, [waitingMinutes]);

  const cardClasses = useMemo(() => {
    const base =
      "w-full rounded-xl transition-all duration-200 hover:shadow-lg border-2";
    const statusBorder =
      statusColor === "danger"
        ? "border-red-400"
        : statusColor === "warning"
          ? "border-yellow-400"
          : "border-gray-200";

    return `${base} ${statusBorder}`;
  }, [statusColor]);

  useEffect(() => {
    let isMounted = true;

    const fetchEmpresa = async () => {
      const empresa = await IndexDb.getCompanyById(request.empresa);

      if (isMounted && empresa) {
        setNomeEmpresa(empresa.RAZAOSOCIAL);
      }
    };

    fetchEmpresa();

    return () => {
      isMounted = false;
    };
  }, [request.empresa]);

  return (
    <Card className={cardClasses} shadow="md">
      <CardHeader className="flex flex-col gap-2 font-bold">
        <Alert
          color={statusColor as any}
          description={
            <span className="flex gap-2 text-xs">{request.tipoExame}</span>
          }
          title={request.nome}
          variant="solid"
        />
        <Snippet
          hideSymbol
          className="w-full"
          color="default"
          size="sm"
          tooltipProps={{
            color: "foreground",
            content: "Copiar",
            disableAnimation: true,
          }}
          variant="bordered"
        >
          <p className="text-xs">{nomeEmpresa ?? "Empresa não encontrada"}</p>
        </Snippet>
      </CardHeader>

      <CardBody className="p-1 space-y-4">
        {/* Informações principais */}
        <div className="flex gap-3">
          <InfoItem
            copyable
            label="Nascimento"
            value={request.dataNascimento}
          />
          <InfoItem copyable label="CPF" value={request.cpf} />
        </div>
        <div>
          <InfoItem
            fullWidth
            label="Informações"
            value={request.informacoes || "-"}
          />
        </div>

        {/* Ticket */}
        {ticket && (
          <>
            <Divider />
            <div className="p-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-default-700">
                  Senha{" "}
                  {ticket.preferencial ? (
                    <Chip className="text-xs" color="danger">
                      PREFERENCIAL
                    </Chip>
                  ) : (
                    ""
                  )}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem
                  icon={<TicketIcon className="w-4 h-4" />}
                  label="Número"
                  value={`${ticket.prefixo}${ticket.numero ?? ""}`}
                />
                <InfoItem
                  icon={<Clock className="w-4 h-4" />}
                  label="Espera"
                  value={`${waitingMinutes} min`}
                />
                <InfoItem
                  icon={<Building2 className="w-4 h-4" />}
                  label="Unidade"
                  value={ticket.unidade}
                />
                {request.sala && (
                  <InfoItem
                    icon={<ClipboardList className="w-4 h-4" />}
                    label="Sala"
                    value={request.sala}
                  />
                )}
                {request.atendente && (
                  <InfoItem
                    icon={<User className="w-4 h-4" />}
                    label="Atendente"
                    value={request.atendente}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </CardBody>

      <CardFooter className="flex sm:flex-row gap-3 p-5 pt-0">
        <div className="flex flex-wrap gap-2 w-full">
          <Button
            className="flex-1 sm:flex-none text-xs"
            color="success"
            disabled={disabled}
            fullWidth={true}
            startContent={<Check className="w-3 h-3" />}
            variant="light"
            onPress={onComplete}
          >
            Finalizar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface InfoItemProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  fullWidth?: boolean;
  copyable?: boolean;
}

const InfoItem = React.memo(function InfoItem({
  icon,
  label,
  value,
  fullWidth = false,
  copyable = false,
}: InfoItemProps) {
  return (
    <div
      className={`flex items-start gap-2 ${fullWidth ? "sm:col-span-2" : ""}`}
    >
      <span className="text-default-500 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-default-600 mb-0.5">{label}</p>
        {copyable ? (
          <Snippet
            hideSymbol
            color="default"
            size="sm"
            tooltipProps={{
              color: "foreground",
              content: "Copiar",
              disableAnimation: true,
            }}
            variant="bordered"
          >
            <p className="text-xs font-medium text-default-800 truncate">
              {value ?? "-"}
            </p>
          </Snippet>
        ) : (
          <p className="text-xs font-medium text-default-800 truncate">
            {value ?? "-"}
          </p>
        )}
      </div>
    </div>
  );
});

/* ========== GRID ========== */
interface PreparationGridProps {
  requests: PreparationRequest[];
  socket: Socket;
}

export function PreparationGrid({ requests, socket }: PreparationGridProps) {
  const [requestToConfirm, setRequestToConfirm] =
    useState<PreparationRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const handleAttachments = useCallback((request: PreparationRequest) => {
    console.log("Anexos para:", request.nome);
  }, []);

  const handleComplete = useCallback((requestComplete: PreparationRequest) => {
    setRequestToConfirm(requestComplete);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (requestToConfirm) {
      setIsConfirmLoading(true);
      setIsProcessing(true);

      try {
        emitEvent(socket, EventType.PREPARATION_REQUEST, {
          type: PreparationRequestTypes.FINISHED,
          request: requestToConfirm,
        });
        // Delay para sincronizar com resposta do servidor
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error("Erro ao finalizar solicitação:", error);
      } finally {
        setIsConfirmLoading(false);
        setIsProcessing(false);
        setRequestToConfirm(null);
      }
    }
  }, [requestToConfirm, socket]);

  const handleCancel = useCallback(() => {
    setRequestToConfirm(null);
  }, []);

  useEffect(() => {
    return () => {
      setRequestToConfirm(null);
      setIsProcessing(false);
    };
  }, []);

  return (
    <>
      {requests.length > 0 ? (
        <div className="px-4 sm:px-6 lg:px-8">
          <h3 className="text-lg font-medium text-gray-600 mb-4">Solicitações de preparo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {requests.map((req) => (
              <PreparationCard
                key={`${req.cpf}-${req.dataNascimento}`}
                disabled={isProcessing}
                request={req}
                ticket={req.tickets}
                onAttachments={() => handleAttachments(req)}
                onComplete={() => handleComplete(req)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex text-center justify-center mt-16 gap-6">
          <Spinner color="success" size="lg" variant="default" />
          <h3 className="text-2xl">Sem solicitações...</h3>
        </div>
      )}

      {/* Modal de confirmação do HeroUI */}
      <Modal
        disableAnimation={true}
        isDismissable={false}
        isOpen={!!requestToConfirm}
        onOpenChange={handleCancel}
      >
        <ModalContent className="border border-[#104e35]/20">
          <ModalHeader className="text-[#104e35]">Confirmar</ModalHeader>
          <ModalBody>
            {requestToConfirm && (
              <p>
                Finalizar a documentação de{" "}
                <strong>{requestToConfirm.nome}</strong>?
              </p>
            )}
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button
              className="text-[#104e35] hover:bg-[#e8f4e3]"
              color="default"
              size="sm"
              variant="flat"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-[#104e35] to-[#0d3d29] text-white focus-visible:ring-2 focus-visible:ring-[#104e35]/40"
              isLoading={isConfirmLoading}
              size="sm"
              onClick={handleConfirm}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
