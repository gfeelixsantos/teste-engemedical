"use client";

import React, { useState, useMemo } from "react";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  User,
  Lock,
  ArrowRight,
  ExternalLink,
  ClipboardPaste,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import engemedicalIcon from "@/public/images/logo.png";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { fetchBodyJson } from "@/lib/utils";
import { ApiResponse } from "@/shared/responses/ApiResponse";
import { API_REGISTER_URL } from "@/config/constants";

interface InputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  maxLength?: number;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  describedBy?: string;
  disabled?: boolean;
}

const InputField: React.FC<InputProps> = ({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  maxLength,
  startIcon,
  endIcon,
  describedBy,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <label
        className="block text-sm font-semibold text-slate-700"
        htmlFor={id}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-brand-deep/45">
            {startIcon}
          </div>
        )}
        <input
          aria-describedby={describedBy}
          className={`block w-full rounded-lg border border-brand-line bg-white/90 py-3.5 text-[15px] text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/15 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            startIcon ? "pl-11" : "pl-4"
          } ${endIcon ? "pr-11" : "pr-4"}`}
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          name={id}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
          onChange={onChange}
        />
        {endIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {endIcon}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de força da senha
const PasswordStrength = ({ strength }: { strength: number }) => {
  const strengthLabels = [
    "Muito Fraca",
    "Fraca",
    "Moderada",
    "Forte",
    "Muito Forte",
  ];
  const strengthColors = [
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#10B981",
    "#10B981",
  ];

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Força da senha</span>
        <span
          className="text-sm font-medium"
          style={{ color: strengthColors[strength] }}
        >
          {strengthLabels[strength]}
        </span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden"
          >
            <motion.div
              animate={{ width: strength > index ? "100%" : "0%" }}
              className="h-full rounded-full"
              initial={{ width: 0 }}
              style={{ backgroundColor: strengthColors[strength] }}
              transition={{ duration: 0.5 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ConnectSignal = () => (
  <div aria-hidden className="absolute inset-0">
    <div className="absolute inset-x-8 top-[66%] h-px bg-gradient-to-r from-transparent via-brand-lime/65 to-transparent shadow-[0_0_22px_rgba(94,225,122,0.38)]" />
    <motion.div
      animate={{ x: ["-18%", "118%"], opacity: [0, 1, 0] }}
      className="absolute left-0 top-[66%] h-px w-32 bg-gradient-to-r from-transparent via-white/75 to-transparent"
      transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ opacity: [0.24, 0.58, 0.24], scale: [0.98, 1.04, 0.98] }}
      className="absolute left-[10%] top-[18%] h-[42%] w-[80%] rounded-full border border-brand-cyan/20"
      transition={{ duration: 6.2, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ opacity: [0.2, 0.5, 0.2], scale: [1.02, 0.96, 1.02] }}
      className="absolute left-[18%] top-[26%] h-[34%] w-[64%] rounded-full border border-brand-green/18"
      transition={{ duration: 7.4, ease: "easeInOut", repeat: Infinity }}
    />
    <div className="absolute left-[21%] top-[66%] h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_22px_rgba(94,225,122,0.72)]" />
    <div className="absolute left-[49%] top-[66%] h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_22px_rgba(10,171,212,0.7)]" />
    <div className="absolute right-[21%] top-[66%] h-2 w-2 rounded-full bg-brand-green shadow-[0_0_22px_rgba(48,209,88,0.72)]" />
    <div className="absolute left-[21%] top-[66%] h-24 w-px origin-top rotate-[64deg] bg-gradient-to-b from-brand-lime/45 to-transparent" />
    <div className="absolute right-[21%] top-[66%] h-24 w-px origin-top -rotate-[64deg] bg-gradient-to-b from-brand-green/45 to-transparent" />
  </div>
);

const RegistroBrandPanel = () => (
  <motion.section
    animate={{ opacity: 1 }}
    className="cyber-grid relative flex min-h-[440px] flex-col justify-between overflow-hidden bg-[#020817] p-6 pb-16 pt-6 text-white md:min-h-[680px] md:p-9"
    initial={{ opacity: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(48,209,88,0.18),transparent_30%),radial-gradient(circle_at_12%_12%,rgba(6,152,194,0.18),transparent_28%),linear-gradient(135deg,#020817_0%,#03111f_46%,#06281f_100%)]" />
    <motion.div
      animate={{ opacity: [0.34, 0.62, 0.34], x: ["-8%", "4%", "-8%"] }}
      className="absolute inset-x-[-16%] top-[-20%] h-[56%] bg-[linear-gradient(100deg,transparent_10%,rgba(0,46,66,0.42)_34%,rgba(6,152,194,0.18)_55%,rgba(48,209,88,0.24)_76%,transparent_92%)] blur-2xl"
      transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ opacity: [0.18, 0.32, 0.18], y: ["0%", "8%", "0%"] }}
      className="absolute inset-x-[-10%] bottom-[-24%] h-[48%] bg-[linear-gradient(100deg,transparent_5%,rgba(22,217,245,0.22)_28%,rgba(139,255,51,0.22)_64%,transparent_94%)] blur-3xl"
      transition={{ duration: 11, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ x: ["120%", "-35%"] }}
      className="absolute bottom-28 right-0 h-px w-3/5 bg-gradient-to-r from-transparent via-brand-green/60 to-transparent"
      transition={{
        delay: 1.2,
        duration: 8,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    />

    <div className="relative z-10 my-4 flex flex-1 flex-col items-center justify-center gap-2 md:my-6 md:gap-3">
      <div className="relative w-full max-w-[34rem]">
        <div className="relative h-48 w-full sm:h-56 md:h-[17rem] xl:h-[19rem]">
          <motion.div
            animate={{ opacity: [0.16, 0.42, 0.16], scale: [0.96, 1.06, 0.96] }}
            className="absolute inset-x-8 inset-y-4 rounded-[44px] bg-brand-cyan/20 blur-3xl"
            transition={{ duration: 5.4, ease: "easeInOut", repeat: Infinity }}
          />
          <ConnectSignal />
          <motion.div
            animate={{ scale: [1, 1.025, 1], y: [0, -4, 0] }}
            className="absolute inset-0 grid place-items-center"
            transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
          >
            <Image
              priority
              alt="Engemedical"
              className="h-auto w-[82%] max-w-[29rem] object-contain drop-shadow-[0_34px_80px_rgba(22,217,245,0.38)]"
              height={420}
              src={engemedicalIcon}
              width={720}
            />
          </motion.div>
        </div>
        <div className="mt-2 text-center">
          <span
            aria-label="Conectando seu cadastro ao futuro SST"
            className="typewriter-text min-h-[4.1rem] text-lg font-light leading-tight tracking-wide text-white/65 drop-shadow-[0_6px_20px_rgba(255,255,255,0.08)] sm:min-h-[4.9rem] sm:text-xl"
          >
            Conectando seu cadastro ao futuro SST
          </span>
        </div>
      </div>
    </div>

  </motion.section>
);

export default function RegistroClient(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentTermos, setConsentTermos] = useState(false);
  const [consentPrivacidade, setConsentPrivacidade] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = e.target.value.toUpperCase().replace(/\s/g, "");
    setCodigo(normalized);
    setError(null);
  };

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const normalized = text.toUpperCase().replace(/\s/g, "");
      setCodigo(normalized);
      setError(null);
    } catch {
      // clipboard access denied — ignore
    }
  };

  function passwordStrengthScore(pw: string) {
    let score = 0;

    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    return score;
  }

  const strength = useMemo(() => passwordStrengthScore(password), [password]);

  const handleRegister = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const payload = { email, codigo, password, consentimento: true };
      const res = await fetchBodyJson<ApiResponse<IUserInfo>>(
        API_REGISTER_URL,
        "POST",
        payload,
      );

      if (res.status === 201) {
        alert(
          "Registro realizado com sucesso! Você será redirecionado para o login.",
        );
        router.push("/");
      } else {
        setError(res.message || "Erro ao realizar registro");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail válido.");

      return;
    }

    if (codigo.length < 1) {
      setError("Informe o código de registro.");

      return;
    }

    if (password.length < 3) {
      setError("A senha deve ter no mínimo 3 caracteres.");

      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");

      return;
    }

    if (!consentTermos || !consentPrivacidade) {
      setError(
        "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
      );

      return;
    }

    await handleRegister();
  };

  return (
    <main className="min-h-screen bg-brand-surface text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
        <RegistroBrandPanel />

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-[500px]">
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8 flex items-start justify-between gap-5">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
                    Novo acesso
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight text-brand-midnight sm:text-[2.35rem] sm:leading-[1.08]">
                    Criar conta Engemedical
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Informe seu e-mail, código de registro e aceite os termos para
                    ativar o acesso ao ambiente Connect.
                  </p>
                </div>
                <Link
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-brand-line bg-white/80 px-3 py-2 text-sm font-semibold text-brand-deep shadow-sm transition-colors hover:border-brand-cyan hover:text-brand-blue"
                  href="/"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Login
                </Link>
              </div>

              {error && (
                <motion.div
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-6 flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  initial={{ opacity: 0, height: 0 }}
                  role="alert"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      clipRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      fillRule="evenodd"
                    />
                  </svg>
                  {error}
                </motion.div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <InputField
                    required
                    disabled={isLoading}
                    id="email"
                    label="E-mail"
                    maxLength={120}
                    placeholder="seuemail@empresa.com.br"
                    startIcon={<Mail className="w-4 h-4" />}
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                  />
                </motion.div>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <InputField
                    required
                    describedBy="codigo-desc"
                    disabled={isLoading}
                    endIcon={
                      <button
                        aria-label="Colar código da área de transferência"
                        className="rounded p-1 text-slate-400 transition-colors hover:text-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                        title="Colar"
                        type="button"
                        onClick={handlePasteClick}
                      >
                        <ClipboardPaste className="w-4 h-4" />
                      </button>
                    }
                    id="codigo"
                    label="Código de Registro"
                    maxLength={32}
                    placeholder="Cole seu código aqui"
                    startIcon={<User className="w-4 h-4" />}
                    value={codigo}
                    onChange={handleCodigoChange}
                  />
                  <p className="mt-1 text-xs text-slate-500" id="codigo-desc">
                    Informe o código disponibilizado pela sua empresa
                  </p>
                </motion.div>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <InputField
                    required
                    disabled={isLoading}
                    endIcon={
                      <button
                        aria-label={
                          showPassword ? "Ocultar senha" : "Mostrar senha"
                        }
                        className="rounded p-1 text-slate-400 transition-colors hover:text-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                    id="password"
                    label="Senha"
                    maxLength={64}
                    placeholder="Crie uma senha segura"
                    startIcon={<Lock className="w-4 h-4" />}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <PasswordStrength strength={strength} />
                </motion.div>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <InputField
                    required
                    disabled={isLoading}
                    endIcon={
                      <button
                        aria-label={
                          showConfirm
                            ? "Ocultar confirmação"
                            : "Mostrar confirmação"
                        }
                        className="rounded p-1 text-slate-400 transition-colors hover:text-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                      >
                        {showConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                    id="confirmPassword"
                    label="Confirmar Senha"
                    maxLength={64}
                    placeholder="Confirme sua senha"
                    startIcon={<Lock className="w-4 h-4" />}
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </motion.div>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 rounded-lg border border-brand-line bg-white/70 p-4 shadow-sm"
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ExternalLink size={14} />
                    Consentimento LGPD
                  </p>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      className="mt-0.5 h-4 w-4 rounded border-brand-line text-brand-blue focus:ring-brand-cyan"
                      checked={consentTermos}
                      type="checkbox"
                      onChange={(e) => setConsentTermos(e.target.checked)}
                    />
                    <span className="text-sm text-slate-600">
                      Aceito os <strong>Termos de Uso</strong> do Engemedical
                      Connect
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      className="mt-0.5 h-4 w-4 rounded border-brand-line text-brand-blue focus:ring-brand-cyan"
                      checked={consentPrivacidade}
                      type="checkbox"
                      onChange={(e) => setConsentPrivacidade(e.target.checked)}
                    />
                    <span className="text-sm text-slate-600">
                      Aceito a{" "}
                      <a
                        className="font-semibold text-brand-deep transition-colors hover:text-brand-blue hover:underline"
                        href="/privacidade"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Política de Privacidade
                      </a>
                    </span>
                  </label>
                </motion.div>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.55 }}
                >
                  <button
                    className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-midnight bg-brand-midnight px-4 py-3.5 font-semibold text-white shadow-[0_18px_44px_rgba(0,46,66,0.22)] transition-all duration-300 hover:border-brand-deep hover:bg-brand-deep hover:shadow-[0_22px_54px_rgba(0,92,122,0.24)] focus:outline-none focus:ring-4 focus:ring-brand-cyan/22 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      isLoading || !consentTermos || !consentPrivacidade
                    }
                    type="submit"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        Criar Conta
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </motion.div>

                <motion.div
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-slate-500"
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  Já possui uma conta?{" "}
                  <Link
                    className="font-semibold text-brand-deep transition-colors hover:text-brand-blue hover:underline"
                    href="/"
                  >
                    Faça login aqui
                  </Link>
                </motion.div>
              </form>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}
