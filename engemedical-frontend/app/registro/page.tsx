"use client";

import React, { useState, useMemo } from "react";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  CreditCard,
  User,
  Lock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { IUserInfo } from "@/lib/user/interfaces/IUser";
import { fetchBodyJson, formatCPF } from "@/lib/utils";
import { ApiResponse } from "@/shared/responses/ApiResponse";
import { API_REGISTER_URL } from "@/config/constants";
import CMSO360Animation from "@/components/shared/CMSO360Animation";

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
      <label className="block text-sm font-medium text-gray-700" htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {startIcon}
          </div>
        )}
        <input
          aria-describedby={describedBy}
          className={`block w-full rounded-xl border border-gray-300 bg-white py-3 placeholder-gray-400 text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#104e35] focus:border-[#104e35] disabled:opacity-60 disabled:bg-gray-100 ${
            startIcon ? "pl-10" : "pl-4"
          } ${endIcon ? "pr-10" : "pr-4"}`}
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
        <span className="text-sm text-gray-600">Força da senha</span>
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

export default function RegistroPage(): JSX.Element {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentTermos, setConsentTermos] = useState(false);
  const [consentPrivacidade, setConsentPrivacidade] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError(null);
  };

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/\D/g, "");

    setCodigo(onlyNumbers);
    setError(null);
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
      const payload = { cpf, codigo, password, consentimento: true } as any;
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

    const cpfDigits = cpf.replace(/\D/g, "");

    if (cpfDigits.length !== 11) {
      setError("CPF inválido. Deve conter 11 dígitos.");

      return;
    }

    if (codigo.length < 1) {
      setError("Código de registro deve ter no mínimo 1 dígito.");

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
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");

      return;
    }

    await handleRegister();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row rounded-2xl shadow-xl overflow-hidden bg-white border border-gray-200">
        {/* Lado esquerdo - Animação CMSO 360 */}
        <div className="md:w-2/5 bg-white p-8 flex flex-col justify-center border-r border-gray-200">
          <CMSO360Animation />
        </div>

        {/* Lado direito - Formulário de registro */}
        <div className="md:w-3/5 p-8 flex flex-col justify-center">
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Criar Conta
                </h2>
                <p className="text-gray-600 mt-1">
                  Registro para colaboradores autorizados
                </p>
              </div>
              <Link
                className="text-[#104e35] hover:text-[#0d3d29] hover:underline transition-colors inline-flex items-center gap-2 text-sm"
                href="/"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Login
              </Link>
            </div>

            {error && (
              <motion.div
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6 p-3 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200 flex items-center"
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
                  describedBy="cpf-desc"
                  disabled={isLoading}
                  id="cpf"
                  label="CPF"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  startIcon={<CreditCard className="w-4 h-4" />}
                  value={cpf}
                  onChange={handleCpfChange}
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
                  id="codigo"
                  label="Código de Registro"
                  maxLength={12}
                  placeholder="Apenas números"
                  startIcon={<User className="w-4 h-4" />}
                  value={codigo}
                  onChange={handleCodigoChange}
                />
                <p className="text-xs text-gray-500 mt-1" id="codigo-desc">
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
                      className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#104e35] rounded p-1"
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
                      className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#104e35] rounded p-1"
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
                className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200"
                initial={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <ExternalLink size={14} />
                  Consentimento LGPD
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentTermos}
                    onChange={(e) => setConsentTermos(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#104e35] focus:ring-[#104e35]"
                  />
                  <span className="text-sm text-gray-600">
                    Aceito os <strong>Termos de Uso</strong> do CMSO360
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentPrivacidade}
                    onChange={(e) => setConsentPrivacidade(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#104e35] focus:ring-[#104e35]"
                  />
                  <span className="text-sm text-gray-600">
                    Aceito a{" "}
                    <a
                      href="/privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
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
                  className="w-full py-3 px-4 bg-[#104e35] text-white font-semibold rounded-xl hover:bg-[#0d3d29] focus:ring-2 focus:ring-[#104e35] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg"
                  disabled={isLoading || !consentTermos || !consentPrivacidade}
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
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </motion.div>

              <motion.div
                animate={{ opacity: 1 }}
                className="text-center text-sm text-gray-600"
                initial={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                Já possui uma conta?{" "}
                <Link
                  className="text-[#104e35] font-semibold hover:text-[#0d3d29] hover:underline transition-colors"
                  href="/"
                >
                  Faça login aqui
                </Link>
              </motion.div>
            </form>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
