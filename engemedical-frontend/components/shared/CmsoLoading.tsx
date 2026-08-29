"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function CmsoLoading() {
  return (
    <main
      aria-label="Carregando conteúdo"
      className="min-h-screen bg-white flex items-center justify-center"
    >
      <motion.div
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          priority
          alt="CMSO 360°"
          className="h-16 w-auto mb-4"
          height={64}
          src="/images/logo.png"
          width={160}
        />
        <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: "100%" }}
            className="h-1 bg-gradient-to-r from-[#104e35] to-[#a6ce39] rounded-full"
            initial={{ width: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
          <p className="text-gray-600 text-sm mt-4">Carregando...</p>
        </div>
      </motion.div>
    </main>
  );
}
