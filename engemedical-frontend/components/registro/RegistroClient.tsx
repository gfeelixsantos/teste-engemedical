"use client";

import React, { useState } from "react";
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
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { PremiumFeedbackModal } from "@/components/shared/PremiumFeedbackModal";
import { BrandPanel } from "@/components/shared/BrandPanel";
import engemedicalIcon from "@/public/images/logo.png";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { normalizeRegistrationCode } from "@/lib/user/registration-code";
import {
  mapRegistrationFeedback,
  RegistrationFeedback,
} from "@/lib/user/registration-errors";
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
  autoComplete?: string;
  spellCheck?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  describedBy?: string;
  disabled?: boolean;
  onBlur?: () => void;
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
  autoComplete,
  spellCheck,
  startIcon,
  endIcon,
  describedBy,
  disabled = false,
  onBlur,
}) => {
  return (
    <div className="space-y-1.5">
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
          autoComplete={autoComplete}
          className={`block w-full rounded-lg border border-brand-line bg-white/90 py-3 text-[15px] text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/15 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            startIcon ? "pl-11" : "pl-4"
          } ${endIcon ? "pr-11" : "pr-4"}`}
          disabled={disabled}
          id={id}
          maxLength={maxLength}
          name={id}
          placeholder={placeholder}
          required={required}
          spellCheck={spellCheck}
          type={type}
          value={value}
          onBlur={onBlur}
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

const RegistroTitle = ({ title }: { title: string }) => {
  if (!title.includes("Engemedical")) return <>{title}</>;

  const [prefix, suffix] = title.split("Engemedical");

  return (
    <>
      {prefix}
      <span className="relative inline-block bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-green bg-clip-text px-0.5 text-transparent drop-shadow-[0_14px_34px_rgba(6,152,194,0.18)]">
        Engemedical
      </span>
      {suffix}
    </>
  );
};

const nameParticles = new Set(["da", "das", "de", "di", "do", "dos", "du", "e"]);

const capitalizeNamePart = (part: string, index: number) => {
  const lower = part.toLocaleLowerCase("pt-BR");

  if (index > 0 && nameParticles.has(lower)) return lower;

  return lower.replace(/(^|[-'])\p{L}/gu, (match) =>
    match.toLocaleUpperCase("pt-BR"),
  );
};

const formatPersonName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(capitalizeNamePart)
    .join(" ");

export default function RegistroClient(): JSX.Element {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<RegistrationFeedback | null>(null);
  const [consentTermos, setConsentTermos] = useState(false);
  const [consentPrivacidade, setConsentPrivacidade] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeRegistrationCode(e.target.value);
    setCodigo(normalized);
    setError(null);
  };

  const handlePasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const normalized = normalizeRegistrationCode(text);
      setCodigo(normalized);
      setError(null);
    } catch {
      // clipboard access denied — ignore
    }
  };

  const handleRegister = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const formattedNome = formatPersonName(nome);
      const payload = {
        nome: formattedNome,
        email,
        codigo,
        password,
        consentimento: true,
      };
      const res = await fetchBodyJson<ApiResponse<IUserInfo>>(
        API_REGISTER_URL,
        "POST",
        payload,
      );

      if (res.status === 201) {
        setFeedbackModal({
          variant: "success",
          title: "Conta criada com sucesso",
          message:
            "Seu acesso foi ativado. Agora você pode entrar no ambiente Engemedical com o e-mail e senha cadastrados.",
          primaryLabel: "Ir para login",
        });
      } else {
        setFeedbackModal(
          mapRegistrationFeedback({
            status: res.status,
            message: res.message,
          }),
        );
      }
    } catch (err) {
      setFeedbackModal(
        mapRegistrationFeedback({
          status: 500,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedNome = formatPersonName(nome);

    if (formattedNome.length < 3 || formattedNome.split(" ").filter((part) => /\p{L}{2,}/u.test(part)).length < 2) {
      setError("Informe seu nome completo.");

      return;
    }

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

  const handleFeedbackPrimaryAction = () => {
    if (feedbackModal?.variant === "success" || feedbackModal?.primaryLabel === "Ir para login") {
      router.push("/");
      return;
    }

    setFeedbackModal(null);
  };

  return (
    <main className="min-h-screen bg-brand-surface text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
        <BrandPanel title="Conectando seu cadastro ao futuro SST" />

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-[480px]">
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
                    Novo acesso
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight text-brand-midnight sm:text-[2.2rem] sm:leading-[1.08]">
                    <RegistroTitle title="Criar conta Engemedical" />
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
                  className="mb-4 flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
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

              <form className="space-y-4" onSubmit={handleSubmit}>
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <InputField
                    required
                    autoComplete="name"
                    disabled={isLoading}
                    id="nome"
                    label="Nome completo"
                    maxLength={120}
                    placeholder="Seu nome completo"
                    spellCheck={false}
                    startIcon={<User className="w-4 h-4" />}
                    value={nome}
                    onBlur={() => setNome(formatPersonName(nome))}
                    onChange={(e) => {
                      setNome(e.target.value);
                      setError(null);
                    }}
                  />
                </motion.div>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
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
                  className="space-y-2 rounded-lg border border-brand-line bg-white/70 p-3 shadow-sm"
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
                    <span className="text-[13px] leading-5 text-slate-600">
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
                    <span className="text-[13px] leading-5 text-slate-600">
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
      <PremiumFeedbackModal
        isOpen={!!feedbackModal}
        message={feedbackModal?.message || ""}
        primaryLabel={feedbackModal?.primaryLabel}
        title={feedbackModal?.title || ""}
        variant={feedbackModal?.variant || "info"}
        detail={feedbackModal?.detail}
        onClose={() => setFeedbackModal(null)}
        onPrimaryAction={handleFeedbackPrimaryAction}
      />
    </main>
  );
}
