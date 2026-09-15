import type { PremiumFeedbackVariant } from "@/components/shared/PremiumFeedbackModal";
import { ApiMessages } from "@/shared/responses/ApiMessages";
import { HttpCodes } from "@/shared/responses/HttpCodes";

export interface RegistrationFeedback {
  variant: PremiumFeedbackVariant;
  title: string;
  message: string;
  detail?: string;
  primaryLabel: string;
}

interface RegistrationFeedbackInput {
  status?: number;
  message?: string | null;
}

const normalizeMessage = (message?: string | null) =>
  String(message ?? "").trim();

export function mapRegistrationFeedback({
  status,
  message,
}: RegistrationFeedbackInput): RegistrationFeedback {
  const normalizedMessage = normalizeMessage(message);

  if (
    status === HttpCodes.CONFLICT ||
    normalizedMessage === ApiMessages.USER_ALREADY_EXISTS
  ) {
    return {
      variant: "warning",
      title: "Este e-mail já tem cadastro",
      message:
        "Encontramos uma conta vinculada a este e-mail. Use o login ou recupere a senha para continuar.",
      detail: normalizedMessage || ApiMessages.USER_ALREADY_EXISTS,
      primaryLabel: "Ir para login",
    };
  }

  if (
    status === HttpCodes.NOT_FOUND ||
    normalizedMessage === ApiMessages.SOC_CADASTRO_PESSOA_NOT_FOUND
  ) {
    return {
      variant: "warning",
      title: "Código não localizado",
      message:
        "Não encontramos um cadastro elegível para esse código. Confira o código recebido e tente novamente.",
      detail: normalizedMessage || ApiMessages.SOC_CADASTRO_PESSOA_NOT_FOUND,
      primaryLabel: "Revisar dados",
    };
  }

  if (
    status === HttpCodes.BAD_REQUEST ||
    normalizedMessage === "VALIDATION_ERROR"
  ) {
    return {
      variant: "warning",
      title: "Revise os dados informados",
      message:
        "Algum campo obrigatório está incompleto ou fora do formato esperado.",
      detail: normalizedMessage || "VALIDATION_ERROR",
      primaryLabel: "Corrigir cadastro",
    };
  }

  if (
    status === HttpCodes.UNPROCESSABLE_ENTITY ||
    normalizedMessage === ApiMessages.USER_REGISTER_FAILED
  ) {
    return {
      variant: "error",
      title: "Não foi possível criar a conta",
      message:
        "O cadastro foi entendido, mas não conseguimos salvar a conta agora. Tente novamente em instantes.",
      detail: normalizedMessage || ApiMessages.USER_REGISTER_FAILED,
      primaryLabel: "Tentar novamente",
    };
  }

  if (
    status === HttpCodes.INTERNAL_SERVER_ERROR ||
    normalizedMessage === ApiMessages.INTERNAL_ERROR
  ) {
    return {
      variant: "error",
      title: "Instabilidade ao registrar",
      message:
        "Encontramos uma falha inesperada no registro. Se persistir, acione o suporte Engemedical.",
      detail: normalizedMessage || ApiMessages.INTERNAL_ERROR,
      primaryLabel: "Entendi",
    };
  }

  return {
    variant: "error",
    title: "Cadastro não concluído",
    message:
      "Não conseguimos finalizar o registro com os dados enviados. Revise as informações e tente novamente.",
    detail: normalizedMessage || "Erro não identificado",
    primaryLabel: "Revisar cadastro",
  };
}
