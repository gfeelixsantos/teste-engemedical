import { resolveAuditLogsProxyAuthContext } from "./proxy.mjs";

export async function handleAuditLogsProxy({
  requestUrl,
  authToken,
  refreshToken,
  verifyJwt,
  fetchImpl,
}) {
  const authContext = await resolveAuditLogsProxyAuthContext({
    authToken,
    refreshToken,
    verifyJwt,
  });

  if (!authContext) {
    return {
      status: 401,
      body: JSON.stringify({ message: "Nao autenticado." }),
      contentType: "application/json",
    };
  }

  const targetUrl = new URL(requestUrl);

  try {
    const headers = new Headers();

    if (authContext.authorizationHeader) {
      headers.set("Authorization", authContext.authorizationHeader);
    }

    headers.set("x-auth-user", authContext.authUserHeader);

    const response = await fetchImpl(targetUrl.toString(), {
      method: "GET",
      headers,
    });

    return {
      status: response.status,
      body: await response.text(),
      contentType: response.headers.get("Content-Type") ?? "application/json",
    };
  } catch (error) {
    console.error("[BFF:audit-logs]", error);

    return {
      status: 500,
      body: JSON.stringify({ message: "Falha ao consultar logs de auditoria." }),
      contentType: "application/json",
    };
  }
}
