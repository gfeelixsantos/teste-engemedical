"use client";

import { Button, Card, CardBody, CardHeader, Chip, Divider, ScrollShadow, Progress } from "@heroui/react";
import { ArrowLeft, Mail, Paperclip, Users, User, Reply, Building, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { campaignsClient } from "@/lib/campaigns/campaigns-client";

interface CampaignViewDetailProps {
  campaign: any;
  onBack: () => void;
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

export function CampaignViewDetail({ campaign, onBack }: CampaignViewDetailProps) {
  const [progressData, setProgressData] = useState<any>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (campaign?.status === 'processing') {
      const fetchProgress = async () => {
        try {
          const data = await campaignsClient.getCampaignProgress(campaign.id);
          setProgressData(data);
        } catch (error) {
          console.error("Failed to fetch progress", error);
        }
      };
      fetchProgress();
      interval = setInterval(fetchProgress, 5000); // poll every 5s
    } else if (campaign && ['completed', 'failed', 'completed_with_failures'].includes(campaign.status)) {
      // Fetch once if it's already done just to show final stats
      campaignsClient.getCampaignProgress(campaign.id).then(setProgressData).catch(console.error);
    }
    return () => clearInterval(interval);
  }, [campaign]);

  if (!campaign) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="light" 
          startContent={<ArrowLeft size={16} />} 
          onPress={onBack}
        >
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">{campaign.name}</h2>
        <Chip color={statusColorMap[campaign.status] || "default"} size="sm" variant="flat">
          {statusLabelMap[campaign.status] || campaign.status.toUpperCase()}
        </Chip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna da esquerda - Meta dados */}
        <div className="md:col-span-1 flex flex-col gap-4">
          
          {/* Card: Dados da Campanha */}
          <Card className="border-none bg-background/60 dark:bg-default-100/50">
            <CardHeader className="flex gap-3 pb-2">
              <Building className="h-5 w-5 text-primary" />
              <div className="flex flex-col text-left">
                <p className="text-md font-bold">Dados da Campanha</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="text-sm flex flex-col gap-3">
              <div>
                <span className="font-semibold block text-default-500 mb-1">Criado em</span>
                <p>{campaign.created_at ? new Date(campaign.created_at).toLocaleString('pt-BR') : 'N/A'}</p>
              </div>

              {campaign.requested_by_nome && (
                <div>
                  <span className="font-semibold block text-default-500 mb-1">Criado por</span>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-default-400" />
                    <span>{campaign.requested_by_nome} {campaign.requested_by_unidade ? `(${campaign.requested_by_unidade})` : ''}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold block text-default-500 mb-2">Escopo de Envio</span>
                <div className="flex flex-col gap-2">
                  {(() => {
                    const sources = campaign.target_sources && campaign.target_sources.length > 0
                      ? campaign.target_sources
                      : [campaign.scope || 'all'];

                    return sources.map((src: string) => {
                      if (src === 'all') {
                        return (
                          <div key={src} className="flex items-center gap-2 text-xs bg-default-100 dark:bg-default-200 px-2.5 py-1.5 rounded-lg border border-default-200 font-medium">
                            <Building size={14} className="text-primary" />
                            <span>Todas as Empresas SOC</span>
                          </div>
                        );
                      }
                      if (src === 'selected') {
                        return (
                          <div key={src} className="flex items-center justify-between text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50 font-medium">
                            <div className="flex items-center gap-2">
                              <Building size={14} className="text-blue-500" />
                              <span>Empresas Selecionadas</span>
                            </div>
                            <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px] font-bold">
                              {campaign.selected_company_codes?.length || 0}
                            </Chip>
                          </div>
                        );
                      }
                      if (src === 'app_users') {
                        const totalUsers = campaign.target_app_user_ids?.length;
                        return (
                          <div key={src} className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50 font-medium">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-emerald-500" />
                              <span>Usuários da Aplicação</span>
                            </div>
                            <Chip size="sm" variant="flat" color="success" className="h-5 text-[10px] font-bold">
                              {totalUsers > 0 ? totalUsers : "Todos"}
                            </Chip>
                          </div>
                        );
                      }
                      if (src === 'custom_emails') {
                        return (
                          <div key={src} className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-2.5 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/50 font-medium">
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-amber-500" />
                              <span>Lista Customizada</span>
                            </div>
                            <Chip size="sm" variant="flat" color="warning" className="h-5 text-[10px] font-bold">
                              {campaign.custom_emails?.length || 0}
                            </Chip>
                          </div>
                        );
                      }
                      return null;
                    });
                  })()}
                </div>
              </div>

              {progressData && (
                <div className="mt-2 p-3 bg-default-100 rounded-lg">
                  <span className="font-semibold block text-default-600 mb-2 flex items-center gap-2">
                    <Activity size={14} className="text-primary" />
                    Progresso de Envio
                  </span>
                  <Progress 
                    size="sm" 
                    value={progressData.percentage} 
                    color={progressData.percentage === 100 ? "success" : "primary"}
                    showValueLabel={true}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-default-500">
                    <span>Enviados: <strong className="text-success">{progressData.sent}</strong></span>
                    <span>Falhas: <strong className="text-danger">{progressData.failed}</strong></span>
                    <span>Aguardando: <strong className="text-warning">{progressData.pending + progressData.processing}</strong></span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Card: Informações do E-mail */}
          <Card className="border-none bg-background/60 dark:bg-default-100/50">
            <CardHeader className="flex gap-3 pb-2">
              <Mail className="h-5 w-5 text-primary" />
              <div className="flex flex-col text-left">
                <p className="text-md font-bold">Informações do E-mail</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="text-sm flex flex-col gap-3">
              <div>
                <span className="font-semibold block text-default-500 mb-1">Assunto</span>
                <p>{campaign.subject}</p>
              </div>
              
              {campaign.from_name && (
                <div>
                  <span className="font-semibold block text-default-500 mb-1">Nome do Remetente</span>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-default-400" />
                    <span>{campaign.from_name}</span>
                  </div>
                </div>
              )}

              {campaign.reply_to && (
                <div>
                  <span className="font-semibold block text-default-500 mb-1">Responder Para</span>
                  <div className="flex items-center gap-2">
                    <Reply size={14} className="text-default-400" />
                    <span>{campaign.reply_to}</span>
                  </div>
                </div>
              )}

              {(campaign.cc?.length > 0 || campaign.bcc?.length > 0) && (
                <div>
                  <span className="font-semibold block text-default-500 mb-1">Cópias Ocultas / CC</span>
                  <div className="flex flex-col gap-1">
                    {campaign.cc?.map((email: string) => (
                      <span key={email} className="text-default-600 flex items-center gap-2">
                        <span className="text-xs font-bold text-default-400 w-6">CC</span> {email}
                      </span>
                    ))}
                    {campaign.bcc?.map((email: string) => (
                      <span key={email} className="text-default-600 flex items-center gap-2">
                        <span className="text-xs font-bold text-default-400 w-6">BCC</span> {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {campaign.attachments?.length > 0 && (
                <div>
                  <span className="font-semibold block text-default-500 mb-1">Anexos ({campaign.attachments.length})</span>
                  <div className="flex flex-col gap-1">
                    {campaign.attachments.map((att: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-primary">
                        <Paperclip size={14} />
                        <span className="truncate" title={att.name}>{att.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Coluna da direita - Preview do Corpo HTML */}
        <div className="md:col-span-2">
          <Card className="h-full border-none shadow-sm flex flex-col">
            <CardHeader className="flex gap-3 pb-2">
              <div className="flex flex-col text-left">
                <p className="text-md font-bold">Pré-visualização do Corpo do E-mail</p>
                <p className="text-xs text-default-400">Variáveis como {'{{NOME_EMPRESA}}'} serão substituídas dinamicamente.</p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="p-0">
              <ScrollShadow className="h-[600px] w-full p-4 bg-white text-black dark:bg-[#1a1a1a] dark:text-white overflow-auto rounded-b-xl">
                {campaign.html_body ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: campaign.html_body }} 
                    style={{ all: 'revert', fontFamily: 'sans-serif' }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap p-4 font-mono text-sm">
                    {campaign.text_body || "Nenhum conteúdo definido."}
                  </div>
                )}
              </ScrollShadow>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
