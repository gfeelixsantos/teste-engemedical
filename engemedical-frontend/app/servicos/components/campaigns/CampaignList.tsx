"use client";

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Button, Tooltip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Play, Edit, Trash2, Search, XCircle, Copy } from "lucide-react";
import { campaignsClient } from "@/lib/campaigns/campaigns-client";
import { useState } from "react";

interface CampaignListProps {
  campaigns: any[];
  onEdit: (campaign: any) => void;
  onView: (campaign: any) => void;
  onClone: (campaign: any) => void;
  onRefresh: () => void;
}

const statusColorMap: Record<string, any> = {
  draft: "default",
  active: "primary",
  processing: "warning",
  completed: "success",
  cancelling: "danger",
  deleted: "danger"
};

const statusLabelMap: Record<string, string> = {
  draft: "RASCUNHO",
  active: "ATIVA",
  processing: "PROCESSANDO",
  completed: "CONCLUÍDA",
  cancelling: "CANCELANDO",
  deleted: "EXCLUÍDA"
};

const scopeLabelMap: Record<string, string> = {
  all: "Todas as Empresas",
  app_users: "Usuários da Aplicação",
  custom_emails: "Lista Customizada",
  selected: "Empresas Selecionadas"
};

export function CampaignList({ campaigns, onEdit, onView, onClone, onRefresh }: CampaignListProps) {
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: "primary" | "success" | "danger";
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
    isLoading: false,
  });

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void>, confirmColor: "primary" | "success" | "danger" = "primary", confirmText = "Confirmar") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      confirmColor,
      onConfirm,
      isLoading: false,
    });
  };

  const handlePublish = async (id: string) => {
    openConfirm(
      "Iniciar Disparo da Campanha",
      "Deseja realmente publicar e iniciar o disparo desta campanha para todas as empresas selecionadas?",
      async () => {
        try {
          await campaignsClient.publishCampaign(id);
          onRefresh();
        } catch (error) {
          console.error("Failed to publish campaign", error);
        }
      },
      "success",
      "Iniciar Disparo"
    );
  };

  const handleCancel = async (id: string) => {
    openConfirm(
      "Cancelar Campanha",
      "Deseja realmente cancelar os envios restantes desta campanha? Essa ação não pode ser desfeita.",
      async () => {
        try {
          await campaignsClient.cancelCampaign(id);
          onRefresh();
        } catch (error) {
          console.error("Failed to cancel campaign", error);
        }
      },
      "danger",
      "Cancelar Envios"
    );
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      "Excluir Campanha",
      "Deseja realmente excluir permanentemente esta campanha? Isso apagará também os registros de envio.",
      async () => {
        try {
          await campaignsClient.deleteCampaign(id);
          onRefresh();
        } catch (error) {
          console.error("Failed to delete campaign", error);
        }
      },
      "danger",
      "Excluir Permanente"
    );
  };

  return (
    <>
    <Table aria-label="Lista de campanhas">
      <TableHeader>
        <TableColumn>NOME</TableColumn>
        <TableColumn>ASSUNTO</TableColumn>
        <TableColumn>ESCOPO</TableColumn>
        <TableColumn>STATUS</TableColumn>
        <TableColumn>CRIADO EM</TableColumn>
        <TableColumn>AÇÕES</TableColumn>
      </TableHeader>
      <TableBody emptyContent={"Nenhuma campanha encontrada."} items={campaigns}>
        {(item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="font-semibold cursor-pointer text-primary" onClick={() => onView(item)}>
                {item.name}
              </div>
            </TableCell>
            <TableCell>{item.subject}</TableCell>
            <TableCell>
              {(() => {
                const sources = item.target_sources && item.target_sources.length > 0
                  ? item.target_sources
                  : [item.scope || 'all'];

                return sources.map((src: string) => scopeLabelMap[src] || "Empresas Selecionadas").join(", ");
              })()}
            </TableCell>
            <TableCell>
              <Chip color={statusColorMap[item.status]} size="sm" variant="flat">
                {statusLabelMap[item.status] || item.status.toUpperCase()}
              </Chip>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span>{new Date(item.created_at).toLocaleString('pt-BR')}</span>
                {item.requested_by_nome && (
                  <span className="text-xs text-default-400">{item.requested_by_nome}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {(item.status === 'draft' || item.status === 'active') && (
                  <Tooltip content="Editar Campanha">
                    <Button isIconOnly size="sm" variant="light" onPress={() => onEdit(item)}>
                      <Edit className="w-4 h-4 text-default-500" />
                    </Button>
                  </Tooltip>
                )}
                {item.status === 'draft' && (() => {
                  const missingName = !item.name || item.name.trim() === '';
                  const missingSubject = !item.subject || item.subject.trim() === '';
                  const isIncomplete = missingName || missingSubject;
                  const tooltipMsg = isIncomplete
                    ? `Preencha antes de disparar: ${[missingName && 'Nome da campanha', missingSubject && 'Assunto do e-mail'].filter(Boolean).join(' e ')}`
                    : 'Publicar e Iniciar Envio';

                  return (
                    <Tooltip content={tooltipMsg} color={isIncomplete ? 'danger' : 'foreground'}>
                      <span>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color={isIncomplete ? 'default' : 'success'}
                          isDisabled={isIncomplete}
                          onPress={() => handlePublish(item.id)}
                        >
                          <Play className={`w-4 h-4 ${isIncomplete ? 'text-default-300' : ''}`} />
                        </Button>
                      </span>
                    </Tooltip>
                  );
                })()}
                {(item.status === 'active' || item.status === 'processing') && (
                  <Tooltip content="Cancelar Envios Restantes">
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleCancel(item.id)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                )}
                {['completed', 'completed_with_failures', 'cancelled'].includes(item.status) && (
                  <Tooltip content="Duplicar / Reenviar">
                    <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => onClone(item)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                )}
                <Tooltip content="Excluir Permanentemente">
                  <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>

    <Modal 
      isOpen={confirmModal.isOpen} 
      onOpenChange={(open) => !confirmModal.isLoading && setConfirmModal(prev => ({ ...prev, isOpen: open }))}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>{confirmModal.title}</ModalHeader>
            <ModalBody>
              <p>{confirmModal.message}</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} isDisabled={confirmModal.isLoading}>
                Voltar
              </Button>
              <Button 
                color={confirmModal.confirmColor} 
                isLoading={confirmModal.isLoading}
                className="text-white"
                onPress={async () => {
                  setConfirmModal(prev => ({ ...prev, isLoading: true }));
                  await confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
                }}
              >
                {confirmModal.confirmText}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
    </>
  );
}
