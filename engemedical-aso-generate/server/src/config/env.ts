export const config = {
  azure: {
    connectionString: process.env.AZURE_CONNECTION_STRING_BLOB,
  },
  database: {
    uri: process.env.DATABASE_URI,
    cluster: process.env.DATABASE_CLUSTER,
    collection: process.env.DATABASE_COLLECTION,
  },
  soc: {
    login: process.env.SOCLOGIN,
    pass: process.env.SOCPASS,
    id: process.env.SOCID,
    ws: {
      usuario: process.env.SOCWS_USUARIO,
      codUsuario: process.env.SOCWS_CODUSUARIO,
      pass: process.env.SOCWS_PASS,
      empresaPrincipal: process.env.SOCWS_EMPRESA_PRINCIPAL,
      responsavel: process.env.SOCWS_RESPONSAVEL,
    },
  },
  socged: {
    codAso: process.env.CODSOCGED_ASO,
    codTermo: process.env.CODSOCGED_TERMO,
    nomeTermo: process.env.NOMESOCGED_TERMO,
  },
  browser: {
    headless: process.env.NAVEGADOR_INVISIBLE === 'true',
  },
  google: {
    driverFolderId: process.env.GOOGLE_DRIVER_FOLDERID,
  },
};
