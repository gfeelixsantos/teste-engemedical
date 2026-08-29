export async function resolveAuthProxyContextFromTokens({
  authToken,
  refreshToken,
  verifyJwt,
}) {
  if (authToken) {
    const payload = await verifyJwt(authToken);
    if (payload) {
      const { exp, iat, ...authUser } = payload;
      return { bearerToken: authToken, authUser };
    }
  }

  if (refreshToken) {
    const payload = await verifyJwt(refreshToken);
    if (payload) {
      const { exp, iat, ...authUser } = payload;
      return { bearerToken: refreshToken, authUser };
    }
  }

  return {};
}
