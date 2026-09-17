"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import { getCurrentUser } from "@/lib/utils";
import { IndexDb } from "@/lib/indexDb/indexdb";
import { parseEmpresaCodes } from "@/lib/user/empresa-parser";

export type EmpresaStatus =
  | "loading"
  | "empty_registration_code"
  | "no_companies"
  | "missing_companies"
  | "error"
  | "ok";

interface EmpresaContextType {
  empresas: CadastroEmpresa[];
  selectedEmpresa: CadastroEmpresa | null;
  setSelectedEmpresa: (empresa: CadastroEmpresa | null) => void;
  isLoading: boolean;
  status: EmpresaStatus;
  missingCodes: string[];
  invalidCodes: string[];
  registrationCode: string;
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresas: [],
  selectedEmpresa: null,
  setSelectedEmpresa: () => {},
  isLoading: true,
  status: "loading",
  missingCodes: [],
  invalidCodes: [],
  registrationCode: "",
});

export function useEmpresas() {
  return useContext(EmpresaContext);
}

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<CadastroEmpresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<CadastroEmpresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<EmpresaStatus>("loading");
  const [missingCodes, setMissingCodes] = useState<string[]>([]);
  const [invalidCodes, setInvalidCodes] = useState<string[]>([]);
  const [registrationCode, setRegistrationCode] = useState("");

  useEffect(() => {
    const loadEmpresas = async () => {
      const user = getCurrentUser();
      const regCode = user?.registrationCode || "";
      setRegistrationCode(regCode);

      if (!regCode || !regCode.trim()) {
        setStatus("empty_registration_code");
        setIsLoading(false);
        return;
      }

      const codes = parseEmpresaCodes(regCode);
      const invalid = codes.filter((c) => !/^\d{3,10}$/.test(c));
      const valid = codes.filter((c) => /^\d{3,10}$/.test(c));
      setInvalidCodes(invalid);

      if (valid.length === 0) {
        setStatus("no_companies");
        setIsLoading(false);
        return;
      }

      // 1) Tentar empresas do userInfo (servidor entregou no login)
      const serverEmpresas = (user as any).empresas as CadastroEmpresa[] | undefined;
      if (serverEmpresas && serverEmpresas.length > 0) {
        setEmpresas(serverEmpresas);
        const foundCodes = serverEmpresas.map((e) => String(e.CODIGO));
        const missing = valid.filter((c) => !foundCodes.includes(c));
        setMissingCodes(missing);

        // Cache no IndexedDB para offline
        try { await IndexDb.saveCompanies(serverEmpresas); } catch {}

const savedId = sessionStorage.getItem("selectedEmpresaId");
       const sel = savedId
         ? serverEmpresas.find((e) => String(e.CODIGO) === String(savedId))
         : null;
       setSelectedEmpresa(sel);

        setStatus(missing.length > 0 ? "missing_companies" : "ok");
        setIsLoading(false);
        return;
      }

      // 2) Fallback: buscar do IndexedDB
      const empresasFromDb: CadastroEmpresa[] = [];
      const missing: string[] = [];
      for (const code of valid) {
        const empresa = await IndexDb.getCompanyById(code);
        if (empresa) {
          empresasFromDb.push(empresa);
        } else {
          missing.push(code);
        }
      }

      setEmpresas(empresasFromDb);
      setMissingCodes(missing);

      if (empresasFromDb.length === 0) {
        setStatus("no_companies");
      } else if (missing.length > 0) {
        setStatus("missing_companies");
      } else {
        setStatus("ok");
      }

const savedId = sessionStorage.getItem("selectedEmpresaId");
       const sel = savedId
         ? empresasFromDb.find((e) => String(e.CODIGO) === String(savedId))
         : null;
       setSelectedEmpresa(sel);

      setIsLoading(false);
    };

    loadEmpresas();
  }, []);

  const handleSetSelectedEmpresa = (empresa: CadastroEmpresa | null) => {
    setSelectedEmpresa(empresa);
    if (empresa) {
      sessionStorage.setItem("selectedEmpresaId", String(empresa.CODIGO));
    } else {
      sessionStorage.removeItem("selectedEmpresaId");
    }
  };

  return (
    <EmpresaContext.Provider
      value={{
        empresas,
        selectedEmpresa,
        setSelectedEmpresa: handleSetSelectedEmpresa,
        isLoading,
        status,
        missingCodes,
        invalidCodes,
        registrationCode,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}
