"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  IUserInfo,
  IUserInfoSettings,
  IPscAuthStatus,
} from "@/lib/user/interfaces/IUser";
import { getCurrentUser, logout } from "@/lib/utils";
import { getUserSettings } from "@/lib/user/services/user-settings.service";
import { HeaderApp } from "@/components/shared/HeaderApp";
import CmsoLoading from "@/components/shared/CmsoLoading";

import { SectionId } from "./components/types";
import { SettingsSidebar } from "./components/SettingsSidebar";
import { AssinaturaDigitalSection } from "./components/sections/AssinaturaDigitalSection";
import { UnidadesSection } from "./components/sections/UnidadesSection";
import { UsuariosSection } from "./components/sections/UsuariosSection";
import { ExamesSection } from "./components/sections/ExamesSection";
import { PrestadoresSection } from "./components/sections/PrestadoresSection";
import { UsuarioSection } from "./components/sections/UsuarioSection";
import { AuditoriaSection } from "./components/sections/AuditoriaSection";
import { RiscosConfigSection } from "./components/sections/RiscosConfigSection";
import { EmpresasSection } from "./components/sections/EmpresasSection";
import { OrientacoesParecerSection } from "./components/sections/OrientacoesParecerSection";

const defaultPscAuthStatus: IPscAuthStatus = {
  status: "NOT_AUTHENTICATED",
  isActive: false,
  expiresAt: null,
  pscName: null,
};

export default function ConfiguracoesPage() {
  const router = useRouter();

  const [user, setUser] = useState<IUserInfo | null>(null);
  const [settings, setSettings] = useState<IUserInfoSettings | null>(null);
  const [pscAuthStatus, setPscAuthStatus] =
    useState<IPscAuthStatus>(defaultPscAuthStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] =
    useState<SectionId>("assinatura-digital");

  useEffect(() => {
    const initPage = async () => {
      const currentUser = getCurrentUser();

      if (!currentUser) {
        router.push("/");

        return;
      }

      setUser(currentUser);

      try {
        const { settings: userSettings, pscAuthStatus: authStatus } =
          await getUserSettings();

        if (userSettings) {
          setSettings(userSettings);
        }

        setPscAuthStatus(authStatus);
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initPage();
  }, [router]);

  if (isLoading || !user) {
    return <CmsoLoading />;
  }

  function renderSection() {
    switch (activeSection) {
      case "assinatura-digital":
        return (
          <AssinaturaDigitalSection
            pscAuthStatus={pscAuthStatus}
            settings={settings}
            user={user!}
          />
        );
      case "unidades":
        return <UnidadesSection />;
      case "usuarios":
        return <UsuariosSection user={user!} />;
      case "exames":
        return <ExamesSection />;
      case "prestadores":
        return <PrestadoresSection />;
      case "usuario":
        return <UsuarioSection user={user!} />;
      case "auditoria":
        return <AuditoriaSection user={user!} />;
      case "empresas":
        return <EmpresasSection user={user!} />;
      case "riscos":
        return <RiscosConfigSection />;
      case "orientacoes-parecer":
        return <OrientacoesParecerSection />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <HeaderApp
        onLogout={() => {
          logout();
          router.push("/");
        }}
      >
        <></>
      </HeaderApp>

      <main
        aria-label="Configurações do usuário"
        className="w-full px-4 sm:px-6 lg:px-8 py-6"
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Configurações
          </h1>

          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Sidebar */}
            <div className="md:w-64 md:flex-shrink-0">
              <SettingsSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                userPerfil={user?.perfil}
              />
            </div>

            {/* Área de conteúdo */}
            <div className="flex-1 min-w-0">{renderSection()}</div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
