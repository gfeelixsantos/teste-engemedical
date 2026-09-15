"use client";

import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";

interface Article {
  tag: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  gradient: string;
}

const ARTICLES: Article[] = [
  {
    tag: "NR-35",
    title: "Trabalho em Altura: O que mudou nas novas diretrizes",
    excerpt: "Conheça as principais atualizações da NR-35 e como sua empresa pode se adequar às novas exigências de segurança.",
    date: "12 Set 2026",
    readTime: "4 min",
    gradient: "from-[#0d3224] to-[#1a7a56]",
  },
  {
    tag: "eSocial",
    title: "Eventos de SST no eSocial: Prazos e obrigações",
    excerpt: "Saiba quais eventos de Saúde e Segurança do Trabalho devem ser transmitidos e os prazos para cada tipo de empresa.",
    date: "08 Set 2026",
    readTime: "3 min",
    gradient: "from-[#1a1a2e] to-[#0f3460]",
  },
  {
    tag: "Dica",
    title: "Como reduzir afastamentos com um bom PCMSO",
    excerpt: "Empresas que investem em PCMSO eficiente reduzem em até 40% os afastamentos por doenças ocupacionais.",
    date: "01 Set 2026",
    readTime: "5 min",
    gradient: "from-[#0d3224] to-[#1a7a56]",
  },
];

export function NewsSection() {
  return (
    <section className="mt-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Blog & Notícias</h2>
          <p className="mt-1 text-sm text-gray-500">Fique por dentro das novidades em Saúde Ocupacional</p>
        </div>
        <button
          type="button"
          className="hidden items-center gap-1.5 text-sm font-semibold text-[#0d3224] transition-colors hover:text-[#1a7a56] sm:flex"
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((article, index) => (
          <motion.article
            key={article.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:border-[#aacf33]/30 hover:shadow-lg hover:shadow-[#aacf33]/5"
          >
            <div className={`flex h-20 items-end bg-gradient-to-br ${article.gradient} p-5`}>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                {article.tag}
              </span>
            </div>

            <div className="p-5">
              <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-[#0d3224]">
                {article.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
                {article.excerpt}
              </p>

              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readTime}
                </span>
                <span>{article.date}</span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
