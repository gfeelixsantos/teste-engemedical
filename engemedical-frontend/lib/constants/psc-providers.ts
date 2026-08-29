export const PSC_PROVIDERS = [
  { psc: "", provider: "Nenhum" },
  { psc: "Syn", provider: "Syngular" },
  { psc: "SafeID", provider: "Safeweb" },
  { psc: "SerproID", provider: "Serpro" },
  { psc: "RemoteID", provider: "Certisign" },
  { psc: "BirdID", provider: "Soluti" },
  { psc: "Vidaas", provider: "Valid" },
  { psc: "DS Cloud", provider: "Digital Sign" },
] as const;

export type PscProvider = (typeof PSC_PROVIDERS)[number]["psc"];
