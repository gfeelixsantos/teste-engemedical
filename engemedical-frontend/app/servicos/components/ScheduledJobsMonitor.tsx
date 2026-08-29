"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import {
  Clock,
  Calendar,
  Database,
  RefreshCw,
  FileText,
  ShieldCheck,
  ToggleLeft,
  Server,
  Hourglass,
} from "lucide-react";
import { motion } from "framer-motion";

interface ScheduledJob {
  name: string;
  expression: string;
  scheduleDescription: string;
  service: string;
  description: string;
  category: "manutencao" | "scraper" | "integracao";
  active: boolean;
}

export const ScheduledJobsMonitor: React.FC = () => {
  const jobs = useMemo<ScheduledJob[]>(() => [
    {
      name: "Janela de Manutenção Geral",
      expression: "1 0 * * *",
      scheduleDescription: "Diariamente às 00:01",
      service: "CronJobs.midnightMaintenanceWindow",
      description: "Limpa senhas/tickets antigos, reinicia o ChangeStream para o novo dia, roda sincronização com o SOC, limpa datas disponíveis expiradas e executa manutenção automática de agendamentos antigos (+90 dias).",
      category: "manutencao",
      active: true,
    },
    {
      name: "Reprocessamento e Assinaturas (ASO)",
      expression: "*/3 * * * *",
      scheduleDescription: "A cada 3 minutos",
      service: "AsoSignatureRetryCronService.handleAsoRetries",
      description: "Varre ASOs com falhas de geração ou pendências de assinatura BryKMS/PSC, enviando-os para reprocessamento ou elevando para assinatura digitalizada quando esgotam as tentativas.",
      category: "integracao",
      active: true,
    },
    {
      name: "Scraper Automático de Exames",
      expression: "0 6,9,14,18 * * *",
      scheduleDescription: "Às 06:00, 09:00, 14:00 e 18:00",
      service: "ScraperService.handleAutomaticScraping",
      description: "Inicia ciclos de varredura automatizada nos provedores integrados (Worklab, Cedill, Veitieka, Medical, Abel) para buscar laudos de exames laboratoriais e Raio-X.",
      category: "scraper",
      active: true,
    },
    {
      name: "Scraper de Meio-Dia",
      expression: "30 11 * * *",
      scheduleDescription: "Diariamente às 11:30",
      service: "ScraperService.handleMiddayScraping",
      description: "Ciclo intermediário de varredura de laudos laboratoriais e exames de imagem nos parceiros cadastrados.",
      category: "scraper",
      active: true,
    },
    {
      name: "Limpeza de Tickets e Senhas",
      expression: "45 12 * * *",
      scheduleDescription: "Diariamente às 12:45",
      service: "CronJobs.middayJob",
      description: "Limpa e exclui tickets de atendimento antigos acumulados na base do Supabase.",
      category: "manutencao",
      active: true,
    },
    {
      name: "Reconciliação do Painel de TV",
      expression: "*/5 * * * *",
      scheduleDescription: "A cada 5 minutos",
      service: "CronJobs.reconcileActiveTickets",
      description: "Monitor de integridade que corrige discrepâncias nos status de tickets ativos exibidos no painel da clínica.",
      category: "manutencao",
      active: true,
    },
    {
      name: "Inativação Mensal no SOC",
      expression: "30 18 24 * *",
      scheduleDescription: "Todo dia 24 às 18:30",
      service: "CronJobs.socInactivationJob",
      description: "Executa a rotina automática de inativação de funcionários desligados diretamente na plataforma do SOC.",
      category: "integracao",
      active: true,
    },
    {
      name: "Limpeza de Importações GED",
      expression: "0 3 * * *",
      scheduleDescription: "Diariamente às 03:00",
      service: "CronJobs.cleanupOldGedBatchJobs",
      description: "Exclui registros temporários e arquivos de lotes de importação do GED antigos da base de dados.",
      category: "manutencao",
      active: true,
    },
  ], []);

  const getCategoryIcon = (category: ScheduledJob["category"]) => {
    switch (category) {
      case "manutencao":
        return <Database className="h-4 w-4 text-primary" />;
      case "scraper":
        return <RefreshCw className="h-4 w-4 text-success" />;
      case "integracao":
        return <ShieldCheck className="h-4 w-4 text-warning" />;
    }
  };

  const getCategoryChipColor = (category: ScheduledJob["category"]) => {
    switch (category) {
      case "manutencao":
        return "primary";
      case "scraper":
        return "success";
      case "integracao":
        return "warning";
    }
  };

  const getCategoryLabel = (category: ScheduledJob["category"]) => {
    switch (category) {
      case "manutencao":
        return "Manutenção";
      case "scraper":
        return "Scraper / Varredura";
      case "integracao":
        return "Integração / SOC";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="rounded-xl bg-gradient-to-br from-[#104e35] to-[#0a3121] p-5 shadow-lg">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#b8d864]" />
            Serviços Agendados (Cron Jobs)
          </h3>
          <p className="mt-1 text-sm text-white/70">
            Acompanhamento das tarefas automáticas de manutenção, varreduras e integrações em background
          </p>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-success" />
              <span className="font-semibold text-gray-800 text-sm">Cron Jobs Ativos no Servidor</span>
            </div>
            <Chip size="sm" color="success" variant="flat" startContent={<Hourglass className="h-3 w-3" />}>
              Fuso Horário: America/Sao_Paulo
            </Chip>
          </CardHeader>
          <CardBody className="p-0">
            <Table
              aria-label="Tabela de Serviços Agendados"
              className="border-none"
              removeWrapper
            >
              <TableHeader>
                <TableColumn className="bg-white text-gray-400 font-semibold text-xs py-3 border-b border-gray-100">SERVIÇO</TableColumn>
                <TableColumn className="bg-white text-gray-400 font-semibold text-xs py-3 border-b border-gray-100">CATEGORIA</TableColumn>
                <TableColumn className="bg-white text-gray-400 font-semibold text-xs py-3 border-b border-gray-100">AGENDAMENTO</TableColumn>
                <TableColumn className="bg-white text-gray-400 font-semibold text-xs py-3 border-b border-gray-100">DESCRIÇÃO</TableColumn>
                <TableColumn className="bg-white text-gray-400 font-semibold text-xs py-3 border-b border-gray-100 text-right">STATUS</TableColumn>
              </TableHeader>
              <TableBody>
                {jobs.map((job, idx) => (
                  <TableRow key={job.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 text-sm">{job.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{job.service}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Chip
                        size="sm"
                        color={getCategoryChipColor(job.category)}
                        variant="flat"
                        startContent={getCategoryIcon(job.category)}
                        className="font-medium"
                      >
                        {getCategoryLabel(job.category)}
                      </Chip>
                    </TableCell>
                    <TableCell className="py-4 text-xs font-semibold text-gray-600">
                      {job.scheduleDescription}
                    </TableCell>
                    <TableCell className="py-4 text-xs text-default-500 max-w-[320px]">
                      {job.description}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <Chip size="sm" color="success" variant="solid" className="font-bold text-[10px] text-white">
                        ATIVO
                      </Chip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
