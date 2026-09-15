export function getHomeRoute(user) {
  return user?.tipoUsuario === "cliente" ? "/cliente" : "/visao-geral";
}
