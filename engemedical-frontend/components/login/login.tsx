"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileCheck2,
  HeartPulse,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import packageInfo from "@/package.json";

import { fetchBodyJson, formatCPF, setCurrentUser } from "@/lib/utils";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { ApiResponse } from "@/shared/responses/ApiResponse";

// -------------------------------------------------------------
// SUBCOMPONENTES ESTÁVEIS (fora do componente principal)
// -------------------------------------------------------------

interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  type?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  name?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onPaste,
  type = "text",
  startIcon,
  endIcon,
  disabled,
  required,
  autoComplete,
  name,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-slate-700">{label}</label>
    <div className="relative">
      {startIcon && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-brand-deep/45">
          {startIcon}
        </span>
      )}

      <input
        aria-label={label}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-brand-line bg-white/90 py-3.5 pl-11 pr-11 text-[15px] text-slate-900 shadow-sm outline-none
        transition-all duration-200 placeholder:text-slate-400
        focus:border-brand-cyan focus:ring-4 focus:ring-brand-cyan/15
        disabled:bg-slate-100 disabled:cursor-not-allowed"
        disabled={disabled}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={onChange}
        onPaste={onPaste}
      />

      {endIcon && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
          {endIcon}
        </span>
      )}
    </div>
  </div>
);

interface SubmitButtonProps {
  isLoading: boolean;
  disabled?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ isLoading, disabled }) => (
  <button
    className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-green px-4 py-3.5 font-semibold text-brand-midnight
    shadow-[0_18px_45px_rgba(22,217,245,0.28)]
    hover:shadow-[0_22px_55px_rgba(25,232,90,0.28)]
    focus:outline-none focus:ring-4 focus:ring-brand-cyan/25
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-300 cursor-pointer"
    disabled={isLoading || disabled}
    type="submit"
  >
    {isLoading ? (
      <>
        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        Conectando...
      </>
    ) : (
      <>
        Acessar Sistema
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </>
    )}
  </button>
);

const brandPillars = [
  {
    icon: HeartPulse,
    title: "Exames ocupacionais",
    description: "Atendimento clínico com agilidade.",
  },
  {
    icon: FileCheck2,
    title: "ASO digital",
    description: "Documentação pronta para a rotina.",
  },
  {
    icon: ClipboardCheck,
    title: "PCMSO",
    description: "Gestão ocupacional conforme a NR-7.",
  },
  {
    icon: Network,
    title: "Rede credenciada",
    description: "Capilaridade para empresas e colaboradores.",
  },
];

const BrandPanel = () => (
  <motion.section
    animate={{ opacity: 1 }}
    className="cyber-grid relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-brand-midnight p-6 text-white md:min-h-[680px] md:p-9"
    initial={{ opacity: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#06172f_0%,#082a4c_46%,#051326_100%)]" />
    <motion.div
      animate={{ opacity: [0.34, 0.62, 0.34], x: ["-8%", "4%", "-8%"] }}
      className="absolute inset-x-[-16%] top-[-20%] h-[56%] bg-[linear-gradient(100deg,transparent_10%,rgba(0,109,255,0.38)_34%,rgba(22,217,245,0.24)_55%,rgba(25,232,90,0.28)_76%,transparent_92%)] blur-2xl"
      transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ opacity: [0.18, 0.32, 0.18], y: ["0%", "8%", "0%"] }}
      className="absolute inset-x-[-10%] bottom-[-24%] h-[48%] bg-[linear-gradient(100deg,transparent_5%,rgba(22,217,245,0.22)_28%,rgba(139,255,51,0.22)_64%,transparent_94%)] blur-3xl"
      transition={{ duration: 11, ease: "easeInOut", repeat: Infinity }}
    />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
    <motion.div
      animate={{ x: ["-35%", "135%"] }}
      className="absolute left-0 top-1/3 h-px w-2/3 bg-gradient-to-r from-transparent via-brand-cyan/70 to-transparent"
      transition={{ duration: 6.5, ease: "easeInOut", repeat: Infinity }}
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

    <div className="relative z-10 flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-lg shadow-brand-cyan/10">
        <ShieldCheck className="h-5 w-5 text-brand-cyan" />
      </span>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan">
          Engemedical Connect
        </p>
        <p className="text-sm text-white/62">Portal operacional</p>
      </div>
    </div>

    <div className="relative z-10 my-7 grid place-items-center md:my-6">
      <div className="relative h-64 w-64 md:h-80 md:w-80">
        <motion.div
          animate={{ opacity: [0.16, 0.42, 0.16], scale: [0.96, 1.06, 0.96] }}
          className="absolute inset-6 rounded-[44px] bg-brand-cyan/20 blur-3xl"
          transition={{ duration: 5.4, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          className="absolute inset-3 rounded-[56px] border border-dashed border-brand-cyan/28"
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          className="absolute inset-10 rounded-[40px] border border-brand-green/24"
          transition={{ duration: 22, ease: "linear", repeat: Infinity }}
        />
        <motion.div
          animate={{ scale: [1, 1.025, 1], y: [0, -4, 0] }}
          className="absolute inset-0 grid place-items-center"
          transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
        >
          <Image
            priority
            alt="Engemedical Connect"
            className="h-56 w-56 object-contain drop-shadow-[0_30px_70px_rgba(22,217,245,0.36)] md:h-72 md:w-72"
            height={320}
            src="/images/engemedical_icone.png"
            width={320}
          />
        </motion.div>
      </div>
    </div>

    <div className="relative z-10 space-y-5">
      <div className="max-w-xl space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-lime">
          <Sparkles className="h-3.5 w-3.5" />
          Clínica ocupacional
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
          Cuidado ocupacional com tecnologia, presença clínica e gestão integrada.
        </h1>
        <p className="max-w-lg text-sm leading-6 text-white/68 md:text-base">
          Exames, ASO, PCMSO e rede credenciada em uma jornada mais simples para
          empresas e colaboradores.
        </p>
      </div>

      <div className="grid gap-2.5 border-t border-white/10 pt-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {brandPillars.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            animate={{ opacity: [0.86, 1, 0.86], y: [0, -4, 0] }}
            className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.075] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.14)] backdrop-blur transition-colors duration-300 hover:border-brand-cyan/40 hover:bg-white/[0.11]"
            transition={{
              delay: title.length * 0.03,
              duration: 5.8,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            <motion.span
              aria-hidden
              animate={{ x: ["-120%", "140%"] }}
              className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/14 to-transparent"
              transition={{
                delay: title.length * 0.05,
                duration: 3.8,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />
            <div className="relative flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-cyan/18 bg-brand-cyan/10 text-brand-cyan shadow-[0_0_22px_rgba(22,217,245,0.12)] transition-colors group-hover:border-brand-green/30 group-hover:text-brand-green">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-white/52">
                  {description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-brand-cyan/18 bg-brand-deep/46 p-3 text-sm text-white/68 backdrop-blur">
        <ShieldCheck className="h-5 w-5 shrink-0 text-brand-green" />
        <p>
          Atendimento clínico, documentação ocupacional e conformidade em uma
          única experiência.
        </p>
      </div>
    </div>
  </motion.section>
);

// -------------------------------------------------------------
// COMPONENTE PRINCIPAL
// -------------------------------------------------------------

type RecoveryStep = "initial" | "validate" | "reset";

export default function LoginPage() {
  const router = useRouter();

  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("initial");
  const [recoveryCpf, setRecoveryCpf] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);

    if (formatted.length <= 14) setCpf(formatted);
  };

  const handleCPFPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const formatted = formatCPF(text);

    if (formatted.length <= 14) setCpf(formatted);
  };

  const handleLogin = async () => {
    try {
      const userLogged = await fetchBodyJson<ApiResponse<IUserInfo>>(
        "/api/auth",
        "POST",
        { cpf, password },
      );

      if (userLogged.data) {
        setCurrentUser(userLogged.data);

        // Não resetar isLoading aqui - deixar o botão em loading até a navegação
        router.push("/dashboard");

        return;
      }

      throw new Error(userLogged.message || "Falha no login");
    } catch (err: any) {
      setError(err?.message || "Erro ao conectar");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawCpf = cpf.replace(/\D/g, "");

    if (rawCpf.length !== 11) {
      setError("CPF Inválido. Deve conter 11 dígitos.");

      return;
    }

    setIsLoading(true);
    setError("");

    await handleLogin();
  };

  const handleRecoveryCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);

    if (formatted.length <= 14) setRecoveryCpf(formatted);
  };

  const handleRecoveryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecoveryCode(e.target.value);
  };

  const handleRecoveryValidate = async () => {
    const rawCpf = recoveryCpf.replace(/\D/g, "");

    if (rawCpf.length !== 11) {
      setError("CPF Inválido. Deve conter 11 dígitos.");

      return;
    }

    if (!recoveryCode) {
      setError("Código de recuperação é obrigatório.");

      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchBodyJson<ApiResponse<{ valid: boolean }>>(
        "/api/auth/recovery/validate",
        "POST",
        { cpf: rawCpf, codigo_recuperacao: recoveryCode },
      );

      if (response.data?.valid) {
        setRecoveryStep("reset");
        setError("");
      } else {
        setError(response.message || "Código de recuperação inválido.");
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao validar código.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryReset = async () => {
    const rawCpf = recoveryCpf.replace(/\D/g, "");

    if (!newPassword) {
      setError("Nova senha é obrigatória.");

      return;
    }

    if (newPassword.length < 3) {
      setError("Senha deve ter pelo menos 3 caracteres.");

      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");

      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchBodyJson<ApiResponse<{ success: boolean }>>(
        "/api/auth/recovery/reset",
        "POST",
        { cpf: rawCpf, nova_senha: newPassword },
      );

      if (response.data?.success) {
        setSuccessMessage("Senha alterada com sucesso! Você pode fazer login.");
        setRecoveryStep("initial");
        setRecoveryCpf("");
        setRecoveryCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(response.message || "Erro ao redefinir senha.");
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao redefinir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  const startRecovery = () => {
    setRecoveryStep("validate");
    setError("");
    setSuccessMessage("");
    setRecoveryCpf("");
    setRecoveryCode("");
  };

  const backToLogin = () => {
    setRecoveryStep("initial");
    setError("");
    setSuccessMessage("");
    setRecoveryCpf("");
    setRecoveryCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  const renderTitle = () => {
    if (recoveryStep === "validate") {
      return {
        title: "Recuperação de Senha",
        subtitle: "Informe seu CPF e código de recuperação",
      };
    }
    if (recoveryStep === "reset") {
      return {
        title: "Nova Senha",
        subtitle: "Digite sua nova senha",
      };
    }

    return {
      title: "Acesso ao Sistema",
      subtitle: "Use suas credenciais corporativas",
    };
  };

  const { title, subtitle } = renderTitle();

  return (
    <main className="min-h-screen bg-brand-surface text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
        <BrandPanel />

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-[470px]">
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-deep shadow-sm">
                <Activity className="h-3.5 w-3.5 text-brand-green" />
                Ambiente seguro
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-brand-midnight">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            </div>

            {/* MENSAGENS */}
            {error && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                initial={{ opacity: 0, height: 0 }}
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

            {successMessage && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                initial={{ opacity: 0, height: 0 }}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    fillRule="evenodd"
                  />
                </svg>
                {successMessage}
              </motion.div>
            )}

            {/* FORMULÁRIO DE LOGIN */}
            {recoveryStep === "initial" && (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <InputField
                  required
                  autoComplete="username"
                  disabled={isLoading}
                  label="CPF"
                  name="username"
                  placeholder="000.000.000-00"
                  startIcon={<User className="h-4 w-4" />}
                  value={cpf}
                  onChange={handleCPFChange}
                  onPaste={handleCPFPaste}
                />

                <InputField
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  endIcon={
                    <button
                      aria-label={
                        showPassword ? "Esconder senha" : "Mostrar senha"
                      }
                      className="text-slate-400 transition-colors hover:text-brand-deep"
                      disabled={isLoading}
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  label="Senha"
                  name="current-password"
                  placeholder="Digite sua senha"
                  startIcon={<Lock className="h-4 w-4" />}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <SubmitButton isLoading={isLoading} />
              </form>
            )}

            {/* FORMULÁRIO DE VALIDAÇÃO */}
            {recoveryStep === "validate" && (
              <div className="space-y-6">
                <InputField
                  required
                  label="CPF"
                  placeholder="000.000.000-00"
                  startIcon={<User className="h-4 w-4" />}
                  value={recoveryCpf}
                  onChange={handleRecoveryCPFChange}
                />

                <InputField
                  required
                  label="Código de Recuperação"
                  placeholder="Código invertido + 2 últimos dígitos do CPF"
                  value={recoveryCode}
                  onChange={handleRecoveryCodeChange}
                />

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-deep px-4 py-3.5 font-semibold text-white
                  hover:bg-brand-midnight focus:outline-none focus:ring-4 focus:ring-brand-cyan/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300 shadow-lg shadow-brand-deep/15"
                  disabled={isLoading}
                  onClick={handleRecoveryValidate}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      Validar Código
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    className="text-sm font-semibold text-slate-500 transition-colors hover:text-brand-deep"
                    type="button"
                    onClick={backToLogin}
                  >
                    Voltar ao login
                  </button>
                </div>
              </div>
            )}

            {/* FORMULÁRIO DE NOVA SENHA */}
            {recoveryStep === "reset" && (
              <div className="space-y-6">
                <InputField
                  required
                  endIcon={
                    <button
                      aria-label={
                        showNewPassword ? "Esconder senha" : "Mostrar senha"
                      }
                      className="text-slate-400 transition-colors hover:text-brand-deep"
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  label="Nova Senha"
                  placeholder="Mínimo 3 caracteres"
                  startIcon={<Lock className="h-4 w-4" />}
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <InputField
                  required
                  endIcon={
                    <button
                      aria-label={
                        showConfirmPassword ? "Esconder senha" : "Mostrar senha"
                      }
                      className="text-slate-400 transition-colors hover:text-brand-deep"
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  label="Confirmar Senha"
                  placeholder="Repita a nova senha"
                  startIcon={<Lock className="h-4 w-4" />}
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-deep px-4 py-3.5 font-semibold text-white
                  hover:bg-brand-midnight focus:outline-none focus:ring-4 focus:ring-brand-cyan/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300 shadow-lg shadow-brand-deep/15"
                  disabled={isLoading}
                  onClick={handleRecoveryReset}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      Alterar Senha
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    className="text-sm font-semibold text-slate-500 transition-colors hover:text-brand-deep"
                    type="button"
                    onClick={backToLogin}
                  >
                    Voltar ao login
                  </button>
                </div>
              </div>
            )}

            {/* LINKS */}
            {recoveryStep === "initial" && (
              <>
                <div className="mt-6 text-center">
                  <button
                    className="text-sm font-semibold text-brand-deep transition-colors hover:text-brand-blue hover:underline"
                    type="button"
                    onClick={startRecovery}
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">
                    Não tem uma conta?{" "}
                    <a
                      className="font-semibold text-brand-deep transition-colors hover:text-brand-blue hover:underline"
                      href="/registro"
                    >
                      Registre-se aqui
                    </a>
                  </p>
                </div>
              </>
            )}

            {/* FOOTER */}
            <div className="mt-8 space-y-2 border-t border-brand-line pt-6 text-center text-xs text-slate-500">
              <div>
                Centro Médico de Saúde Ocupacional {new Date().getFullYear()} ·
                v{packageInfo.version}
              </div>
              <div className="flex justify-center gap-4">
                <a href="/privacidade" className="transition-colors hover:text-brand-deep hover:underline">Política de Privacidade</a>
                <span>•</span>
                <a href="/termos-de-uso" className="transition-colors hover:text-brand-deep hover:underline">Termos de Uso</a>
              </div>
            </div>
          </motion.div>
        </div>
        </section>
      </div>
    </main>
  );
}

