"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Image } from "@heroui/react";
import { Monitor, Sun, CloudRain, Cloud, CloudLightning, CloudSnow, CloudFog, Wind, Thermometer, Droplets, Calendar, Clock, MapPin } from "lucide-react";
import { MuralItem } from "@/lib/mural/types";
import { SERVICES_KEY, NEXT_WS_URL } from "@/config/constants";
import { io } from "socket.io-client";

export default function MuralPage() {
  return (
    <Suspense fallback={null}>
      <MuralContent />
    </Suspense>
  );
}

function getWeatherIcon(condition: string) {
  const c = (condition || "").toLowerCase();
  if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return "rain";
  if (c.includes("storm") || c.includes("thunder")) return "storm";
  if (c.includes("snow") || c.includes("sleet") || c.includes("ice")) return "snow";
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return "fog";
  if (c.includes("cloud") || c.includes("overcast") || c.includes("nublado")) return "cloud";
  if (c.includes("clear") || c.includes("sun") || c.includes("limpo") || c.includes("sol")) return "sun";
  if (c.includes("night") || c.includes("noite")) return "night";
  return "cloud";
}

function getWeatherBackground(condition: string) {
  const type = getWeatherIcon(condition);
  switch (type) {
    case "sun":
      return "bg-gradient-to-br from-[#0c3e25] via-[#2b5e3c] to-[#7fae29]";
    case "rain":
      return "bg-gradient-to-br from-[#1a2e3b] via-[#283d4c] to-[#101b24]";
    case "storm":
      return "bg-gradient-to-br from-[#131a24] via-[#202936] to-[#0b1017]";
    case "snow":
      return "bg-gradient-to-br from-[#2a3c4a] via-[#384c5c] to-[#1d2933]";
    case "fog":
      return "bg-gradient-to-br from-[#273a38] via-[#384d4b] to-[#182625]";
    case "night":
      return "bg-gradient-to-br from-[#060c15] via-[#0e1d2f] to-[#03070c]";
    case "cloud":
    default:
      return "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]";
  }
}

function WeatherMainIcon({ condition, size = 64 }: { condition: string; size?: number }) {
  const type = getWeatherIcon(condition);
  switch (type) {
    case "sun":
      return (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
          <Sun size={size} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
        </motion.div>
      );
    case "rain":
      return (
        <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
          <CloudRain size={size} className="text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.5)]" />
        </motion.div>
      );
    case "storm":
      return (
        <motion.div animate={{ y: [0, -3, 0], opacity: [1, 0.7, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
          <CloudLightning size={size} className="text-purple-400 drop-shadow-[0_0_20px_rgba(192,132,252,0.5)]" />
        </motion.div>
      );
    case "snow":
      return (
        <motion.div animate={{ y: [0, 3, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <CloudSnow size={size} className="text-cyan-200 drop-shadow-[0_0_20px rgba(186,230,253,0.5)]" />
        </motion.div>
      );
    case "fog":
      return (
        <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }}>
          <CloudFog size={size} className="text-gray-300 drop-shadow-[0_0_15px rgba(209,213,219,0.3)]" />
        </motion.div>
      );
    case "night":
      return (
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
          <Cloud size={size} className="text-indigo-300 drop-shadow-[0_0_15px rgba(165,180,252,0.4)]" />
        </motion.div>
      );
    default:
      return (
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <Cloud size={size} className="text-gray-200 drop-shadow-[0_0_15px rgba(229,231,235,0.3)]" />
        </motion.div>
      );
  }
}

function ForecastIcon({ condition, size = 24 }: { condition: string; size?: number }) {
  const type = getWeatherIcon(condition);
  switch (type) {
    case "sun": return <Sun size={size} className="text-yellow-400" />;
    case "rain": return <CloudRain size={size} className="text-blue-400" />;
    case "storm": return <CloudLightning size={size} className="text-purple-400" />;
    case "snow": return <CloudSnow size={size} className="text-cyan-200" />;
    case "fog": return <CloudFog size={size} className="text-gray-400" />;
    case "night": return <Cloud size={size} className="text-indigo-300" />;
    default: return <Cloud size={size} className="text-gray-300" />;
  }
}

function getForecastColors(description: string, max: number) {
  const c = (description || "").toLowerCase();
  const isRain = c.includes("rain") || c.includes("chuva") || c.includes("shower") || c.includes("drizzle");
  const isStorm = c.includes("storm") || c.includes("thunder") || c.includes("tempestade");
  const isSnow = c.includes("snow") || c.includes("neve") || c.includes("sleet") || c.includes("ice");
  const isFog = c.includes("fog") || c.includes("mist") || c.includes("haze") || c.includes("nevoa") || c.includes("névoa");
  const isClear = c.includes("clear") || c.includes("sun") || c.includes("limpo") || c.includes("sol") || c.includes("ensolarado");

  if (isStorm) return {
    bg: "from-purple-500/[0.12] to-slate-500/[0.06]",
    border: "border-purple-400/[0.18]",
    iconBg: "bg-purple-500/[0.15]",
    minColor: "text-blue-300/80",
    maxColor: "text-purple-300/80",
    barGradient: "linear-gradient(to right, #a78bfa, #94a3b8, #c084fc)",
  };
  if (isSnow) return {
    bg: "from-cyan-400/[0.12] to-blue-300/[0.06]",
    border: "border-cyan-300/[0.18]",
    iconBg: "bg-cyan-300/[0.15]",
    minColor: "text-cyan-200/80",
    maxColor: "text-blue-200/80",
    barGradient: "linear-gradient(to right, #67e8f9, #93c5fd, #bae6fd)",
  };
  if (isRain) return {
    bg: "from-slate-400/[0.12] to-gray-500/[0.06]",
    border: "border-slate-400/[0.18]",
    iconBg: "bg-slate-400/[0.15]",
    minColor: "text-slate-300/80",
    maxColor: "text-slate-200/80",
    barGradient: "linear-gradient(to right, #94a3b8, #cbd5e1, #64748b)",
  };
  if (isFog) return {
    bg: "from-gray-400/[0.10] to-slate-400/[0.05]",
    border: "border-gray-400/[0.15]",
    iconBg: "bg-gray-400/[0.12]",
    minColor: "text-gray-300/80",
    maxColor: "text-gray-200/80",
    barGradient: "linear-gradient(to right, #9ca3af, #d1d5db, #6b7280)",
  };
  if (isClear || max >= 30) return {
    bg: "from-amber-400/[0.10] to-yellow-300/[0.05]",
    border: "border-amber-300/[0.15]",
    iconBg: "bg-amber-400/[0.12]",
    minColor: "text-amber-200/80",
    maxColor: "text-amber-300/80",
    barGradient: "linear-gradient(to right, #fbbf24, #fde68a, #f59e0b)",
  };
  if (max <= 15) return {
    bg: "from-blue-400/[0.12] to-cyan-300/[0.06]",
    border: "border-blue-300/[0.18]",
    iconBg: "bg-blue-400/[0.15]",
    minColor: "text-blue-200/80",
    maxColor: "text-blue-300/80",
    barGradient: "linear-gradient(to right, #60a5fa, #93c5fd, #3b82f6)",
  };
  if (max <= 22) return {
    bg: "from-teal-400/[0.10] to-emerald-300/[0.05]",
    border: "border-teal-300/[0.15]",
    iconBg: "bg-teal-400/[0.12]",
    minColor: "text-teal-200/80",
    maxColor: "text-teal-300/80",
    barGradient: "linear-gradient(to right, #2dd4bf, #6ee7b7, #14b8a6)",
  };
  return {
    bg: "from-slate-300/[0.08] to-white/[0.04]",
    border: "border-white/[0.10]",
    iconBg: "bg-white/[0.08]",
    minColor: "text-slate-300/80",
    maxColor: "text-slate-200/80",
    barGradient: "linear-gradient(to right, #94a3b8, #e2e8f0, #64748b)",
  };
}

function MuralContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [murais, setMurais] = useState<MuralItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activated, setActivated] = useState(false);
  const [isLiberado, setIsLiberado] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [unidade, setUnidade] = useState("RIO CLARO");
  const [weatherData, setWeatherData] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchWeather = useCallback(async (city: string) => {
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error("Erro ao buscar clima");
      const data = await res.json();
      if (data && data.results) {
        setWeatherData(data.results);
      }
    } catch (err) {
      console.error("Falha ao buscar clima:", err);
    }
  }, []);

  const fetchMurais = useCallback(async () => {
    try {
      const res = await fetch(`/api/mural/ativos`);
      if (!res.ok) throw new Error("Erro ao buscar murais");
      const data = await res.json();
      if (Array.isArray(data)) {
        // Injetar o slide de clima virtual ao final da lista
        const weatherSlide: MuralItem = {
          id: "virtual_weather",
          LAYOUTTYPE: "WEATHER",
          TITLE: "Previsão do Tempo",
          ACTIVE: true,
          STYLES: {
            BACKGROUNDCOLOR: "#0e2340",
            TEXTCOLOR: "#ffffff",
          },
          CREATEDAT: new Date().toISOString(),
          UPDATEDAT: new Date().toISOString(),
        };
        setMurais([...data, weatherSlide]);
        setError(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPreview) {
      setIsLiberado(true);
      setActivated(true);
      fetchMurais();
      fetchWeather("RIO CLARO");
      return;
    }
    const saved = localStorage.getItem("mural_validate");
    const savedUnidade = localStorage.getItem("mural_unidade") || "RIO CLARO";
    setUnidade(savedUnidade);
    if (saved === "true") {
      setIsLiberado(true);
      fetchMurais();
      fetchWeather(savedUnidade);
    }
  }, [fetchMurais, fetchWeather, isPreview]);

  useEffect(() => {
    if (!isLiberado) return;

    // Conexão WebSocket para atualização em tempo real
    const socket = io(NEXT_WS_URL, {
      auth: {
        type: "MURAL",
      },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("Mural conectado ao WebSocket, sincronizando dados...");
      fetchMurais();
    });

    socket.on("mural_alterado", () => {
      console.log("Mural alterado detectado via WS, atualizando lista...");
      fetchMurais();
    });

    return () => {
      socket.disconnect();
    };
  }, [isLiberado, fetchMurais]);

  useEffect(() => {
    if (!isLiberado || !unidade) return;

    // Buscar clima a cada 15 minutos
    const interval = setInterval(() => {
      fetchWeather(unidade);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLiberado, unidade, fetchWeather]);

  const validarAcesso = () => {
    if (serialInput === SERVICES_KEY) {
      setIsLiberado(true);
      localStorage.setItem("mural_validate", "true");
      localStorage.setItem("mural_unidade", unidade);
      fetchWeather(unidade);
    } else {
      alert("Chave inválida!");
    }
  };

  const handleActivate = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen();
    } else if ((el as any).msRequestFullscreen) {
      (el as any).msRequestFullscreen();
    }
    setActivated(true);
  };

  useEffect(() => {
    if (murais.length === 0) return;

    const current = murais[index];
    if (current && current.LAYOUTTYPE === "VIDEO") {
      // Para vídeos, deixamos o onEnded do elemento HTML5 controlar o fluxo.
      // Adicionamos um timeout de fallback longo (60s) para segurança contra travamentos.
      timerRef.current = setTimeout(() => {
        setIndex((prev) => (prev + 1) % murais.length);
      }, 60000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    const duration = 18000;

    timerRef.current = setTimeout(() => {
      setIndex((prev) => (prev + 1) % murais.length);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, murais]);

  useEffect(() => {
    if (murais.length === 0) return;
    const current = murais[index];
    if (current && current.LAYOUTTYPE === "VIDEO" && videoRef.current) {
      // Forçar recarregamento do source do vídeo para garantir o player atualizado
      videoRef.current.load();
      // Tentar reproduzir
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay bloqueado pelo navegador. Tentando reproduzir com áudio desativado (mutado)...", err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch((e) => console.error("Falha ao reproduzir mutado:", e));
        }
      });
    }
  }, [index, murais]);

  if (!isLiberado) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-white/10">
              <Monitor className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-white">Mural Digital</h1>
            <p className="mt-1 text-sm text-white/50">Acesso restrito</p>
          </div>
          <div className="space-y-4">
            <select
              className="w-full rounded-xl border border-white/20 px-4 py-3 text-sm text-white bg-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-white/30 transition-all cursor-pointer"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
            >
              <option value="RIO CLARO">Rio Claro</option>
              <option value="CORDEIRÓPOLIS">Cordeirópolis</option>
              <option value="ARARAS">Araras</option>
            </select>
            <input
              className="w-full rounded-xl border border-white/20 px-4 py-3 text-sm text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/30 transition-all"
              placeholder="Digite a chave de acesso..."
              type="password"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") validarAcesso(); }}
            />
            <button
              className="w-full rounded-xl px-4 py-3 font-semibold text-sm text-white bg-white/10 hover:bg-white/20 transition-all"
              onClick={validarAcesso}
            >
              Liberar Acesso
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activated) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6 cursor-pointer select-none"
        style={{ backgroundColor: "#1a1a2e" }}
        onClick={handleActivate}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </div>
        <span className="text-white text-xl font-semibold">Clique para ativar tela cheia</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={isPreview ? "w-full h-full flex items-center justify-center bg-black" : "fixed inset-0 flex items-center justify-center bg-black"}>
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={isPreview ? "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white gap-4" : "fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white gap-4"}>
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <span className="text-lg font-semibold">Falha ao carregar murais</span>
        <button
          className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
          onClick={() => { setLoading(true); setError(false); fetchMurais(); }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (murais.length === 0) {
    return (
      <div className={isPreview ? "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white gap-4" : "fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white gap-4"}>
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <span className="text-lg font-semibold">Nenhum mural ativo no momento</span>
      </div>
    );
  }

  const current = murais[index] || murais[0];
  if (!current) return null;
  const styles = current.STYLES || {};
  const fontFamily = styles.FONTFAMILY || "Inter";
  const bgColor = styles.BACKGROUNDCOLOR || "#1a1a2e";
  const textColor = styles.TEXTCOLOR || "#ffffff";
  const bodyTextColor = styles.BODYTEXTCOLOR || textColor;

  return (
    <div
      className={isPreview ? "w-full h-full overflow-hidden" : "fixed inset-0 h-screen w-screen overflow-hidden"}
      style={{ backgroundColor: bgColor }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className="absolute inset-0"
          exit={{ opacity: 0, x: -40, scale: 0.98 }}
          initial={{ opacity: 0, x: 40, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {current.LAYOUTTYPE === "FULL_IMAGE" ? (
            <div className="w-full h-full relative">
              {current.IMAGEURL && (
                <img
                  alt={current.TITLE || "Mural"}
                  className="w-full h-full object-cover"
                  src={current.IMAGEURL}
                  style={{ backgroundColor: bgColor }}
                />
              )}
            </div>
          ) : current.LAYOUTTYPE === "VIDEO" ? (
            <div className="w-full h-full relative">
              {current.IMAGEURL && (
                <video
                  ref={videoRef}
                  src={current.IMAGEURL}
                  autoPlay
                  playsInline
                  muted={styles.VIDEOMUTED ?? true}
                  onEnded={() => {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    setIndex((prev) => (prev + 1) % murais.length);
                  }}
                  className="w-full h-full object-cover"
                  style={{ backgroundColor: bgColor }}
                />
              )}
            </div>
          ) : current.LAYOUTTYPE === "WEATHER" ? (
            <div className={`w-full h-full flex flex-col justify-between p-[3vw] ${weatherData ? getWeatherBackground(weatherData.description) : "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]"} text-white`}>
              {/* Header compacto */}
              <div className="flex justify-between items-center pb-[1.5vw] border-b border-white/10">
                <div className="flex items-center gap-[1vw]">
                  <Clock size={28} className="text-white/40" />
                  <div>
                    <div className="text-[2.2vw] font-bold tracking-tight">
                      {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-[1vw] text-white/35">
                      {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="text-[2.5vw] font-extrabold tracking-wider text-white/95">PREVISÃO DO TEMPO</h1>
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <MapPin size={20} className="text-white/40" />
                  <span className="text-[1.1vw] text-white/50 font-medium">Unidade {unidade}</span>
                </div>
              </div>

              {/* Main Content */}
              {weatherData ? (
                <div className="flex-1 grid grid-cols-1 portrait:grid-cols-1 landscape:lg:grid-cols-5 gap-[4vw] portrait:gap-[2vh] items-center py-[2vw] portrait:py-[2vh]">
                  {/* Left: Temp atual & Info */}
                  <div className="lg:col-span-3 portrait:col-span-1 flex flex-col justify-center space-y-[2vw] portrait:space-y-[2vh]">
                    {/* Temperatura principal */}
                    <motion.div
                      className="backdrop-blur-xl bg-white/[0.07] rounded-[2vw] border border-white/[0.12] p-[3vw] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-center gap-[3vw]">
                        <div className="w-[8vw] h-[8vw] rounded-[1.5vw] bg-white/[0.08] flex items-center justify-center shadow-inner">
                          <WeatherMainIcon condition={weatherData.description} size={56} />
                        </div>
                        <div>
                          <div className="text-[8vw] font-black leading-none tracking-tighter">
                            {weatherData.temp}
                            <span className="text-[3vw] font-normal text-white/40 align-top ml-1">°C</span>
                          </div>
                          <div className="text-[1.8vw] font-bold capitalize text-white/80 mt-[0.5vw]">
                            {weatherData.description}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Cards de info */}
                    <div className="grid grid-cols-2 gap-[1.5vw]">
                      {/* Umidade */}
                      <motion.div
                        className="backdrop-blur-xl bg-white/[0.06] rounded-[1.5vw] border border-white/[0.1] p-[1.8vw] shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex items-center gap-[1.2vw]">
                          <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-white/[0.08] flex items-center justify-center">
                            <Droplets className="text-blue-400/80" size={24} />
                          </div>
                          <div>
                            <div className="text-[0.85vw] text-white/40 uppercase tracking-wider font-medium">Umidade</div>
                            <div className="text-[2.2vw] font-black text-white">{weatherData.humidity}%</div>
                          </div>
                        </div>
                        <div className="mt-[1vw] h-[0.6vw] bg-white/[0.08] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500/80 to-blue-400/60 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${weatherData.humidity}%` }}
                            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>

                      {/* Vento */}
                      <motion.div
                        className="backdrop-blur-xl bg-white/[0.06] rounded-[1.5vw] border border-white/[0.1] p-[1.8vw] shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex items-center gap-[1.2vw]">
                          <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-white/[0.08] flex items-center justify-center">
                            <Wind className="text-white/60" size={24} />
                          </div>
                          <div>
                            <div className="text-[0.85vw] text-white/40 uppercase tracking-wider font-medium">Vento</div>
                            <div className="text-[2.2vw] font-black text-white">{weatherData.wind_speedy}</div>
                          </div>
                        </div>
                        <div className="mt-[1vw] text-[0.8vw] text-white/35">
                          {Number(weatherData.wind_speedy) <= 5 ? "Brisa leve" : Number(weatherData.wind_speedy) <= 20 ? "Vento moderado" : "Vento forte"}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Right: Próximos 3 dias */}
                  <div className="lg:col-span-2 portrait:col-span-1 flex flex-col justify-center space-y-[1.5vw] portrait:space-y-[1.5vh]">
                    <motion.h2
                      className="text-[1.3vw] font-bold tracking-wider text-white/60 flex items-center gap-[0.6vw] uppercase"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Calendar size={22} />
                      Previsão 3 Dias
                    </motion.h2>
                    <div className="space-y-[1vw]">
                      {weatherData.forecast && weatherData.forecast.slice(1, 4).map((day: any, i: number) => {
                        const colors = getForecastColors(day.description, day.max);
                        return (
                          <motion.div
                            key={i}
                            className={`backdrop-blur-xl bg-gradient-to-br ${colors.bg} rounded-[1.5vw] border ${colors.border} p-[1.5vw] shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:brightness-110 transition-all duration-300`}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 + i * 0.12 }}
                          >
                            <div className="flex items-center gap-[1.2vw]">
                              <div className={`w-[2.5vw] h-[2.5vw] rounded-[0.6vw] ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
                                <ForecastIcon condition={day.description} size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-[0.6vw]">
                                  <span className="text-[1.3vw] font-bold text-white">{day.weekday?.substring(0, 3).toUpperCase()}</span>
                                  <span className="text-[0.75vw] text-white/35">{day.date}</span>
                                </div>
                                <div className="text-[0.8vw] text-white/40 capitalize truncate">{day.description}</div>
                              </div>
                            </div>
                            {/* Barra visual de temperatura */}
                            <div className="mt-[0.8vw] flex items-center gap-[0.8vw]">
                              <span className={`text-[1vw] font-bold ${colors.minColor} w-[2.5vw] text-right`}>{day.min}°</span>
                              <div className="flex-1 h-[0.6vw] bg-white/[0.08] rounded-full overflow-hidden relative">
                                <motion.div
                                  className="absolute h-full rounded-full"
                                  style={{
                                    background: colors.barGradient,
                                    left: `${Math.max(0, ((day.min - 5) / 40) * 100)}%`,
                                    width: `${Math.min(100, ((day.max - day.min) / 40) * 100)}%`,
                                  }}
                                  initial={{ scaleX: 0, transformOrigin: "left" }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ duration: 0.8, delay: 0.5 + i * 0.15 }}
                                />
                              </div>
                              <span className={`text-[1vw] font-bold ${colors.maxColor} w-[2.5vw]`}>{day.max}°</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-[1.5vw] text-white/50">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Thermometer className="text-white/30" size={56} />
                    </motion.div>
                    <span className="text-[1.3vw]">Carregando previsão do tempo...</span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-[1vw]">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-[0.8vw]" />
                <span className="text-[0.7vw] text-white/20 font-medium">CMSO Ocupacional · Todos os direitos reservados</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col landscape:lg:flex-row">
              <div className="flex-1 flex flex-col justify-center p-8 md:p-12 lg:p-16 xl:p-24">
                {current.TITLE && (
                  <h1
                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 leading-tight"
                    style={{ color: textColor, fontFamily }}
                  >
                    {current.TITLE}
                  </h1>
                )}
                {current.BODYTEXT && (
                  <p
                    className="text-lg md:text-xl lg:text-2xl xl:text-3xl leading-relaxed max-w-[80%] whitespace-pre-line"
                    style={{ color: bodyTextColor, fontFamily }}
                  >
                    {current.BODYTEXT}
                  </p>
                )}
              </div>

              {current.IMAGEURL && (
                <div className="flex-1 overflow-hidden">
                  <img
                    alt={current.TITLE || "Mural"}
                    className="w-full h-full object-cover"
                    src={current.IMAGEURL}
                  />
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
