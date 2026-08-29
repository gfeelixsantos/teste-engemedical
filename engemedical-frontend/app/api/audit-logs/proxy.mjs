import { resolveAuthProxyContextFromTokens } from "../_authContext.mjs";

export async function resolveAuditLogsProxyAuthContext({
  authToken,
  refreshToken,
  verifyJwt,
}) {
  const authContext = await resolveAuthProxyContextFromTokens({
    authToken,
    refreshToken,
    verifyJwt,
  });

  if (!authContext.bearerToken || !authContext.authUser) {
    return null;
  }

  return {
    authorizationHeader: `Bearer ${authContext.bearerToken}`,
    authUserHeader: JSON.stringify(authContext.authUser),
  };
}
