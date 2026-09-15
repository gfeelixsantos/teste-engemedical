"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { getCurrentUser } from "@/lib/utils";
import { useEmpresas } from "@/components/cliente/EmpresaProvider";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import AppLoading from "@/components/shared/AppLoading";
import { HomeCarousel } from "@/components/cliente/HomeCarousel";
import { QuickDashboard } from "@/components/cliente/QuickDashboard";
import { ServicesGrid } from "@/components/cliente/ServicesGrid";
import { ContactBar } from "@/components/cliente/ContactBar";

function getGreeting(): string {
  const now = new Date();
  const brHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }),
    10,
  );
  if (brHour >= 5 && brHour < 12) return "Bom dia";
  if (brHour >= 12 && brHour < 18) return "Boa tarde";
  return "Boa noite";
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 sm:my-8">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </div>
  );
}

export default function ClienteDashboardPage() {
  const router = useRouter();
  const { selectedEmpresa, isLoading: empresasLoading } = useEmpresas();
  const [user, setUser] = useState<IUserInfo | null>(null);

  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);
  }, [router]);

  if (empresasLoading || !user) {
    return <AppLoading title="Carregando dashboard" description="Preparando seus dados..." />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#f0faf4]/60 via-white to-white px-4 py-4 sm:px-6 lg:px-8">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        aria-labelledby="welcome-title"
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          className="font-display text-3xl font-bold tracking-tight text-gray-900"
          id="welcome-title"
        >
          {greeting},{" "}
          <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-green-600 bg-clip-text text-transparent">
            {user.nome?.split(" ")[0]}
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
          Acompanhe em tempo real a saúde ocupacional dos seus colaboradores.
        </p>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid items-stretch gap-4 lg:grid-cols-[420px_1fr]"
      >
        <QuickDashboard />
        <HomeCarousel />
      </motion.div>

      <Divider />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <ServicesGrid />
      </motion.div>

      <Divider />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <ContactBar />
      </motion.div>
    </div>
  );
}
