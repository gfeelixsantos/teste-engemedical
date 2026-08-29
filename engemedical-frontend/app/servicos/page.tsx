"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tab, Tabs } from "@heroui/react";
import { FolderOpen, Layers } from "lucide-react";

import { HeaderApp } from "@/components/shared/HeaderApp";
import { FileExplorer } from "@/components/shared/FileExplorer";
import { ActiveConnectionsCard } from "@/components/shared/ActiveConnectionsCard";
import { getCurrentUser, logout } from "@/lib/utils";

import { QueueMonitor } from "./components/QueueMonitor";
import { TicketsMonitor } from "./components/TicketsMonitor";
import { ScheduledJobsMonitor } from "./components/ScheduledJobsMonitor";
import { CampaignManager } from "./components/campaigns/CampaignManager";
import { Card, CardBody, CardHeader } from "@heroui/react";

export default function ServicosPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("servicos");

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-default-50">
      <HeaderApp onLogout={logout} />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4">

        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          variant="underlined"
          color="success"
          size="lg"
          className="w-full"
        >
          <Tab
            key="servicos"
            title={
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Painel de Serviços
              </div>
            }
          >
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card isPressable onPress={() => setSelectedTab('campanhas')} className="border-none bg-background/60 dark:bg-default-100/50">
                <CardHeader className="flex gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-md font-bold">Comunicados</p>
                    <p className="text-small text-default-500">Disparo de E-mails</p>
                  </div>
                </CardHeader>
                <CardBody className="text-sm text-default-600">
                  Crie e dispare e-mails em massa com templates personalizados.
                </CardBody>
              </Card>

              <Card isPressable onPress={() => setSelectedTab('arquivos')} className="border-none bg-background/60 dark:bg-default-100/50">
                <CardHeader className="flex gap-3">
                  <div className="p-2 bg-success/10 text-success rounded-lg">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-md font-bold">Explorador de Arquivos</p>
                    <p className="text-small text-default-500">Acesse e gerencie arquivos</p>
                  </div>
                </CardHeader>
                <CardBody className="text-sm text-default-600">
                  Gerencie arquivos e documentos de clientes na nuvem.
                </CardBody>
              </Card>

              <Card isPressable onPress={() => setSelectedTab('filas')} className="border-none bg-background/60 dark:bg-default-100/50">
                <CardHeader className="flex gap-3">
                  <div className="p-2 bg-warning/10 text-warning rounded-lg">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-md font-bold">Filas & Serviços</p>
                    <p className="text-small text-default-500">Monitoramento de Jobs</p>
                  </div>
                </CardHeader>
                <CardBody className="text-sm text-default-600">
                  Monitore jobs, envios para o SOC e processamentos em background.
                </CardBody>
              </Card>
            </div>
          </Tab>

          <Tab
            key="campanhas"
            title={
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Comunicados (Campanhas)
              </div>
            }
          >
            <div className="mt-4">
              <CampaignManager />
            </div>
          </Tab>

          <Tab
            key="arquivos"
            title={
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Explorador de Arquivos
              </div>
            }
          >
            <div className="mt-4">
              <FileExplorer />
            </div>
          </Tab>

          <Tab
            key="filas"
            title={
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Filas & Conexões
              </div>
            }
          >
            <div className="mt-4 space-y-6">
              <ActiveConnectionsCard />
              <QueueMonitor />
              <TicketsMonitor />
              <ScheduledJobsMonitor />
            </div>
          </Tab>


        </Tabs>
      </main>
    </div>
  );
}
