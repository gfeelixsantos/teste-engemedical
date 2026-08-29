import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";
import { createAuditRequestId } from "../../../lib/audit-log/request-id.mjs";

function sanitizeString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function resolveCriticalDeleteAuthContext({
  authToken,
  refreshToken,
  verifyJwt,
}) {
  const authContext = await resolveAuthProxyContextFromTokens({
    authToken,
    refreshToken,
    verifyJwt,
  });

  if (!authContext?.bearerToken || !authContext?.authUser) {
    return null;
  }

  return {
    bearerToken: authContext.bearerToken,
    authUser: authContext.authUser,
    authUserHeader: JSON.stringify(authContext.authUser),
  };
}

export async function handleCriticalDeleteProxy({
  request,
  endpoint,
  method,
  authToken,
  refreshToken,
  verifyJwt,
  reauthenticate,
  fetchImpl,
  backendBaseUrl,
}) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return {
      status: 400,
      body: JSON.stringify({ message: "Payload invalido." }),
      contentType: "application/json",
    };
  }

  const motivo = sanitizeString(payload?.motivo);
  const password = sanitizeString(payload?.password);

  if (!motivo || !password) {
    return {
      status: 400,
      body: JSON.stringify({
        message: "Motivo e senha de login sao obrigatorios.",
      }),
      contentType: "application/json",
    };
  }

  const authContext = await resolveCriticalDeleteAuthContext({
    authToken,
    refreshToken,
    verifyJwt,
  });

  if (!authContext?.authUser?.cpf) {
    return {
      status: 401,
      body: JSON.stringify({ message: "Nao autenticado." }),
      contentType: "application/json",
    };
  }

  const reauthResult = await reauthenticate({
    cpf: authContext.authUser.cpf,
    password,
    authUser: authContext.authUser,
  });

  if (!reauthResult?.ok) {
    return {
      status: 401,
      body: JSON.stringify({ message: "Credenciais invalidas." }),
      contentType: "application/json",
    };
  }

  const requestId =
    sanitizeString(payload?.requestId) || createAuditRequestId("req");
  const proxiedBody = {
    ...payload,
    motivo,
    requestId,
    reauthenticated: true,
  };

  delete proxiedBody.password;

  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${authContext.bearerToken}`,
    "x-auth-user": authContext.authUserHeader,
    "x-request-id": requestId,
    "x-reauthenticated": "true",
  });

  try {
    const response = await fetchImpl(`${backendBaseUrl}${endpoint}`, {
      method,
      headers,
      body: JSON.stringify(proxiedBody),
    });

    return {
      status: response.status,
      body: await response.text(),
      contentType: response.headers.get("Content-Type") ?? "application/json",
    };
  } catch (error) {
    console.error(`[BFF:${endpoint}]`, error);

    return {
      status: 500,
      body: JSON.stringify({
        message: "Falha ao processar exclusao critica.",
      }),
      contentType: "application/json",
    };
  }
}
