"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-24 sm:py-32 lg:px-8">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(var(--heroui-primary-rgb),0.05)_0%,transparent_100%)]" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-8">
          <motion.div
            animate={{ scale: 1 }}
            className="relative"
            initial={{ scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2,
            }}
          >
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 text-primary">
              <Search className="w-12 h-12" />
            </div>
          </motion.div>
        </div>

        <motion.p
          animate={{ opacity: 1 }}
          className="text-base font-semibold text-primary"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.3 }}
        >
          404 - Página não encontrada
        </motion.p>

        <motion.h1
          animate={{ opacity: 1 }}
          className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.4 }}
        >
          Ops! Onde estamos?
        </motion.h1>

        <motion.p
          animate={{ opacity: 1 }}
          className="mt-6 text-base leading-7 text-muted-foreground max-w-md mx-auto"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5 }}
        >
          Lamentamos, mas não conseguimos encontrar a página que você está
          procurando. Pode ser que o endereço tenha mudado ou a página tenha
          sido removida.
        </motion.p>

        <motion.div
          animate={{ opacity: 1 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            as={Link}
            className="font-medium shadow-lg shadow-primary/20 w-full sm:w-auto"
            color="primary"
            href="/"
            size="lg"
            startContent={<Home className="w-4 h-4" />}
            variant="solid"
          >
            Voltar ao Início
          </Button>

          <Button
            as="button"
            className="font-medium w-full sm:w-auto"
            size="lg"
            startContent={<ArrowLeft className="w-4 h-4" />}
            variant="flat"
            onClick={() => window.history.back()}
          >
            Voltar Página
          </Button>
        </motion.div>
      </motion.div>

      {/* Subtle bottom text or links */}
      <motion.div
        animate={{ opacity: 0.5 }}
        className="absolute bottom-8 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        transition={{ delay: 1 }}
      >
        © {new Date().getFullYear()} CMSO 360 - Sistema Médico Integrado
      </motion.div>
    </div>
  );
}
