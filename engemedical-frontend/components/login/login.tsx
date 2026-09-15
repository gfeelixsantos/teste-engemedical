"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";

import engemedicalIcon from "@/public/images/logo.png";
import packageInfo from "@/package.json";
import { fetchBodyJson, formatCPF, setCurrentUser } from "@/lib/utils";
import { getHomeRoute } from "@/lib/user/home-route.mjs";
import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { ApiResponse } from "@/shared/responses/ApiResponse";
import { BrandPanel } from "@/components/shared/BrandPanel";

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
        router.replace(getHomeRoute(userLogged.data));

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
