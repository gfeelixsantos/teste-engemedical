import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";

export async function handleFacialProxy({
  request,
  authToken,
  refreshToken,
  verifyJwt,
  fetchImpl,
  backendBaseUrl,
  endpoint,
  method,
}) {
  const authContext = await resolveAuthProxyContextFromTokens({
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

  const headers = new Headers({
    Authorization: `Bearer ${authContext.bearerToken}`,
    "x-auth-user": JSON.stringify(authContext.authUser),
  });

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

    if (payload && typeof payload === "object") {
      delete payload.user;
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
        message: "Falha ao processar fluxo facial.",
      }),
      contentType: "application/json",
    };
  }
}
