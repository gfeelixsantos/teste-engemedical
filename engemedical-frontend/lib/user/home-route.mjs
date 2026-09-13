export function getHomeRoute(user) {
  return user?.tipoUsuario === "cliente" ? "/inicio" : "/visao-geral";
}
