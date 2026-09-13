"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

import engemedicalIcon from "@/public/images/logo.png";
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
    <label className="block text-sm font-semibold text-slate-700">
      {label}
    </label>
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
    className="group flex w-full items-center justify-center gap-2 rounded-lg border border-brand-midnight bg-brand-midnight px-4 py-3.5 font-semibold text-white
    shadow-[0_18px_44px_rgba(0,46,66,0.22)]
    hover:border-brand-deep hover:bg-brand-deep hover:shadow-[0_22px_54px_rgba(0,92,122,0.24)]
    focus:outline-none focus:ring-4 focus:ring-brand-cyan/22
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
        Conectar
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </>
    )}
  </button>
);

const brandPillars = [
  {
    icon: ShieldCheck,
    title: "Confiança para decidir",
  },
  {
    icon: LayoutDashboard,
    title: "SST sem retrabalho",
  },
  {
    icon: BarChart3,
    title: "Visibilidade em tempo real",
  },
];

const LoginTitle = ({ title }: { title: string }) => {
  if (!title.includes("Engemedical")) {
    return <>{title}</>;
  }

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

const TypewriterTitle = ({ text }: { text: string }) => {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 55);

    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <div className="text-center">
      <span
        aria-label={text}
        className="typewriter-text inline-block min-h-[4.1rem] text-lg font-light tracking-wide leading-tight text-white/65 drop-shadow-[0_6px_20px_rgba(255,255,255,0.08)] sm:min-h-[4.9rem] sm:text-xl"
      >
        {visibleText}
        <motion.span
          aria-hidden="true"
          animate={{ opacity: [1, 0.2, 1] }}
          className="ml-1 inline-block text-brand-lime"
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          |
        </motion.span>
      </span>
    </div>
  );
};

const ConnectSignal = () => (
  <div aria-hidden className="absolute inset-0">
    <div className="connect-line-primary absolute inset-x-0 top-[66%] h-px bg-gradient-to-r from-transparent via-brand-lime/75 to-transparent shadow-[0_0_26px_rgba(94,225,122,0.42)]" />
    <motion.div
      animate={{ x: ["-18%", "118%"], opacity: [0, 1, 0] }}
      className="absolute left-[-12%] top-[66%] h-px w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
      transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
    />
    <motion.div
      animate={{ x: ["112%", "-28%"], opacity: [0, 0.72, 0] }}
      className="absolute right-[-12%] top-[60%] h-px w-2/5 bg-gradient-to-r from-transparent via-brand-cyan/74 to-transparent"
      transition={{
        delay: 0.9,
        duration: 6.1,
        ease: "easeInOut",
        repeat: Infinity,
      }}
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
    <div className="connect-line-diagonal absolute left-[12%] top-[66%] h-36 w-px origin-top rotate-[64deg] bg-gradient-to-b from-brand-lime/50 via-brand-green/22 to-transparent" />
    <div className="connect-line-diagonal absolute right-[12%] top-[66%] h-36 w-px origin-top -rotate-[64deg] bg-gradient-to-b from-brand-cyan/46 via-brand-green/20 to-transparent" />
  </div>
);

const BrandPanel = () => (
  <motion.section
    animate={{ opacity: 1 }}
    className="cyber-grid relative flex min-h-[500px] flex-col justify-center gap-4 overflow-hidden bg-[#020817] p-6 pt-6 pb-8 text-white md:min-h-[680px] md:p-9 md:py-8"
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
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
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

    <div className="compact-brand-stage relative z-10 mb-0 mt-2 flex flex-col items-center gap-0 md:mt-3">
      <div className="relative w-full max-w-[34rem]">
        <div className="relative h-44 w-full sm:h-48 md:h-[15rem] xl:h-[16.5rem]">
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
        <div className="mt-0">
          <TypewriterTitle text="Conectando você ao futuro SST" />
        </div>
      </div>
    </div>

    <div className="relative z-10 space-y-1">
      <div className="grid gap-3 border-t border-white/10 pt-2 text-sm sm:grid-cols-3">
        {brandPillars.map(({ icon: Icon, title }) => (
          <motion.div
            key={title}
            className="brand-card-shine group relative overflow-hidden rounded-lg bg-brand-green/60 p-px shadow-[0_18px_42px_rgba(0,0,0,0.18)]"
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            whileHover={{ y: -4, scale: 1.018 }}
          >
            <motion.span
              aria-hidden
              animate={{ rotate: 360 }}
              className="absolute left-1/2 top-1/2 h-[240%] w-[240%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_88deg,rgba(139,255,51,0.94)_122deg,rgba(25,232,90,0.86)_150deg,rgba(22,217,245,0.58)_176deg,transparent_216deg,transparent_360deg)]"
              transition={{
                duration: 5.8,
                ease: "linear",
                repeat: Infinity,
              }}
            />
            <div className="relative flex h-full min-h-[76px] items-center gap-3 rounded-[7px] border border-brand-green/22 bg-brand-midnight/88 p-3 backdrop-blur-xl transition-all duration-300 group-hover:border-brand-lime/48 group-hover:bg-brand-deep/94 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_34px_rgba(25,232,90,0.2)]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-green/24 bg-brand-green/10 text-brand-green shadow-[0_0_22px_rgba(25,232,90,0.14)] transition-all duration-300 group-hover:border-brand-lime/44 group-hover:bg-brand-lime/12 group-hover:text-brand-lime group-hover:shadow-[0_0_26px_rgba(139,255,51,0.2)]">
                <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-5 text-white">
                  {title}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
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

  const [email, setEmail] = useState("");
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

  const handleLogin = async () => {
    try {
      const userLogged = await fetchBodyJson<ApiResponse<IUserInfo>>(
        "/api/auth",
        "POST",
        { email, password },
      );

      if (userLogged.data) {
        setCurrentUser(userLogged.data);
        router.replace("/dashboard?loginTransition=1");

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

    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail válido.");

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
      setError("CPF inválido. Informe os 11 dígitos.");

      return;
    }

    if (!recoveryCode) {
      setError("Informe o código de recuperação.");

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
        title: "Recuperar senha",
        subtitle: "Informe seu CPF e o código de recuperação recebido.",
      };
    }
    if (recoveryStep === "reset") {
      return {
        title: "Criar nova senha",
        subtitle: "Defina uma nova senha para acessar sua conta.",
      };
    }

    return {
      title: "Acesse o ambiente Engemedical",
      subtitle:
        "Entre com seu e-mail e senha para consultar rotinas, documentos e atendimentos.",
    };
  };

  const { title, subtitle } = renderTitle();

  return (
    <main className="min-h-screen bg-white text-slate-900">
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
                <h2 className="text-3xl font-semibold tracking-tight text-brand-midnight sm:text-[2.35rem] sm:leading-[1.08]">
                  <LoginTitle title={title} />
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {subtitle}
                </p>
              </div>

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

              {recoveryStep === "initial" && (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <InputField
                    required
                    autoComplete="email"
                    disabled={isLoading}
                    label="E-mail"
                    name="username"
                    placeholder="seuemail@empresa.com.br"
                    startIcon={<Mail className="h-4 w-4" />}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    label="Código de recuperação"
                    placeholder="Digite o código de recuperação"
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
                        Validando código...
                      </>
                    ) : (
                      <>
                        Validar código
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
                      Voltar para o login
                    </button>
                  </div>
                </div>
              )}

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
                    label="Nova senha"
                    placeholder="Digite a nova senha"
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
                          showConfirmPassword
                            ? "Esconder senha"
                            : "Mostrar senha"
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
                    label="Confirmar nova senha"
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
                        Salvando senha...
                      </>
                    ) : (
                      <>
                        Salvar nova senha
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
                      Voltar para o login
                    </button>
                  </div>
                </div>
              )}

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
                      Ainda não tem acesso?{" "}
                      <a
                        className="font-semibold text-brand-deep transition-colors hover:text-brand-blue hover:underline"
                        href="/registro"
                      >
                        Cadastre-se
                      </a>
                    </p>
                  </div>
                </>
              )}

              <div className="mt-8 space-y-2 border-t border-brand-line pt-6 text-center text-xs text-slate-500">
                <div>
                  © {new Date().getFullYear()} Engemedical Brasil · v
                  {packageInfo.version}
                </div>
                <div className="flex justify-center gap-4">
                  <a
                    className="transition-colors hover:text-brand-deep hover:underline"
                    href="/privacidade"
                  >
                    Política de Privacidade
                  </a>
                  <span>•</span>
                  <a
                    className="transition-colors hover:text-brand-deep hover:underline"
                    href="/termos-de-uso"
                  >
                    Termos de Uso
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}
