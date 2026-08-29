"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  NEST_GED_ARQUIVOS,
  NEST_GED_DIAS,
  NEST_GED_EMPRESAS,
  NEST_GED_PERIODOS,
  NEST_GED_PRONTUARIOS,
} from "@/config/constants";

export type NavigationLevel =
  | "root"
  | "periodos"
  | "dias"
  | "prontuarios"
  | "files";

export interface EmpresaNode {
  codigoEmpresa: string;
  razaoSocial: string;
  cnpj?: string;
  totalProntuarios: number;
  totalArquivos: number;
}

export interface PeriodoNode {
  ano: string;
  mes: string;
  totalProntuarios: number;
  totalArquivos: number;
}

export interface DiaNode {
  dia: string;
  totalProntuarios: number;
  totalArquivos: number;
}

export interface ProntuarioNode {
  codigoProntuario: string;
  nomeFuncionario: string;
  cpf?: string;
  tipoExame?: string;
  dataAgendamento?: string;
  totalArquivos: number;
}

export interface FileNode {
  blobName: string;
  fileName: string;
  nomeFuncionario: string;
  tipoExame?: string;
  dataAgendamento?: string;
  origem: "aso" | "exame" | "anexo";
}

interface UseBlobExplorerReturn {
  level: NavigationLevel;
  companies: EmpresaNode[];
  filteredCompanies: EmpresaNode[];
  periods: PeriodoNode[];
  dias: DiaNode[];
  prontuarios: ProntuarioNode[];
  files: FileNode[];
  searchQuery: string;
  selectedEmpresa: EmpresaNode | null;
  selectedPeriodo: PeriodoNode | null;
  selectedDia: DiaNode | null;
  selectedProntuario: ProntuarioNode | null;
  isLoadingCompanies: boolean;
  isLoadingPeriods: boolean;
  isLoadingDias: boolean;
  isLoadingProntuarios: boolean;
  isLoadingFiles: boolean;
  error: string | null;
  selectedFiles: Set<string>;
  setSearchQuery: (query: string) => void;
  selectEmpresa: (empresa: EmpresaNode) => Promise<void>;
  selectPeriodo: (periodo: PeriodoNode) => Promise<void>;
  selectDia: (dia: DiaNode) => Promise<void>;
  selectProntuario: (prontuario: ProntuarioNode) => Promise<void>;
  navigateToRoot: () => void;
  navigateToEmpresa: () => void;
  navigateToPeriodo: () => void;
  navigateToDia: () => void;
  toggleFileSelection: (blobName: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.message === "string"
        ? body.message
        : `HTTP ${response.status}`;

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function dedupeCompanies(companies: EmpresaNode[]): EmpresaNode[] {
  const map = new Map<string, EmpresaNode>();

  for (const company of companies) {
    const current = map.get(company.codigoEmpresa);

    if (!current) {
      map.set(company.codigoEmpresa, company);
      continue;
    }

    map.set(company.codigoEmpresa, {
      ...current,
      razaoSocial: current.razaoSocial || company.razaoSocial,
      totalProntuarios: Math.max(
        current.totalProntuarios,
        company.totalProntuarios,
      ),
      totalArquivos: Math.max(current.totalArquivos, company.totalArquivos),
    });
  }

  return Array.from(map.values());
}

export function useBlobExplorer(): UseBlobExplorerReturn {
  const [level, setLevel] = useState<NavigationLevel>("root");
  const [companies, setCompanies] = useState<EmpresaNode[]>([]);
  const [periods, setPeriods] = useState<PeriodoNode[]>([]);
  const [dias, setDias] = useState<DiaNode[]>([]);
  const [prontuarios, setProntuarios] = useState<ProntuarioNode[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaNode | null>(
    null,
  );
  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoNode | null>(
    null,
  );
  const [selectedDia, setSelectedDia] = useState<DiaNode | null>(null);
  const [selectedProntuario, setSelectedProntuario] =
    useState<ProntuarioNode | null>(null);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [isLoadingDias, setIsLoadingDias] = useState(false);
  const [isLoadingProntuarios, setIsLoadingProntuarios] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const {
    data: fetchedCompanies = [],
    isLoading: isLoadingCompanies,
    error: companiesError,
  } = useQuery({
    queryKey: ["ged-empresas"],
    queryFn: async () => {
      const data = await parseJsonResponse<
        Array<{
          codigoEmpresa: string;
          nomeEmpresa: string;
          cnpj?: string;
          totalProntuarios: number;
          totalArquivos: number;
        }>
      >(await fetch(NEST_GED_EMPRESAS));

      return dedupeCompanies(
        data.map((item) => ({
          codigoEmpresa: item.codigoEmpresa,
          razaoSocial: item.nomeEmpresa || item.codigoEmpresa,
          cnpj: item.cnpj,
          totalProntuarios: item.totalProntuarios,
          totalArquivos: item.totalArquivos,
        }))
      );
    },
  });

  useEffect(() => {
    if (fetchedCompanies.length > 0) {
      setCompanies(fetchedCompanies);
    }
  }, [fetchedCompanies]);

  useEffect(() => {
    if (companiesError) {
      setError("Não foi possível carregar as empresas com arquivos disponíveis.");
    }
  }, [companiesError]);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return companies;
    }

    return companies.filter((company) => {
      const label = `${company.razaoSocial} ${company.codigoEmpresa}`.toLowerCase();

      return label.includes(normalizedQuery);
    });
  }, [companies, searchQuery]);



  const selectEmpresa = useCallback(async (empresa: EmpresaNode) => {
    setIsLoadingPeriods(true);
    setError(null);
    setSelectedEmpresa(empresa);
    setSelectedPeriodo(null);
    setSelectedProntuario(null);
    setProntuarios([]);
    setFiles([]);
    setSelectedFiles(new Set());

    try {
      const params = new URLSearchParams({
        codigoEmpresa: empresa.codigoEmpresa,
      });
      const data = await parseJsonResponse<PeriodoNode[]>(
        await fetch(`${NEST_GED_PERIODOS}?${params.toString()}`, {
          cache: "no-store",
        }),
      );

      setPeriods(data);
      setLevel("periodos");
    } catch (loadError) {
      console.error("[useBlobExplorer] Erro ao carregar períodos GED:", loadError);
      setPeriods([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os períodos da empresa.",
      );
    } finally {
      setIsLoadingPeriods(false);
    }
  }, []);

  const selectPeriodo = useCallback(
    async (periodo: PeriodoNode) => {
      if (!selectedEmpresa) {
        return;
      }

      setIsLoadingDias(true);
      setError(null);
      setSelectedPeriodo(periodo);
      setSelectedDia(null);
      setSelectedProntuario(null);
      setDias([]);
      setProntuarios([]);
      setFiles([]);
      setSelectedFiles(new Set());

      try {
        const params = new URLSearchParams({
          codigoEmpresa: selectedEmpresa.codigoEmpresa,
          ano: periodo.ano,
          mes: periodo.mes,
        });
        const data = await parseJsonResponse<DiaNode[]>(
          await fetch(`${NEST_GED_DIAS}?${params.toString()}`, {
            cache: "no-store",
          }),
        );

        setDias(data);
        setLevel("dias");
      } catch (loadError) {
        console.error(
          "[useBlobExplorer] Erro ao carregar dias GED:",
          loadError,
        );
        setDias([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os dias do período.",
        );
      } finally {
        setIsLoadingDias(false);
      }
    },
    [selectedEmpresa],
  );

  const selectDia = useCallback(
    async (dia: DiaNode) => {
      if (!selectedEmpresa || !selectedPeriodo) {
        return;
      }

      setIsLoadingProntuarios(true);
      setError(null);
      setSelectedDia(dia);
      setSelectedProntuario(null);
      setProntuarios([]);
      setFiles([]);
      setSelectedFiles(new Set());

      try {
        const params = new URLSearchParams({
          codigoEmpresa: selectedEmpresa.codigoEmpresa,
          ano: selectedPeriodo.ano,
          mes: selectedPeriodo.mes,
          dia: dia.dia,
        });
        const data = await parseJsonResponse<ProntuarioNode[]>(
          await fetch(`${NEST_GED_PRONTUARIOS}?${params.toString()}`, {
            cache: "no-store",
          }),
        );

        setProntuarios(data);
        setLevel("prontuarios");
      } catch (loadError) {
        console.error(
          "[useBlobExplorer] Erro ao carregar prontuários GED:",
          loadError,
        );
        setProntuarios([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os prontuários do dia.",
        );
      } finally {
        setIsLoadingProntuarios(false);
      }
    },
    [selectedEmpresa, selectedPeriodo],
  );

  const selectProntuario = useCallback(
    async (prontuario: ProntuarioNode) => {
      if (!selectedEmpresa || !selectedPeriodo) {
        return;
      }

      setIsLoadingFiles(true);
      setError(null);
      setSelectedProntuario(prontuario);
      setSelectedFiles(new Set());

      try {
        const params = new URLSearchParams({
          codigoEmpresa: selectedEmpresa.codigoEmpresa,
          ano: selectedPeriodo.ano,
          mes: selectedPeriodo.mes,
          codigoProntuario: prontuario.codigoProntuario,
        });
        const data = await parseJsonResponse<FileNode[]>(
          await fetch(`${NEST_GED_ARQUIVOS}?${params.toString()}`, {
            cache: "no-store",
          }),
        );

        setFiles(data);
        setLevel("files");
      } catch (loadError) {
        console.error("[useBlobExplorer] Erro ao carregar arquivos GED:", loadError);
        setFiles([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os arquivos do prontuário.",
        );
      } finally {
        setIsLoadingFiles(false);
      }
    },
    [selectedEmpresa, selectedPeriodo],
  );

  const navigateToRoot = useCallback(() => {
    setLevel("root");
    setSelectedEmpresa(null);
    setSelectedPeriodo(null);
    setSelectedDia(null);
    setSelectedProntuario(null);
    setPeriods([]);
    setDias([]);
    setProntuarios([]);
    setFiles([]);
    setSelectedFiles(new Set());
    setError(null);
  }, []);

  const navigateToEmpresa = useCallback(() => {
    setLevel("periodos");
    setSelectedPeriodo(null);
    setSelectedDia(null);
    setSelectedProntuario(null);
    setDias([]);
    setProntuarios([]);
    setFiles([]);
    setSelectedFiles(new Set());
    setError(null);
  }, []);

  const navigateToPeriodo = useCallback(() => {
    setLevel("dias");
    setSelectedDia(null);
    setSelectedProntuario(null);
    setProntuarios([]);
    setFiles([]);
    setSelectedFiles(new Set());
    setError(null);
  }, []);

  const navigateToDia = useCallback(() => {
    setLevel("prontuarios");
    setSelectedProntuario(null);
    setFiles([]);
    setSelectedFiles(new Set());
    setError(null);
  }, []);

  const toggleFileSelection = useCallback((blobName: string) => {
    setSelectedFiles((current) => {
      const next = new Set(current);

      if (next.has(blobName)) {
        next.delete(blobName);
      } else {
        next.add(blobName);
      }

      return next;
    });
  }, []);

  const selectAllFiles = useCallback(() => {
    setSelectedFiles(new Set(files.map((file) => file.blobName)));
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  return {
    level,
    companies,
    filteredCompanies,
    periods,
    dias,
    prontuarios,
    files,
    searchQuery,
    selectedEmpresa,
    selectedPeriodo,
    selectedDia,
    selectedProntuario,
    isLoadingCompanies,
    isLoadingPeriods,
    isLoadingDias,
    isLoadingProntuarios,
    isLoadingFiles,
    error,
    selectedFiles,
    setSearchQuery,
    selectEmpresa,
    selectPeriodo,
    selectDia,
    selectProntuario,
    navigateToRoot,
    navigateToEmpresa,
    navigateToPeriodo,
    navigateToDia,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
  };
}
