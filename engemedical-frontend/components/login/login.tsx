"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  FileCheck2,
  HeartPulse,
  LayoutDashboard,
  Lock,
  Network,
  ShieldCheck,
  User,
} from "lucide-react";

import engemedicalIcon from "@/public/images/logo.png";
import packageInfo from "@/package.json";
import PremiumCyberLoading from "@/components/shared/PremiumCyberLoading";
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
        Entrando...
      </>
    ) : (
      <>
        Entrar
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </>
    )}
  </button>
);

const brandPillars = [
  {
    icon: ShieldCheck,
    title: "Conformidade Total",
  },
  {
    icon: LayoutDashboard,
    title: "Gestão Centralizada",
  },
  {
    icon: BarChart3,
    title: "Dados Estratégicos",
  },
];

// ... logo depois usa apenas title nos cards

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
  return (
    <div className="text-center">
      <span
        aria-label={text}
        className="typewriter-text min-h-[4.1rem] text-lg font-light tracking-wide leading-tight text-white/65 drop-shadow-[0_6px_20px_rgba(255,255,255,0.08)] sm:min-h-[4.9rem] sm:text-xl"
      >
        {text}
      </span>
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

const BrandPanel = () => (
  <motion.section
    animate={{ opacity: 1 }}
    className="cyber-grid relative flex min-h-[500px] flex-col justify-between overflow-hidden bg-[#020817] p-6 pt-6 pb-20 text-white md:min-h-[680px] md:p-9"
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
        <div className="mt-2">
          <TypewriterTitle text="Conectando você ao futuro SST" />
          <p className="mt-1 text-xs text-white/50">
            Transforme sua operação em uma experiência premium de gestão SST
          </p>
        </div>
      </div>
    </div>

    <div className="relative z-10 space-y-4">
      <div className="grid gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-3">
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
            <div className="relative flex h-full min-h-[86px] items-start gap-3 rounded-[7px] border border-brand-green/22 bg-brand-midnight/88 p-3 backdrop-blur-xl transition-all duration-300 group-hover:border-brand-lime/48 group-hover:bg-brand-deep/94 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_34px_rgba(25,232,90,0.2)]">
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

  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("initial");
  const [recoveryCpf, setRecoveryCpf] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showPostLoginTransition, setShowPostLoginTransition] = useState(false);
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

        setShowPostLoginTransition(true);

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
      setError("CPF inválido. Informe os 11 dígitos.");

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

  const handlePostLoginComplete = () => {
    router.push("/dashboard");
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------

  const renderTitle = () => {
    if (recoveryStep === "validate") {
      return {
        title: "Recuperar senha",
        description: "Informe o CPF e o código recebido por e-mail.",
      };
    }

    if (recoveryStep === "reset") {
      return {
        title: "Criar nova senha",
        description: "Digite a nova senha e confirme.",
      };
    }

    if (recoveryCpf && !recoveryCode) {
      return {
        title: "Código inválido",
        description: "O código informado está incorreto. Tente novamente.",
      };
    }

    if (newPassword && newPassword === confirmPassword) {
      return {
        title: "Salvar nova senha",
        description: "Sua senha foi alterada com sucesso!",
      };
    }

    return {
      title: "Login",
      description: "Acesse seu ambiente Engemedical",
    };
  };

  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col bg-gradient-to-b from-[#020817] to-[#03111f]">
      <PremiumCyberLoading visible={isLoading} />

      <ShowPostLoginTransition show={showPostLoginTransition} />

      <motion.div
        animate={{ opacity: showPostLoginTransition ? 1 : 0 }}
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />

      <ShowPostLoginTransition show={showPostLoginTransition} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 md:gap-6">
        <LoginTitle title={renderTitle().title} />
        <ShowPostLoginTransition show={showPostLoginTransition} />

        <div className="w-full max-w-md space-y-4">
          <div className="space-y-4">
            {renderTitle().title === "Recuperar senha" && (
              <div className="space-y-4">
                <InputField
                  label="CPF"
                  placeholder="123.456.789-00"
                  value={recoveryCpf}
                  onChange={handleRecoveryCPFChange}
                  autoComplete="off"
                  name="recoveryCpf"
                  startIcon={<User className="h-4 w-4 text-brand-deep/45" />}
                />
                <InputField
                  label="Código de recuperação"
                  placeholder="Digite o código"
                  value={recoveryCode}
                  onChange={handleRecoveryCodeChange}
                  autoComplete="off"
                  name="recoveryCode"
                  startIcon={<Lock className="h-4 w-4 text-brand-deep/45" />}
                />
                <p className="text-xs text-white/54">
                  Digite o código enviado ao e-mail cadastrado.
                </p>
              </div>
            )}

            {renderTitle().title === "Criar nova senha" && (
              <div className="space-y-4">
                <InputField
                  label="Nova senha"
                  placeholder="Digite a nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  name="newPassword"
                  type="password"
                  startIcon={<Lock className="h-4 w-4 text-brand-deep/45" />}
                />
                <InputField
                  label="Confirmar senha"
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  name="confirmPassword"
                  type="password"
                  startIcon={<Lock className="h-4 w-4 text-brand-deep/45" />}
                />
              </div>
            )}

            {renderTitle().title === "Login" && (
              <>
                <InputField
                  label="CPF"
                  placeholder="123.456.789-00"
                  value={cpf}
                  onChange={handleCPFChange}
                  autoComplete="off"
                  name="cpf"
                  startIcon={<User className="h-4 w-4 text-brand-deep/45" />}
                />
                <InputField
                  label="Senha"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  name="password"
                  type="password"
                  startIcon={<Lock className="h-4 w-4 text-brand-deep/45" />}
                  endIcon={showPassword ? <Eye className="h-4 w-4 text-brand-deep/45" /> : <EyeOff className="h-4 w-4 text-brand-deep/45" />}
                  disabled={isLoading}
                />
                {password !== "" && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-brand-cyan transition-colors hover:underline"
                    onClick={() => setPassword("")}
                  >
                    Limpar senha
                  </button>
                )}
              </>
            )}

            {renderTitle().title === "Código inválido" && (
              <div className="space-y-4">
                <InputField
                  label="Novo código"
                  placeholder="Digite o código novamente"
                  value={recoveryCode}
                  onChange={handleRecoveryCodeChange}
                  autoComplete="off"
                  name="recoveryCode"
                  startIcon={<Lock className="h-4 w-4 text-brand-deep/45" />}
                />
                <p className="text-xs text-white/54">
                  O código expirou após 15 minutos. Solicite um novo.
                </p>
              </div>
            )}

            {renderTitle().title === "Salvar nova senha" && (
              <p className="text-xs text-green-400">
                ✅ {renderTitle().description}
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {successMessage && (
            <p className="text-xs text-green-400">{successMessage}</p>
          )}

          {renderTitle().title === "Login" && (
            <p className="text-xs text-white/54">
              {renderTitle().description}
            </p>
          )}

          <SubmitButton isLoading={isLoading} />

          {renderTitle().title === "Login" && (
            <button
              type="button"
              className="w-full text-center text-xs text-brand-cyan transition-colors hover:underline"
              onClick={startRecovery}
            >
              Ainda não tem acesso? Solicitar cadastro
            </button>
          )}

          {renderTitle().title !== "Login" && (
            <button
              type="button"
              className="w-full text-center text-xs text-brand-cyan transition-colors hover:underline"
              onClick={backToLogin}
            >
              Voltar para login
            </button>
          )}
        </div>
      </div>

      <BrandPanel />
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENTES SECUNDÁRIOS
// -------------------------------------------------------------

const ShowPostLoginTransition = ({ show }: { show: boolean }) => (
  <motion.div
    animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.95 }}
    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
    initial={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    exit={{ opacity: 0, scale: 0.95 }}
    style={{ display: show ? "block" : "none" }}
  >
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
      className="absolute inset-0 rounded-full border-2 border-brand-cyan"
      transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
    />
  </motion.div>
);