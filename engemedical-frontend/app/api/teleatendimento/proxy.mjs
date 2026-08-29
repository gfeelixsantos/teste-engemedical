import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";

export async function handleTeleatendimentoProxy({
  request,
  authToken,
  refreshToken,
  verifyJwt,
  fetchImpl,
  backendBaseUrl,
  endpoint,
  method,
  requiresAuth = true,
}) {
  let authContext = null;

  if (requiresAuth) {
    authContext = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt,
    });

    if (!authContext?.bearerToken || !authContext?.authUser) {
      return {
        status: 401,
        body: JSON.stringify({ message: "Nao autenticado." }),
        contentType: "application/json",
      };
    }
  }

  const headers = new Headers();

  if (requiresAuth && authContext?.bearerToken && authContext?.authUser) {
    headers.set("Authorization", `Bearer ${authContext.bearerToken}`);
    headers.set("x-auth-user", JSON.stringify(authContext.authUser));
  }

  const appOrigin = request?.nextUrl?.origin;
  if (appOrigin) {
    headers.set("x-app-origin", appOrigin);
  }

  const init = {
    method,
    headers,
  };

  if (method !== "GET") {
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

    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(payload);
  }

  try {
    const response = await fetchImpl(`${backendBaseUrl}${endpoint}`, init);

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
        message: "Falha ao processar teleatendimento.",
      }),
      contentType: "application/json",
    };
  }
}
