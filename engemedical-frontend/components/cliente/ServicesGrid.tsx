"use client";

import Image from "next/image";

interface Service {
  title: string;
  description: string;
  image: string;
}

const SERVICES: Service[] = [
  {
    title: "PCMSO",
    description: "Programa de Controle Médico de Saúde Ocupacional conforme NR-7, monitorando a saúde dos trabalhadores de forma contínua.",
    image: "/images/servicos/pcmso.png",
  },
  {
    title: "PGR",
    description: "Programa de Gerenciamento de Riscos com inventário de perigos e avaliação de riscos para prevenir doenças ocupacionais.",
    image: "/images/servicos/pgr.png",
  },
  {
    title: "LTCAT",
    description: "Laudos Técnicos das Condições do Ambiente do Trabalho para emissão do PPP e atendimento ao INSS.",
    image: "/images/servicos/ltcat.png",
  },
  {
    title: "ASO",
    description: "Atestado de Saúde Ocupacional com exames admissionais, periódicos, retorno ao trabalho, mudança e demissional.",
    image: "/images/servicos/aso.png",
  },
  {
    title: "Treinamentos NR",
    description: "Capacitação em Normas Regulamentadoras: NR-10, NR-12, NR-18, NR-20, NR-33, NR-35 presencial e EAD.",
    image: "/images/servicos/treinamentos.png",
  },
  {
    title: "eSocial SST",
    description: "Gestão completa de eventos de Saúde e Segurança do Trabalho com transmissão direta ao eSocial.",
    image: "/images/servicos/esocial.png",
  },
  {
    title: "Engenharia",
    description: "Projetos e inspeções em instalações elétricas (NR-10), máquinas (NR-12), caldeiras (NR-13) e trabalho em altura.",
    image: "/images/servicos/engenharia.png",
  },
  {
    title: "Perícias Trabalhistas",
    description: "Assessoria técnica especializada em perícias trabalhistas com laudos detalhados e consultoria assertiva.",
    image: "/images/servicos/pericia.png",
  },
];

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="group relative h-[180px] w-[320px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 shadow-lg transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:shadow-[#16804D]/15">
      <Image
        src={service.image}
        alt={service.title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-110"
        sizes="320px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d3224]/95 via-[#0d3224]/60 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <h3 className="text-lg font-bold text-white drop-shadow-md">{service.title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-white/80 line-clamp-2">{service.description}</p>
      </div>
    </div>
  );
}

export function ServicesGrid() {
  const all = [...SERVICES, ...SERVICES, ...SERVICES];

  return (
    <section>
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Nossos Serviços</h2>
        <p className="mt-1 text-sm text-gray-500">Soluções completas em Saúde Ocupacional e Segurança do Trabalho</p>
      </div>

      <div className="overflow-hidden">
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.333%); }
          }
          .marquee-row:hover .marquee-track {
            animation-play-state: paused;
          }
        `}</style>

        <div className="marquee-row relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-gray-50 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-gray-50 to-transparent" />
          <div
            className="marquee-track flex gap-5"
            style={{ animation: "marquee 90s linear infinite", width: "max-content" }}
          >
            {all.map((s, i) => (
              <ServiceCard key={i} service={s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
