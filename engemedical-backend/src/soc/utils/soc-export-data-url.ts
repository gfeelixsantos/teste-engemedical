type ConfigReader = {
  get?<T = string>(key: string): T | undefined;
};

const readConfigValue = (
  key: string,
  configService?: ConfigReader,
): string | undefined => {
  const configuredValue = configService?.get?.<string>(key);
  return configuredValue ?? process.env[key];
};

export const getRequiredSocConfig = (
  key: string,
  configService?: ConfigReader,
): string => {
  const value = readConfigValue(key, configService)?.trim();

  if (!value) {
    throw new Error(`${key} não configurado.`);
  }

  return value;
};

export const getSocExportCredentials = (
  prefix: string,
  configService?: ConfigReader,
) => ({
  empresa:
    readConfigValue(`${prefix}_EMPRESA`, configService)?.trim() ||
    getRequiredSocConfig('SOC_WEBSERVICE_EMPRESA_PRINCIPAL', configService),
  codigo: getRequiredSocConfig(`${prefix}_CODIGO`, configService),
  chave: getRequiredSocConfig(`${prefix}_CHAVE`, configService),
});

export const getSocExportLayoutCredentials = (
  prefix: string,
  configService?: ConfigReader,
) => ({
  codigo: getRequiredSocConfig(`${prefix}_CODIGO`, configService),
  chave: getRequiredSocConfig(`${prefix}_CHAVE`, configService),
});

export const buildSocExportDataUrl = (
  payload: Record<string, unknown>,
  configService?: ConfigReader,
): string => {
  const baseUrl = getRequiredSocConfig(
    'SOC_EXPORT_DATA_BASE_URL',
    configService,
  );
  const parametro = encodeURIComponent(JSON.stringify(payload));

  return `${baseUrl}?parametro=${parametro}`;
};
