"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Database,
  Search,
  Brain,
  Link2,
  Zap,
  Stethoscope,
  BadgeDollarSign,
  PackageCheck,
  Monitor,
  Receipt,
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tabs,
  Tab,
  Switch,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Pagination,
  Tooltip,
} from "@heroui/react";

import CmsoCircularLoading from "@/components/shared/CmsoCircularLoading";
import { NEST_URL } from "@/config/constants";
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) return parts.pop()?.split(";").shift();

  return undefined;
}

function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");

  if (clean.length !== 14) return cnpj;

  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

import { useRouter } from "next/navigation";

import { IUserInfo } from "@/lib/user/interfaces/IUser";

interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

interface AmbienteEdificacao {
  ambiente: string;
  descricao: string;
}

interface ResponsavelTecnico {
  nome: string;
  documentos: ("PCMSO" | "PGR" | "LTCAT")[];
  registro: string;
  uf: string;
  dataInicio?: string;
  dataFim?: string;
}

interface ContratanteEmpresa {
  cnpj: string;
  razaoSocial: string;
  cidade: string;
  uf: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  cnae?: string;
  grauDeRisco?: number;
}

interface ContatoEmpresa {
  nome: string;
  email: string;
  telefone: string;
  perfil: string;
}

interface Company {
  CODIGO: string;
  CNPJ: string;
  RAZAOSOCIAL: string;
  NOMEABREVIADO: string;
  ATIVO: string;
  CNAE?: string;
  RAMO_ATIVIDADE?: string;
  GRAU_RISCO?: number;
  NUMERO_FUNCIONARIOS?: number;
  FONE_FAX?: string;
  cnaesSecundarios?: string[];
  representanteLegal?: string;
  codigoIbgeMunicipio?: string;
  situacaoCadastral?: string;
  email?: string;
  telefone?: string;
  endereco?: Endereco;
  ENDERECO?: string;
  NUMEROENDERECO?: string;
  COMPLEMENTOENDERECO?: string;
  BAIRRO?: string;
  CIDADE?: string;
  CEP?: string;
  UF?: string;
  ambientesEdificacao?: AmbienteEdificacao[];
  responsaveisTecnicos?: ResponsavelTecnico[];
  contratantes?: ContratanteEmpresa[];
  configuracoes?: {
    requerPsicologa: boolean;
    credenciadaSoc: boolean;
    somenteComplementares?: boolean;
    faturamento?: "CMSO" | "SEGTEC";
    devedor?: boolean;
    asoRapidoAutomatico?: boolean;
    gestaoEpi?: boolean;
    painel?: boolean;
  };
  contatos?: ContatoEmpresa[];
  documentosUrl?: string[];
  codigoInternoCliente?: string;
  "CÓD. CLIENTE (INT.)"?: string;
  avisos?: string;
  observacoes?: string;
}

interface EmpresasSectionProps {
  user: IUserInfo;
}

export function EmpresasSection({ user }: EmpresasSectionProps) {
  const router = useRouter();

  // Redirect non-MASTER users
  useEffect(() => {
    if (user?.perfil !== "MASTER") {
      router.replace("/configuracoes");
    }
  }, [user?.perfil, router]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [isCreate, setIsCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  const [searchString, setSearchString] = useState("");
  const [configFilters, setConfigFilters] = useState<Set<string>>(new Set());

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Import states
  const [socCompanies, setSocCompanies] = useState<Company[]>([]);
  const [importingSoc, setImportingSoc] = useState(false);
  const [cnpjBusca, setCnpjBusca] = useState("");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [socSearchTerm, setSocSearchTerm] = useState("");

  const [form, setForm] = useState<Partial<Company>>({
    CODIGO: "",
    CNPJ: "",
    RAZAOSOCIAL: "",
    NOMEABREVIADO: "",
    CNAE: "",
    RAMO_ATIVIDADE: "",
    GRAU_RISCO: 1,
    NUMERO_FUNCIONARIOS: 0,
    FONE_FAX: "",
    ENDERECO: "",
    NUMEROENDERECO: "",
    COMPLEMENTOENDERECO: "",
    BAIRRO: "",
    CIDADE: "",
    CEP: "",
    UF: "",
    configuracoes: {
      requerPsicologa: false,
      credenciadaSoc: false,
      somenteComplementares: false,
      faturamento: "CMSO",
      devedor: false,
      asoRapidoAutomatico: false,
      gestaoEpi: false,
      painel: false,
    },
    codigoInternoCliente: "",
    avisos: "",
    observacoes: "",
  });

  const [ambientes, setAmbientes] = useState<AmbienteEdificacao[]>([]);
  const [responsaveis, setResponsaveis] = useState<ResponsavelTecnico[]>([]);
  const [contratantes, setContratantes] = useState<ContratanteEmpresa[]>([]);
  const [contatos, setContatos] = useState<ContatoEmpresa[]>([]);

  // Temporary row states for adding
  const [newAmbiente, setNewAmbiente] = useState<AmbienteEdificacao>({
    ambiente: "",
    descricao: "",
  });
  const [newResponsavel, setNewResponsavel] = useState<ResponsavelTecnico>({
    nome: "",
    documentos: [],
    registro: "",
    uf: "",
    dataInicio: "",
    dataFim: "",
  });
  const [newContratante, setNewContratante] = useState<ContratanteEmpresa>({
    cnpj: "",
    razaoSocial: "",
    cidade: "",
    uf: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cep: "",
    cnae: "",
    grauDeRisco: 1,
  });
  const [newContato, setNewContato] = useState<ContatoEmpresa>({
    nome: "",
    email: "",
    telefone: "",
    perfil: "",
  });
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(
    null,
  );
  const [buscandoContratanteCnpj, setBuscandoContratanteCnpj] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [initialStateSnapshot, setInitialStateSnapshot] = useState<string>("");

  const getSnapshot = (
    f: Partial<Company>,
    amb: AmbienteEdificacao[],
    resp: ResponsavelTecnico[],
    contr: ContratanteEmpresa[],
    cont: ContatoEmpresa[],
  ) => {
    return JSON.stringify({
      form: f,
      ambientes: amb,
      responsaveis: resp,
      contratantes: contr,
      contatos: cont,
    });
  };

  // Documentos states
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [showReplaceFile, setShowReplaceFile] = useState(false);
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const currentMonthYear = new Date().toLocaleDateString("pt-BR", {
    month: "2-digit",
    year: "numeric",
  });

  const [newDocData, setNewDocData] = useState({
    categoria: "FATURAMENTO",
    tipoDocumento: "Relatório Faturamento",
    dataReferencia: currentMonthYear,
    observacoes: "",
    comunicarEmail: false,
    contatosNotificados: [] as string[],
  });

  async function fetchDocumentos(codigoEmpresa: string) {
    if (!codigoEmpresa) return;
    setLoadingDocumentos(true);
    try {
      const res = await fetch(`/api/empresas/${codigoEmpresa}/documentos`);

      if (res.ok) {
        const data = await res.json();
        const normalized = Array.isArray(data)
          ? data.map((doc: any) => ({
              _id: doc._id,
              tipoDocumento: doc.TIPODOCUMENTO || doc.tipoDocumento || "",
              nomeArquivoOriginal:
                doc.NOMEARQUIVOORIGINAL || doc.nomeArquivoOriginal || "",
              blobUrl: doc.BLOBURL || doc.blobUrl || "",
              dataReferencia: doc.DATAREFERENCIA || doc.dataReferencia || "",
              criadoEm: doc.CRIADOEM || doc.criadoEm || null,
              criadoPor: doc.CRIADOPOR || doc.criadoPor || "",
              comunicarEmail: doc.COMUNICAREMAIL || doc.comunicarEmail || false,
              contatosNotificados:
                doc.CONTATOSNOTIFICADOS || doc.contatosNotificados || [],
              categoria: doc.CATEGORIA || doc.categoria || "",
              observacoes: doc.OBSERVACOES || doc.observacoes || "",
            }))
          : [];

        setDocumentos(normalized);
      }
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
    } finally {
      setLoadingDocumentos(false);
    }
  }

  async function handleUploadDocumento() {
    if (!newDocFile || !form.CODIGO) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();

      formData.append("file", newDocFile);
      formData.append("categoria", newDocData.categoria);
      formData.append("tipoDocumento", newDocData.tipoDocumento);
      formData.append("dataReferencia", newDocData.dataReferencia);
      formData.append("observacoes", newDocData.observacoes);
      formData.append("comunicarEmail", String(newDocData.comunicarEmail));
      formData.append(
        "contatosNotificados",
        JSON.stringify(newDocData.contatosNotificados),
      );

      const res = await fetch(`/api/empresas/${form.CODIGO}/documentos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("Upload concluído com sucesso!");
        setShowUploadForm(false);
        setEditingDoc(null);
        setNewDocFile(null);
        setNewDocData({
          categoria: "FATURAMENTO",
          tipoDocumento: "Relatório Faturamento",
          dataReferencia: currentMonthYear,
          observacoes: "",
          comunicarEmail: false,
          contatosNotificados: [],
        });
        fetchDocumentos(form.CODIGO);
      } else {
        const errData = await res.json();

        alert(errData.message || "Erro no upload.");
      }
    } catch (err) {
      console.error("Erro no upload:", err);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleUpdateDocumento() {
    if (!editingDoc || !form.CODIGO) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();

      if (newDocFile) {
        formData.append("file", newDocFile);
      }
      formData.append("comunicarEmail", String(newDocData.comunicarEmail));
      formData.append(
        "contatosNotificados",
        JSON.stringify(newDocData.contatosNotificados),
      );

      const res = await fetch(
        `/api/empresas/${form.CODIGO}/documentos/${editingDoc._id}`,
        {
          method: "PATCH",
          body: formData,
        },
      );

      if (res.ok) {
        alert("Documento atualizado com sucesso!");
        setEditingDoc(null);
        setShowUploadForm(false);
        setNewDocFile(null);
        setNewDocData({
          categoria: "FATURAMENTO",
          tipoDocumento: "Relatório Faturamento",
          dataReferencia: currentMonthYear,
          observacoes: "",
          comunicarEmail: false,
          contatosNotificados: [],
        });
        fetchDocumentos(form.CODIGO);
      } else {
        const errData = await res.json();

        alert(errData.message || "Erro ao atualizar documento.");
      }
    } catch (err) {
      console.error("Erro ao atualizar documento:", err);
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleDeleteDocumento(docId: string) {
    if (!window.confirm("Deseja realmente excluir este documento?")) return;
    try {
      const res = await fetch(
        `/api/empresas/${form.CODIGO}/documentos/${docId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        fetchDocumentos(form.CODIGO as string);
      } else {
        alert("Erro ao excluir documento.");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSyncSocContacts() {
    if (!form.CODIGO) {
      alert("Código SOC da empresa não definido.");

      return;
    }
    setSyncingContacts(true);
    try {
      const token = getCookie("auth_token");
      const res = await fetch(
        `${NEST_URL}soc/empresas/${form.CODIGO}/contatos`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data
            .map((c: any) => ({
              nome: c.nome || c.nomeContato || c.contato || "Contato SOC",
              email: c.primeiroEmail || c.email || "",
              telefone:
                c.telefone ||
                (c.dddTelefone && c.telefone
                  ? `(${c.dddTelefone}) ${c.telefone}`
                  : "") ||
                "",
              perfil: c.nomePerfil || c.codigoPerfil || "",
            }))
            .filter((c) => c.email);

          if (mapped.length === 0) {
            alert(
              "Nenhum contato com e-mail encontrado no SOC para esta empresa.",
            );

            return;
          }

          const novosContatos = [...contatos];
          let adicionados = 0;

          mapped.forEach((c) => {
            if (
              !novosContatos.some(
                (existing) =>
                  existing.email.toLowerCase() === c.email.toLowerCase(),
              )
            ) {
              novosContatos.push(c);
              adicionados++;
            }
          });

          setContatos(novosContatos);
          alert(`${adicionados} novos contatos importados do SOC com sucesso.`);
        } else {
          alert("Nenhum contato retornado pelo SOC para esta empresa.");
        }
      } else {
        alert("Erro ao buscar contatos do SOC.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao buscar contatos.");
    } finally {
      setSyncingContacts(false);
    }
  }

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchSocCompaniesList() {
    setImportingSoc(true);
    try {
      const token = getCookie("auth_token");
      const res = await fetch(`${NEST_URL}soc/empresas/soc-export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? data.sort((a, b) =>
              (a.RAZAOSOCIAL || "").localeCompare(b.RAZAOSOCIAL || "", "pt-BR"),
            )
          : [];

        setSocCompanies(sorted);
      }
    } catch (err) {
      console.error("Erro ao buscar lista do SOC:", err);
    } finally {
      setImportingSoc(false);
    }
  }

  async function handleImportSoc(codigo: string) {
    const comp = socCompanies.find((c) => c.CODIGO === codigo);

    if (!comp) return;
    setForm((prev) => ({
      ...prev,
      CODIGO: comp.CODIGO || "",
      CNPJ: comp.CNPJ || "",
      RAZAOSOCIAL: comp.RAZAOSOCIAL || "",
      NOMEABREVIADO: comp.NOMEABREVIADO || "",
      CNAE: comp.CNAE || "",
      RAMO_ATIVIDADE: comp.RAMO_ATIVIDADE || "",
      ENDERECO: comp.ENDERECO || "",
      NUMEROENDERECO: comp.NUMEROENDERECO || "",
      COMPLEMENTOENDERECO: comp.COMPLEMENTOENDERECO || "",
      BAIRRO: comp.BAIRRO || "",
      CIDADE: comp.CIDADE || "",
      CEP: comp.CEP || "",
      UF: comp.UF || "",
    }));

    try {
      const token = getCookie("auth_token");
      const res = await fetch(`${NEST_URL}soc/empresas/${codigo}/contatos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data
            .map((c: any) => ({
              nome: c.nome || c.nomeContato || c.contato || "Contato SOC",
              email: c.primeiroEmail || c.email || "",
              telefone:
                c.telefone ||
                (c.dddTelefone && c.telefone
                  ? `(${c.dddTelefone}) ${c.telefone}`
                  : "") ||
                "",
              perfil: c.nomePerfil || c.codigoPerfil || "",
            }))
            .filter((c) => c.email);

          setContatos(mapped);
        }
      }
    } catch (err) {
      console.error("Erro ao importar contatos automaticamente do SOC:", err);
    }
  }

  async function handleBuscarCnpj(
    isFromContratante: boolean = false,
    customCnpj?: string,
  ) {
    const cnpjParaBuscar = customCnpj || form.CNPJ || cnpjBusca;
    const cnpjLimpo = cnpjParaBuscar.replace(/\D/g, "");

    if (cnpjLimpo.length !== 14) {
      alert("Por favor, digite um CNPJ com 14 dígitos.");

      return null;
    }
    if (!isFromContratante) {
      setBuscandoCnpj(true);
    }
    try {
      const res = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      );

      if (!res.ok) {
        alert("CNPJ não encontrado ou erro na API");

        return null;
      }
      const data = await res.json();

      // Mapeamento de Grau de Risco estimado baseado na descrição ou CNAE se possível, ou default/esperado.
      // Se a API retornar algum grau de risco ou estimativa, mapeia. Caso contrário, mantém/calcula.

      if (isFromContratante) {
        return {
          cnpj: data.cnpj,
          razaoSocial: data.razao_social,
          cidade: data.municipio || "",
          uf: data.uf || "",
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          cep: data.cep || "",
          cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : "",
          grauDeRisco: 1, // default
        };
      }

      setForm((prev) => ({
        ...prev,
        CNPJ: data.cnpj,
        RAZAOSOCIAL: data.razao_social,
        NOMEABREVIADO: data.nome_fantasia || data.razao_social || "",
        CNAE: data.cnae_fiscal ? String(data.cnae_fiscal) : "",
        RAMO_ATIVIDADE: data.cnae_fiscal_descricao || "",
        cnaesSecundarios: Array.isArray(data.cnaes_secundarios)
          ? data.cnaes_secundarios.map((c: any) => String(c.codigo || ""))
          : [],
        representanteLegal:
          Array.isArray(data.qsa) && data.qsa[0] ? data.qsa[0].nome : "",
        codigoIbgeMunicipio: data.codigo_municipio_ibge
          ? String(data.codigo_municipio_ibge)
          : "",
        situacaoCadastral: data.descricao_situacao_cadastral || "",
        email: data.email || "",
        telefone: data.ddd_telefone_1 || data.telefone || "",
        ENDERECO: data.logradouro || "",
        NUMEROENDERECO: data.numero || "",
        COMPLEMENTOENDERECO: data.complemento || "",
        BAIRRO: data.bairro || "",
        CIDADE: data.municipio || "",
        UF: data.uf || "",
        CEP: data.cep || "",
      }));

      return data;
    } catch (err) {
      console.error(err);
      alert("Erro na busca de CNPJ.");

      return null;
    } finally {
      if (!isFromContratante) {
        setBuscandoCnpj(false);
      }
    }
  }

  async function fetchCompanies() {
    setLoading(true);
    try {
      const token = getCookie("auth_token");
      const res = await fetch(`${NEST_URL}soc/empresas?local=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        setCompanies(data);
      }
    } catch (err) {
      console.error("Erro ao buscar empresas:", err);
    } finally {
      setLoading(false);
    }
  }

  function openEdit(company: Company) {
    setIsCreate(false);
    setEditing(company);
    const formValues = {
      CODIGO: company.CODIGO,
      CNPJ: company.CNPJ || "",
      RAZAOSOCIAL: company.RAZAOSOCIAL || "",
      NOMEABREVIADO: company.NOMEABREVIADO || "",
      CNAE: company.CNAE || "",
      RAMO_ATIVIDADE: company.RAMO_ATIVIDADE || "",
      GRAU_RISCO: company.GRAU_RISCO || 1,
      NUMERO_FUNCIONARIOS: company.NUMERO_FUNCIONARIOS || 0,
      FONE_FAX: company.FONE_FAX || "",
      cnaesSecundarios: company.cnaesSecundarios || [],
      representanteLegal: company.representanteLegal || "",
      codigoIbgeMunicipio: company.codigoIbgeMunicipio || "",
      situacaoCadastral: company.situacaoCadastral || "",
      email: company.email || "",
      telefone: company.telefone || "",
      ENDERECO: company.ENDERECO || "",
      NUMEROENDERECO: company.NUMEROENDERECO || "",
      COMPLEMENTOENDERECO: company.COMPLEMENTOENDERECO || "",
      BAIRRO: company.BAIRRO || "",
      CIDADE: company.CIDADE || "",
      CEP: company.CEP || "",
      UF: company.UF || "",
      configuracoes: {
        requerPsicologa: company.configuracoes?.requerPsicologa ?? false,
        credenciadaSoc: company.configuracoes?.credenciadaSoc ?? false,
        somenteComplementares:
          company.configuracoes?.somenteComplementares ?? false,
        faturamento: company.configuracoes?.faturamento ?? "CMSO",
        devedor: company.configuracoes?.devedor ?? false,
        asoRapidoAutomatico:
          company.configuracoes?.asoRapidoAutomatico ?? false,
        gestaoEpi: company.configuracoes?.gestaoEpi ?? false,
        painel: company.configuracoes?.painel ?? false,
      },
      codigoInternoCliente:
        company.codigoInternoCliente || company["CÓD. CLIENTE (INT.)"] || "",
      avisos: company.avisos || "",
      observacoes: company.observacoes || "",
    };

    setForm(formValues);
    const amb = company.ambientesEdificacao || [];
    const resp = company.responsaveisTecnicos || [];
    const contr = company.contratantes || [];
    const conts = company.contatos || [];

    setAmbientes(amb);
    setResponsaveis(resp);
    setContratantes(contr);
    setContatos(conts);
    setEditingContactIndex(null);
    setNewContato({ nome: "", email: "", telefone: "", perfil: "" });
    setActiveTab("dados");
    setModalOpen(true);
    fetchDocumentos(company.CODIGO);
    setInitialStateSnapshot(getSnapshot(formValues, amb, resp, contr, conts));
  }

  function openCreate() {
    setIsCreate(true);
    setEditing(null);
    const formValues = {
      CODIGO: "",
      CNPJ: "",
      RAZAOSOCIAL: "",
      NOMEABREVIADO: "",
      CNAE: "",
      RAMO_ATIVIDADE: "",
      GRAU_RISCO: 1,
      NUMERO_FUNCIONARIOS: 0,
      FONE_FAX: "",
      cnaesSecundarios: [],
      representanteLegal: "",
      codigoIbgeMunicipio: "",
      situacaoCadastral: "",
      email: "",
      telefone: "",
      ENDERECO: "",
      NUMEROENDERECO: "",
      COMPLEMENTOENDERECO: "",
      BAIRRO: "",
      CIDADE: "",
      CEP: "",
      UF: "",
      configuracoes: {
        requerPsicologa: false,
        credenciadaSoc: false,
        somenteComplementares: false,
        faturamento: "CMSO" as const,
        devedor: false,
        asoRapidoAutomatico: false,
        gestaoEpi: false,
        painel: false,
      },
      codigoInternoCliente: "",
      avisos: "",
      observacoes: "",
    };

    setForm(formValues);
    setAmbientes([]);
    setResponsaveis([]);
    setContratantes([]);
    setContatos([]);
    setActiveTab("dados");
    setSocCompanies([]);
    setImportingSoc(false);
    setCnpjBusca("");
    setSocSearchTerm("");
    setDocumentos([]);
    setShowUploadForm(false);
    setModalOpen(true);
    fetchSocCompaniesList();
    setInitialStateSnapshot(getSnapshot(formValues, [], [], [], []));
  }

  async function handleSave() {
    if (!isCreate && !editing) return;
    if (
      isCreate &&
      (!form.CODIGO?.trim() || !form.CNPJ?.trim() || !form.RAZAOSOCIAL?.trim())
    ) {
      alert("Por favor, preencha Código SOC, CNPJ e Razão Social.");

      return;
    }
    setSaving(true);
    try {
      const url = isCreate
        ? "/api/soc/empresas"
        : `/api/soc/empresas/${editing?.CODIGO}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          ambientesEdificacao: ambientes,
          responsaveisTecnicos: responsaveis,
          contratantes: contratantes,
          contatos: contatos,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchCompanies();
      } else {
        const errData = await res.json();

        alert(errData.message || "Erro ao salvar cadastro.");
      }
    } catch (err) {
      console.error("Erro ao salvar empresa:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(company: Company) {
    if (
      !window.confirm(
        `Deseja realmente excluir a empresa "${company.RAZAOSOCIAL}" (Cód SOC: ${company.CODIGO})?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/soc/empresas/${company.CODIGO}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCompanies();
      } else {
        const errData = await res.json();

        alert(errData.message || "Erro ao excluir empresa.");
      }
    } catch (err) {
      console.error("Erro ao excluir empresa:", err);
    }
  }

  // List Management Helpers
  function addAmbiente() {
    if (!newAmbiente.ambiente.trim() || !newAmbiente.descricao.trim()) return;
    setAmbientes([...ambientes, newAmbiente]);
    setNewAmbiente({ ambiente: "", descricao: "" });
  }

  function removeAmbiente(index: number) {
    setAmbientes(ambientes.filter((_, i) => i !== index));
  }

  function addResponsavel() {
    if (
      !newResponsavel.nome.trim() ||
      !newResponsavel.registro.trim() ||
      newResponsavel.documentos.length === 0
    ) {
      alert(
        "Por favor, preencha nome, registro e selecione ao menos um documento.",
      );

      return;
    }
    setResponsaveis([...responsaveis, newResponsavel]);
    setNewResponsavel({
      nome: "",
      documentos: [],
      registro: "",
      uf: "",
      dataInicio: "",
      dataFim: "",
    });
  }

  function removeResponsavel(index: number) {
    setResponsaveis(responsaveis.filter((_, i) => i !== index));
  }

  async function handleBuscarCnpjContratante() {
    if (!newContratante.cnpj.trim()) return;
    setBuscandoContratanteCnpj(true);
    try {
      const result = await handleBuscarCnpj(true, newContratante.cnpj);

      if (result) {
        setNewContratante({
          cnpj: result.cnpj,
          razaoSocial: result.razaoSocial,
          cidade: result.cidade,
          uf: result.uf,
          logradouro: result.logradouro,
          numero: result.numero,
          bairro: result.bairro,
          cep: result.cep,
          cnae: result.cnae,
          grauDeRisco: result.grauDeRisco || 1,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBuscandoContratanteCnpj(false);
    }
  }

  function addContratante() {
    if (!newContratante.cnpj.trim() || !newContratante.razaoSocial.trim())
      return;
    setContratantes([...contratantes, newContratante]);
    setNewContratante({
      cnpj: "",
      razaoSocial: "",
      cidade: "",
      uf: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cep: "",
      cnae: "",
      grauDeRisco: 1,
    });
  }

  function removeContratante(index: number) {
    setContratantes(contratantes.filter((_, i) => i !== index));
  }

  function editContato(index: number) {
    const contact = contatos[index];

    if (!contact) return;
    setNewContato({ ...contact });
    setEditingContactIndex(index);
  }

  function cancelEditContato() {
    setEditingContactIndex(null);
    setNewContato({ nome: "", email: "", telefone: "", perfil: "" });
  }

  function handleSaveContato() {
    if (!newContato.nome.trim() || !newContato.email.trim()) {
      alert("Por favor, preencha pelo menos Nome e E-mail.");

      return;
    }

    if (editingContactIndex !== null) {
      const updatedContatos = [...contatos];

      updatedContatos[editingContactIndex] = { ...newContato };
      setContatos(updatedContatos);
      cancelEditContato();
    } else {
      setContatos([...contatos, { ...newContato }]);
      cancelEditContato();
    }
  }

  function removeContato(index: number) {
    setContatos(contatos.filter((_, i) => i !== index));
  }

  const filteredCompanies = companies.filter((c) => {
    const matchText =
      c.RAZAOSOCIAL.toLowerCase().includes(searchString.toLowerCase()) ||
      c.NOMEABREVIADO.toLowerCase().includes(searchString.toLowerCase()) ||
      c.CNPJ.includes(searchString);

    if (!matchText) return false;
    if (configFilters.size === 0) return true;

    for (const filter of configFilters) {
      if (filter === "faturamentoCMSO" && c.configuracoes?.faturamento !== "CMSO") return false;
      if (filter === "faturamentoSEGTEC" && c.configuracoes?.faturamento !== "SEGTEC") return false;
      if (!(c.configuracoes as any)?.[filter]) return false;
    }

    return true;
  });

  const filteredSocCompanies = (searchValue: string) => {
    if (!searchValue) return socCompanies;
    const lowerSearch = searchValue.toLowerCase();

    return socCompanies.filter(
      (comp) =>
        (comp.RAZAOSOCIAL || "").toLowerCase().includes(lowerSearch) ||
        (comp.CNPJ || "").includes(searchValue) ||
        (comp.CODIGO || "").includes(searchValue),
    );
  };

  if (loading) {
    return <CmsoCircularLoading fullHeight={false} />;
  }

  return (
    <>
      <Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <Building
                aria-hidden="true"
                size={28}
                style={{ color: "#44735e" }}
                className="flex-shrink-0"
              />
              <h2 className="text-xl font-semibold text-gray-800 whitespace-nowrap">
                Cadastro de Empresas
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Input
                isClearable
                className="w-48"
                classNames={{
                  base: "h-9",
                  mainWrapper: "h-9",
                  inputWrapper: "h-9",
                }}
                placeholder="Pesquisar..."
                size="sm"
                startContent={<Search size={14} className="text-gray-400" />}
                value={searchString}
                onValueChange={(val) => {
                  setSearchString(val);
                  setCurrentPage(1);
                }}
              />
              <Select
                aria-label="Filtrar por configuração"
                className="w-40"
                classNames={{
                  base: "h-9",
                  mainWrapper: "h-9",
                  trigger: "h-9 min-h-9",
                }}
                placeholder="Filtros"
                selectionMode="multiple"
                size="sm"
                selectedKeys={configFilters}
                onSelectionChange={(keys) => {
                  const selected = new Set(Array.from(keys).map(String));
                  setConfigFilters(selected);
                  setCurrentPage(1);
                }}
              >
                <SelectItem key="devedor" textValue="Devedor">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                      <BadgeDollarSign size={12} />
                    </span>
                    <span>Devedor</span>
                  </div>
                </SelectItem>
                <SelectItem key="requerPsicologa" textValue="Psicologia">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
                      <Brain size={12} />
                    </span>
                    <span>Psicologia</span>
                  </div>
                </SelectItem>
                <SelectItem key="credenciadaSoc" textValue="Credenciada SOC">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                      <Link2 size={12} />
                    </span>
                    <span>Credenciada SOC</span>
                  </div>
                </SelectItem>
                <SelectItem key="asoRapidoAutomatico" textValue="ASO Rápido">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
                      <Zap size={12} />
                    </span>
                    <span>ASO Rápido</span>
                  </div>
                </SelectItem>
                <SelectItem key="somenteComplementares" textValue="Somente Complementares">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-teal-100 text-teal-600">
                      <Stethoscope size={12} />
                    </span>
                    <span>Somente Complementares</span>
                  </div>
                </SelectItem>
                <SelectItem key="gestaoEpi" textValue="Gestão EPI">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                      <PackageCheck size={12} />
                    </span>
                    <span>Gestão EPI</span>
                  </div>
                </SelectItem>
                <SelectItem key="painel" textValue="Mural Digital">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                      <Monitor size={12} />
                    </span>
                    <span>Mural Digital</span>
                  </div>
                </SelectItem>
                <SelectItem key="faturamentoCMSO" textValue="Faturamento: CMSO">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                      <Receipt size={12} />
                    </span>
                    <span>Faturamento: CMSO</span>
                  </div>
                </SelectItem>
                <SelectItem key="faturamentoSEGTEC" textValue="Faturamento: SEGTEC">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                      <Receipt size={12} />
                    </span>
                    <span>Faturamento: SEGTEC</span>
                  </div>
                </SelectItem>
              </Select>
              <Button
                className="h-9 px-4 whitespace-nowrap flex-shrink-0"
                color="primary"
                size="sm"
                startContent={<Plus size={16} />}
                style={{ backgroundColor: "#44735e" }}
                onPress={openCreate}
              >
                Nova Empresa
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table aria-label="Empresas cadastradas" className="min-w-[720px]">
              <TableHeader>
                <TableColumn>RAZÃO SOCIAL / FANTASIA</TableColumn>
                <TableColumn>CNPJ</TableColumn>
                <TableColumn>CONFIGURAÇÕES</TableColumn>
                <TableColumn>RESPONSÁVEIS & DOCS</TableColumn>
                <TableColumn width={80}>AÇÕES</TableColumn>
              </TableHeader>
            <TableBody emptyContent="Nenhuma empresa encontrada">
              {filteredCompanies
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((company) => {
                  const uniqueDocs = Array.from(
                    new Set(
                      (company.responsaveisTecnicos || []).flatMap(
                        (r) => r.documentos || [],
                      ),
                    ),
                  );

                  return (
                    <TableRow key={company.CODIGO}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 line-clamp-1">
                            {company.RAZAOSOCIAL}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-0.5">
                            <span>{company.NOMEABREVIADO || "-"}</span>
                            <span>•</span>
                            <span className="font-mono">
                              SOC: {company.CODIGO}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {formatCNPJ(company.CNPJ)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {company.configuracoes?.devedor && (
                            <Tooltip content="Devedor — atendimento e faturamento bloqueados">
                              <span
                                className="cursor-default inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 animate-pulse"
                              >
                                <BadgeDollarSign size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {company.configuracoes?.requerPsicologa && (
                            <Tooltip content="Avaliação Psicossocial obrigatória">
                              <span
                                className="cursor-default inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600"
                              >
                                <Brain size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {company.configuracoes?.credenciadaSoc && (
                            <Tooltip content="Credenciada SOC">
                              <span
                                className="cursor-default inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600"
                              >
                                <Link2 size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {company.configuracoes?.asoRapidoAutomatico && (
                            <Tooltip content="ASO Rápido Automático">
                              <span
                                className="cursor-default inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600"
                              >
                                <Zap size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {company.configuracoes?.somenteComplementares && (
                            <Tooltip content="Somente Exames Complementares">
                              <span
                                className="cursor-default inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-600"
                              >
                                <Stethoscope size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {company.configuracoes?.faturamento && (
                            <Tooltip content={`Faturamento: ${company.configuracoes.faturamento}`}>
                              <span
                                className="cursor-default inline-flex items-center justify-center h-5 px-1.5 rounded bg-gray-100 text-gray-500 text-[9px] font-bold font-mono"
                              >
                                {company.configuracoes.faturamento}
                              </span>
                            </Tooltip>
                          )}
                          {company.configuracoes?.gestaoEpi && (
                            <Tooltip content="Gestão de EPI habilitada">
                              <span
                                className="cursor-default inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600"
                              >
                                <PackageCheck size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {company.configuracoes?.painel && (
                            <Tooltip content="Mural Digital habilitado">
                              <span
                                className="cursor-default inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600"
                              >
                                <Monitor size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {!company.configuracoes?.devedor &&
                            !company.configuracoes?.requerPsicologa &&
                            !company.configuracoes?.credenciadaSoc &&
                            !company.configuracoes?.asoRapidoAutomatico &&
                            !company.configuracoes?.somenteComplementares &&
                            !company.configuracoes?.gestaoEpi &&
                            !company.configuracoes?.painel && (
                              <span className="text-xs text-gray-400 font-medium">
                                —
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 text-xs">
                          {company.responsaveisTecnicos &&
                          company.responsaveisTecnicos.length > 0 ? (
                            company.responsaveisTecnicos.map((r, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-0.5"
                              >
                                <span
                                  className="font-semibold text-gray-700 whitespace-normal line-clamp-1"
                                  title={r.nome}
                                >
                                  {r.nome}
                                </span>
                                <div className="flex gap-0.5">
                                  {(r.documentos || []).map((doc) => (
                                    <span
                                      key={doc}
                                      className="inline-flex text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-1 py-0.2 rounded"
                                    >
                                      {doc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => openEdit(company)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="light"
                            onPress={() => handleDelete(company)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
            </Table>
          </div>

          {filteredCompanies.length > itemsPerPage && (
            <div className="flex justify-center mt-6">
              <Pagination
                showControls
                color="primary"
                page={currentPage}
                total={Math.ceil(filteredCompanies.length / itemsPerPage)}
                onChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        classNames={{ base: "max-w-[1400px]" }}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={modalOpen}
        scrollBehavior="inside"
        size="5xl"
        onOpenChange={setModalOpen}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1.5 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold text-gray-800">
                {isCreate ? "Cadastrar Nova Empresa" : form.RAZAOSOCIAL}
              </span>
              {!isCreate && (
                <div className="flex flex-wrap gap-1">
                  {form.configuracoes?.requerPsicologa && (
                    <Chip color="secondary" size="sm" variant="flat">
                      Psicologia
                    </Chip>
                  )}
                  {form.configuracoes?.credenciadaSoc && (
                    <Chip color="primary" size="sm" variant="flat">
                      SOC
                    </Chip>
                  )}
                  {form.configuracoes?.asoRapidoAutomatico && (
                    <Chip color="warning" size="sm" variant="flat">
                      ASO Auto
                    </Chip>
                  )}
                  {form.configuracoes?.somenteComplementares && (
                    <Chip color="success" size="sm" variant="flat">
                      Complementar
                    </Chip>
                  )}
                  {form.configuracoes?.faturamento && (
                    <Chip color="default" size="sm" variant="flat">
                      Fat: {form.configuracoes.faturamento}
                    </Chip>
                  )}
                  {form.configuracoes?.devedor && (
                    <Chip
                      className="font-bold animate-pulse"
                      color="danger"
                      size="sm"
                      variant="solid"
                    >
                      DEVEDOR
                    </Chip>
                  )}
                </div>
              )}
            </div>
            {!isCreate && form.CODIGO && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs font-normal text-gray-400">
                <span>
                  Cód. SOC:{" "}
                  <strong className="font-semibold font-mono text-gray-600">
                    {form.CODIGO}
                  </strong>
                </span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span>
                  CNPJ:{" "}
                  <strong className="font-semibold font-mono text-gray-600">
                    {form.CNPJ}
                  </strong>
                </span>
                {responsaveis.length > 0 && (
                  <>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      Docs Ativos:
                      {Array.from(
                        new Set(
                          responsaveis.flatMap((r) => r.documentos || []),
                        ),
                      ).map((doc) => (
                        <Chip
                          key={doc}
                          className="h-4 text-[9px] py-0 px-1 font-semibold leading-none border-warning-200"
                          color="warning"
                          size="sm"
                          variant="bordered"
                        >
                          {doc}
                        </Chip>
                      ))}
                    </span>
                  </>
                )}
              </div>
            )}
          </ModalHeader>
          <div className="px-6 bg-white border-b border-gray-100 shrink-0">
            <Tabs
              aria-label="Dados complementares da empresa"
              classNames={{
                tabList: "gap-6 w-full relative rounded-none p-0 border-b-0",
                cursor: "w-full bg-[#44735e]",
                tab: "max-w-fit px-0 h-12 text-sm font-medium",
              }}
              selectedKey={activeTab}
              variant="underlined"
              onSelectionChange={(key) => setActiveTab(key as string)}
            >
              <Tab key="dados" title="Dados Gerais" />
              <Tab key="config" title="Configurações" />
              <Tab key="edificacao" title="Edificação (PGR)" />
              <Tab key="responsaveis" title="Responsáveis Técnicos" />
              <Tab key="contratantes" title="Contratantes" />
              <Tab key="contatos" title="Contatos" />
              <Tab key="documentos" title="Documentos" />
            </Tabs>
          </div>
          <ModalBody className="py-6">
            {activeTab === "dados" && (
              <>
                {isCreate && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-100/80 border border-gray-200/50 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-default-500 font-semibold text-xs uppercase tracking-wider">
                      <Database className="text-[#44735e]" size={14} />
                      <span>Importar Dados do SOC (Opcional)</span>
                    </div>
                    <Autocomplete
                      allowsCustomValue={false}
                      classNames={{
                        selectorButton:
                          "bg-white border-gray-200 hover:border-gray-300 focus:border-[#44735e] shadow-none",
                      }}
                      isLoading={importingSoc}
                      items={filteredSocCompanies(socSearchTerm)}
                      placeholder={
                        importingSoc
                          ? "Carregando empresas..."
                          : "Digite para buscar por razão social, CNPJ ou código SOC..."
                      }
                      size="sm"
                      variant="bordered"
                      onInputChange={(value) => setSocSearchTerm(value)}
                      onSelectionChange={(key) =>
                        key && handleImportSoc(String(key))
                      }
                    >
                      {(comp) => (
                        <AutocompleteItem
                          key={comp.CODIGO}
                          textValue={`${comp.CODIGO} - ${comp.RAZAOSOCIAL}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-800">
                              {comp.RAZAOSOCIAL}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              SOC: {comp.CODIGO} | CNPJ: {comp.CNPJ || "-"}
                            </span>
                          </div>
                        </AutocompleteItem>
                      )}
                    </Autocomplete>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Input
                    isRequired
                    isDisabled={!isCreate}
                    label="Código SOC"
                    value={form.CODIGO}
                    onValueChange={(v) => setForm((f) => ({ ...f, CODIGO: v }))}
                  />
                  <div className="flex gap-2 items-end">
                    <Input
                      isRequired
                      className="flex-1"
                      isDisabled={!isCreate}
                      label="CNPJ"
                      value={form.CNPJ}
                      onValueChange={(v) => setForm((f) => ({ ...f, CNPJ: v }))}
                    />
                    <Button
                      className="bg-[#44735e] text-white min-w-fit h-10 px-4 text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 align-middle"
                      isLoading={buscandoCnpj}
                      size="md"
                      variant="solid"
                      onPress={() => handleBuscarCnpj(false)}
                    >
                      Buscar
                    </Button>
                  </div>
                  <Input
                    isRequired
                    className="col-span-2"
                    label="Razão Social"
                    value={form.RAZAOSOCIAL}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, RAZAOSOCIAL: v }))
                    }
                  />
                  <Input
                    label="Nome Abreviado (Fantasia)"
                    value={form.NOMEABREVIADO}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, NOMEABREVIADO: v }))
                    }
                  />
                  <Input
                    label="Fone / Fax"
                    value={form.FONE_FAX}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, FONE_FAX: v }))
                    }
                  />
                  <Input
                    label="Código CNAE"
                    placeholder="ex: 77.29-2-03"
                    value={form.CNAE}
                    onValueChange={(v) => setForm((f) => ({ ...f, CNAE: v }))}
                  />
                  <Input
                    label="Grau de Risco"
                    placeholder="1 a 4"
                    type="number"
                    value={String(form.GRAU_RISCO || 1)}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, GRAU_RISCO: Number(v) || 1 }))
                    }
                  />
                  <Input
                    className="col-span-2"
                    label="Ramo de Atividade"
                    value={form.RAMO_ATIVIDADE}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, RAMO_ATIVIDADE: v }))
                    }
                  />
                  <Input
                    label="Número de Funcionários"
                    type="number"
                    value={String(form.NUMERO_FUNCIONARIOS || 0)}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        NUMERO_FUNCIONARIOS: Number(v) || 0,
                      }))
                    }
                  />
                  <Input
                    label="Código Interno Cliente"
                    value={form.codigoInternoCliente}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, codigoInternoCliente: v }))
                    }
                  />
                  <Input
                    label="E-mail de Contato"
                    value={form.email}
                    onValueChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  />
                  <Input
                    label="Telefone Adicional"
                    value={form.telefone}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, telefone: v }))
                    }
                  />
                  <Input
                    label="Representante Legal"
                    value={form.representanteLegal}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, representanteLegal: v }))
                    }
                  />
                  <Input
                    label="Situação Cadastral"
                    placeholder="ATIVA, BAILADA, INAPTA"
                    value={form.situacaoCadastral}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, situacaoCadastral: v }))
                    }
                  />
                  <Input
                    label="Código IBGE Município"
                    placeholder="ex: 3550308"
                    value={form.codigoIbgeMunicipio}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, codigoIbgeMunicipio: v }))
                    }
                  />
                  {/* Seção de Endereço */}
                  <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                      <MapPin className="text-[#44735e]" size={16} />
                      Endereço da Empresa
                    </h3>
                  </div>
                  <Input
                    label="CEP"
                    value={form.CEP}
                    onValueChange={(v) => setForm((f) => ({ ...f, CEP: v }))}
                  />
                  <Input
                    label="Endereço"
                    value={form.ENDERECO}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, ENDERECO: v }))
                    }
                  />
                  <Input
                    label="Número"
                    value={form.NUMEROENDERECO}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, NUMEROENDERECO: v }))
                    }
                  />
                  <Input
                    label="Complemento"
                    value={form.COMPLEMENTOENDERECO}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, COMPLEMENTOENDERECO: v }))
                    }
                  />
                  <Input
                    label="Bairro"
                    value={form.BAIRRO}
                    onValueChange={(v) => setForm((f) => ({ ...f, BAIRRO: v }))}
                  />
                  <Input
                    label="Cidade"
                    value={form.CIDADE}
                    onValueChange={(v) => setForm((f) => ({ ...f, CIDADE: v }))}
                  />
                  <Input
                    label="UF"
                    maxLength={2}
                    value={form.UF}
                    onValueChange={(v) => setForm((f) => ({ ...f, UF: v }))}
                  />
                  <Textarea
                    className="col-span-2"
                    label="Avisos"
                    placeholder="Digite avisos importantes sobre esta empresa..."
                    value={form.avisos}
                    onValueChange={(v) => setForm((f) => ({ ...f, avisos: v }))}
                  />
                  <Textarea
                    className="col-span-2"
                    label="Observações"
                    placeholder="Digite observações complementares..."
                    value={form.observacoes}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, observacoes: v }))
                    }
                  />
                  {form.cnaesSecundarios &&
                    form.cnaesSecundarios.length > 0 && (
                      <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-100 mt-1">
                        <span className="text-xs font-semibold text-gray-500 block mb-1">
                          CNAEs Secundários
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {form.cnaesSecundarios.map((cnae) => (
                            <Chip
                              key={cnae}
                              className="font-mono text-xs"
                              color="secondary"
                              size="sm"
                              variant="flat"
                            >
                              {cnae}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </>
            )}

            {activeTab === "config" && (
              <div className="flex flex-col gap-6 pt-6 pl-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      ASO Rápido Automático
                    </span>
                    <span className="text-xs text-gray-400">
                      Gera ASO no SOC automaticamente ao realizar agendamento
                    </span>
                  </div>
                  <Switch
                    color="success"
                    isSelected={
                      form.configuracoes?.asoRapidoAutomatico || false
                    }
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        configuracoes: {
                          ...f.configuracoes!,
                          asoRapidoAutomatico: v,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      Complementar
                    </span>
                    <span className="text-xs text-gray-400">
                      Clientes que optam somente por exames complementares
                    </span>
                  </div>
                  <Switch
                    color="success"
                    isSelected={form.configuracoes?.somenteComplementares}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        configuracoes: {
                          ...f.configuracoes!,
                          somenteComplementares: v,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      Credenciada SOC
                    </span>
                    <span className="text-xs text-gray-400">
                      Indica que a empresa opera via credenciamento direto SOC
                    </span>
                  </div>
                  <Switch
                    color="success"
                    isSelected={form.configuracoes?.credenciadaSoc}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        configuracoes: {
                          ...f.configuracoes!,
                          credenciadaSoc: v,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      Devedor
                    </span>
                    <span className="text-xs text-gray-400">
                      Bloqueia atendimento e faturamento por inadimplência
                    </span>
                  </div>
                  <Switch
                    color="danger"
                    isSelected={form.configuracoes?.devedor || false}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        configuracoes: { ...f.configuracoes!, devedor: v },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      Entrevista para Avaliação Psicossocial
                    </span>
                    <span className="text-xs text-gray-400">
                      Ativa o encaminhamento obrigatório para psicóloga
                    </span>
                  </div>
                  <Switch
                    color="success"
                    isSelected={form.configuracoes?.requerPsicologa}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        configuracoes: {
                          ...f.configuracoes!,
                          requerPsicologa: v,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      Faturamento
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Integração para cobranças
                    </span>
                  </div>
                  <Select
                    className="max-w-[200px]"
                    placeholder="Selecione a integração..."
                    selectedKeys={
                      form.configuracoes?.faturamento
                        ? [form.configuracoes.faturamento]
                        : []
                    }
                    size="sm"
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0] as "CMSO" | "SEGTEC";

                      setForm((f) => ({
                        ...f,
                        configuracoes: {
                          ...f.configuracoes!,
                          faturamento: val,
                        },
                      }));
                    }}
                  >
                    <SelectItem key="CMSO">CMSO</SelectItem>
                    <SelectItem key="SEGTEC">SEGTEC</SelectItem>
                  </Select>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      Gestão de EPI
                    </span>
                    <span className="text-xs text-gray-400">
                      Habilita o módulo de gestão de Equipamentos de Proteção
                      Individual
                    </span>
                  </div>
                  <Switch
                    color="success"
                    isSelected={form.configuracoes?.gestaoEpi || false}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        configuracoes: { ...f.configuracoes!, gestaoEpi: v },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-700">
                      Mural Digital
                    </span>
                    <span className="text-xs text-gray-400">
                      Habilita o módulo Mural Digital para esta empresa
                    </span>
                  </div>
                  <Switch
                    color="success"
                    isSelected={form.configuracoes?.painel || false}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        configuracoes: { ...f.configuracoes!, painel: v },
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === "edificacao" && (
              <div className="pt-4 space-y-4">
                <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Input
                    label="Ambiente / Item"
                    placeholder="Ex: Piso, Parede, Teto"
                    size="sm"
                    value={newAmbiente.ambiente}
                    onValueChange={(v) =>
                      setNewAmbiente((a) => ({ ...a, ambiente: v }))
                    }
                  />
                  <Input
                    label="Descrição Física"
                    placeholder="Ex: Piso cerâmico antiderrapante..."
                    size="sm"
                    value={newAmbiente.descricao}
                    onValueChange={(v) =>
                      setNewAmbiente((a) => ({ ...a, descricao: v }))
                    }
                  />
                  <Button
                    className="bg-[#44735e]"
                    color="primary"
                    size="md"
                    startContent={<Plus size={16} />}
                    onPress={addAmbiente}
                  >
                    Adicionar
                  </Button>
                </div>

                <Table
                  removeWrapper
                  aria-label="Lista de ambientes físicos"
                  className="mt-2"
                  shadow="none"
                >
                  <TableHeader>
                    <TableColumn>AMBIENTE / ITEM</TableColumn>
                    <TableColumn>DESCRIÇÃO</TableColumn>
                    <TableColumn width={80}>AÇÕES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Nenhum ambiente ou descrição cadastrada">
                    {ambientes.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-semibold text-gray-700">
                          {item.ambiente}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {item.descricao}
                        </TableCell>
                        <TableCell>
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="light"
                            onPress={() => removeAmbiente(index)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === "responsaveis" && (
              <div className="pt-4 space-y-4">
                <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-3">
                      <Input
                        label="Nome"
                        placeholder="Nome do profissional"
                        value={newResponsavel.nome}
                        onValueChange={(v) =>
                          setNewResponsavel((r) => ({ ...r, nome: v }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Select
                        label="Documentos"
                        placeholder="Selecione os documentos..."
                        selectedKeys={new Set(newResponsavel.documentos)}
                        selectionMode="multiple"
                        onSelectionChange={(keys) =>
                          setNewResponsavel((r) => ({
                            ...r,
                            documentos: Array.from(keys) as any[],
                          }))
                        }
                      >
                        <SelectItem key="PCMSO">PCMSO</SelectItem>
                        <SelectItem key="PGR">PGR</SelectItem>
                        <SelectItem key="LTCAT">LTCAT</SelectItem>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <Input
                        label="Registro"
                        placeholder="CREA/CRM/MTE"
                        value={newResponsavel.registro}
                        onValueChange={(v) =>
                          setNewResponsavel((r) => ({ ...r, registro: v }))
                        }
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <Input
                        label="UF"
                        maxLength={2}
                        placeholder="SP"
                        value={newResponsavel.uf}
                        onValueChange={(v) =>
                          setNewResponsavel((r) => ({ ...r, uf: v }))
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        label="Data Início"
                        type="date"
                        value={newResponsavel.dataInicio || ""}
                        onValueChange={(v) =>
                          setNewResponsavel((r) => ({ ...r, dataInicio: v }))
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        label="Data Fim"
                        type="date"
                        value={newResponsavel.dataFim || ""}
                        onValueChange={(v) =>
                          setNewResponsavel((r) => ({ ...r, dataFim: v }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      className="bg-[#44735e] px-8"
                      color="primary"
                      startContent={<Plus size={16} />}
                      onPress={addResponsavel}
                    >
                      Adicionar Responsável
                    </Button>
                  </div>
                </div>

                <Table
                  removeWrapper
                  aria-label="Lista de responsáveis técnicos"
                  className="mt-2"
                  shadow="none"
                >
                  <TableHeader>
                    <TableColumn>NOME</TableColumn>
                    <TableColumn>DOCUMENTOS</TableColumn>
                    <TableColumn>REGISTRO / UF</TableColumn>
                    <TableColumn>VIGÊNCIA</TableColumn>
                    <TableColumn width={80}>AÇÕES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Nenhum responsável técnico cadastrado">
                    {responsaveis.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-semibold text-gray-700">
                          {item.nome}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(item.documentos || []).map((doc) => (
                              <Chip
                                key={doc}
                                color="secondary"
                                size="sm"
                                variant="flat"
                              >
                                {doc}
                              </Chip>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 font-mono text-xs">
                          {item.registro} - {item.uf.toUpperCase()}
                        </TableCell>
                        <TableCell className="text-gray-500 text-xs">
                          {item.dataInicio
                            ? new Date(
                                item.dataInicio + "T00:00:00",
                              ).toLocaleDateString("pt-BR")
                            : "-"}{" "}
                          até{" "}
                          {item.dataFim
                            ? new Date(
                                item.dataFim + "T00:00:00",
                              ).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="light"
                            onPress={() => removeResponsavel(index)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === "contratantes" && (
              <div className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="col-span-1 md:col-span-2 flex gap-2 items-end">
                    <Input
                      label="CNPJ"
                      placeholder="CNPJ da contratante"
                      size="sm"
                      value={newContratante.cnpj}
                      onValueChange={(v) =>
                        setNewContratante((c) => ({ ...c, cnpj: v }))
                      }
                    />
                    <Button
                      className="bg-[#44735e] text-white font-semibold shadow-sm hover:opacity-90"
                      isLoading={buscandoContratanteCnpj}
                      size="md"
                      variant="solid"
                      onPress={handleBuscarCnpjContratante}
                    >
                      Buscar
                    </Button>
                  </div>

                  <Input
                    className="col-span-1 md:col-span-2"
                    label="Razão Social"
                    placeholder="Nome da empresa"
                    size="sm"
                    value={newContratante.razaoSocial}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, razaoSocial: v }))
                    }
                  />

                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    size="sm"
                    value={newContratante.cep}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, cep: v }))
                    }
                  />

                  <Input
                    className="col-span-1 md:col-span-2"
                    label="Logradouro"
                    placeholder="Rua / Av"
                    size="sm"
                    value={newContratante.logradouro}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, logradouro: v }))
                    }
                  />

                  <Input
                    label="Número"
                    placeholder="123"
                    size="sm"
                    value={newContratante.numero}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, numero: v }))
                    }
                  />

                  <Input
                    label="Bairro"
                    placeholder="Bairro"
                    size="sm"
                    value={newContratante.bairro}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, bairro: v }))
                    }
                  />

                  <Input
                    label="Cidade"
                    placeholder="Cidade"
                    size="sm"
                    value={newContratante.cidade}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, cidade: v }))
                    }
                  />

                  <Input
                    label="UF"
                    maxLength={2}
                    placeholder="SP"
                    size="sm"
                    value={newContratante.uf}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, uf: v }))
                    }
                  />

                  <Input
                    label="CNAE"
                    placeholder="CNAE"
                    size="sm"
                    value={newContratante.cnae}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({ ...c, cnae: v }))
                    }
                  />

                  <Input
                    label="Grau de Risco"
                    placeholder="1 a 4"
                    size="sm"
                    type="number"
                    value={String(newContratante.grauDeRisco || 1)}
                    onValueChange={(v) =>
                      setNewContratante((c) => ({
                        ...c,
                        grauDeRisco: Number(v) || 1,
                      }))
                    }
                  />

                  <div className="col-span-1 md:col-span-4 flex justify-end">
                    <Button
                      className="bg-[#44735e] px-8"
                      color="primary"
                      size="md"
                      startContent={<Plus size={16} />}
                      onPress={addContratante}
                    >
                      Adicionar Contratante
                    </Button>
                  </div>
                </div>

                <Table
                  removeWrapper
                  aria-label="Lista de contratantes vinculadas"
                  className="mt-2"
                  shadow="none"
                >
                  <TableHeader>
                    <TableColumn>RAZÃO SOCIAL</TableColumn>
                    <TableColumn>CNPJ</TableColumn>
                    <TableColumn>CNAE / RISCO</TableColumn>
                    <TableColumn>LOCALIZAÇÃO / ENDEREÇO</TableColumn>
                    <TableColumn width={80}>AÇÕES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Nenhuma empresa contratante vinculada">
                    {contratantes.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-semibold text-gray-700">
                          {item.razaoSocial}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.cnpj}
                        </TableCell>
                        <TableCell className="text-xs">
                          CNAE: {item.cnae || "-"} / Risco:{" "}
                          {item.grauDeRisco || 1}
                        </TableCell>
                        <TableCell className="text-gray-500 text-xs">
                          {item.logradouro
                            ? `${item.logradouro}, ${item.numero || "S/N"} - `
                            : ""}
                          {item.cidade} - {item.uf.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Button
                            isIconOnly
                            color="danger"
                            size="sm"
                            variant="light"
                            onPress={() => removeContratante(index)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === "contatos" && (
              <div className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <Input
                    label="Nome"
                    placeholder="Nome do contato"
                    size="sm"
                    value={newContato.nome}
                    onValueChange={(v) =>
                      setNewContato((c) => ({ ...c, nome: v }))
                    }
                  />
                  <Input
                    label="E-mail"
                    placeholder="email@empresa.com"
                    size="sm"
                    value={newContato.email}
                    onValueChange={(v) =>
                      setNewContato((c) => ({ ...c, email: v }))
                    }
                  />
                  <Input
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    size="sm"
                    value={newContato.telefone}
                    onValueChange={(v) =>
                      setNewContato((c) => ({ ...c, telefone: v }))
                    }
                  />
                  <Input
                    label="Perfil (SOC)"
                    placeholder="Nome do perfil (ex: ASO)"
                    size="sm"
                    value={newContato.perfil}
                    onValueChange={(v) =>
                      setNewContato((c) => ({ ...c, perfil: v }))
                    }
                  />
                  <div className="col-span-1 md:col-span-4 flex justify-between items-center gap-2">
                    <Button
                      className="px-6 font-semibold"
                      color="secondary"
                      isLoading={syncingContacts}
                      size="md"
                      startContent={<Database size={16} />}
                      variant="flat"
                      onPress={handleSyncSocContacts}
                    >
                      Importar do SOC
                    </Button>
                    <div className="flex gap-2">
                      {editingContactIndex !== null && (
                        <Button
                          color="default"
                          size="md"
                          variant="flat"
                          onPress={cancelEditContato}
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button
                        className="bg-[#44735e] px-8"
                        color="primary"
                        size="md"
                        startContent={<Plus size={16} />}
                        onPress={handleSaveContato}
                      >
                        {editingContactIndex !== null
                          ? "Salvar Contato"
                          : "Adicionar Contato"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Table
                  removeWrapper
                  aria-label="Lista de contatos da empresa"
                  className="mt-2"
                  shadow="none"
                >
                  <TableHeader>
                    <TableColumn>NOME</TableColumn>
                    <TableColumn>E-MAIL</TableColumn>
                    <TableColumn>TELEFONE</TableColumn>
                    <TableColumn>PERFIL (SOC)</TableColumn>
                    <TableColumn width={80}>AÇÕES</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="Nenhum contato vinculado">
                    {contatos.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-semibold text-gray-700">
                          {item.nome}
                        </TableCell>
                        <TableCell className="text-gray-500 font-mono text-xs">
                          {item.email}
                        </TableCell>
                        <TableCell className="text-gray-500 text-xs">
                          {item.telefone || "-"}
                        </TableCell>
                        <TableCell className="text-gray-500 text-xs font-mono">
                          {item.perfil || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => editContato(index)}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              isIconOnly
                              color="danger"
                              size="sm"
                              variant="light"
                              onPress={() => removeContato(index)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === "documentos" && (
              <div className="pt-6 space-y-4">
                {showUploadForm ? (
                  <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {editingDoc ? "Editar Documento" : "Novo Documento"}
                    </h3>

                    {editingDoc && !showReplaceFile && !newDocFile ? (
                      <div className="flex items-center justify-between border border-gray-200 rounded-xl p-4 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#44735e]/10 flex items-center justify-center">
                            <svg
                              fill="none"
                              height="20"
                              stroke="#44735e"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              width="20"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" x2="8" y1="13" y2="13" />
                              <line x1="16" x2="8" y1="17" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">
                              {editingDoc.nomeArquivoOriginal}
                            </span>
                            <Chip
                              className="text-[10px] h-4 max-w-fit"
                              color="success"
                              size="sm"
                              variant="flat"
                            >
                              Arquivo consolidado
                            </Chip>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => setShowReplaceFile(true)}
                        >
                          Substituir Arquivo
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#44735e] hover:bg-[#44735e]/5 transition-colors"
                        onClick={() =>
                          document.getElementById("doc-file-input")?.click()
                        }
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove(
                            "border-[#44735e]",
                            "bg-[#44735e]/5",
                          );
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add(
                            "border-[#44735e]",
                            "bg-[#44735e]/5",
                          );
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove(
                            "border-[#44735e]",
                            "bg-[#44735e]/5",
                          );
                          if (
                            e.dataTransfer.files &&
                            e.dataTransfer.files.length > 0
                          ) {
                            setNewDocFile(e.dataTransfer.files[0]);
                          }
                        }}
                      >
                        <input
                          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                          className="hidden"
                          id="doc-file-input"
                          type="file"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setNewDocFile(e.target.files[0]);
                            }
                          }}
                        />
                        {newDocFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-[#44735e]/10 flex items-center justify-center">
                              <svg
                                fill="none"
                                height="20"
                                stroke="#44735e"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                width="20"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" x2="8" y1="13" y2="13" />
                                <line x1="16" x2="8" y1="17" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {newDocFile.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {(newDocFile.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <Button
                              color="danger"
                              size="sm"
                              variant="flat"
                              onPress={() => {
                                setNewDocFile(null);
                                setShowReplaceFile(false);
                              }}
                            >
                              Remover arquivo
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg
                                fill="none"
                                height="20"
                                stroke="#6b7280"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                width="20"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" x2="12" y1="3" y2="15" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-500 font-medium">
                              Clique ou arraste o arquivo aqui
                            </span>
                            <span className="text-xs text-gray-400">
                              PDF, PNG, JPG, XLSX (máx. 10 MB)
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Tipo de Documento"
                        selectedKeys={[newDocData.tipoDocumento]}
                        onSelectionChange={(keys) => {
                          const val = Array.from(keys)[0] as string;
                          const cat = val === "Logo" ? "LOGO" : "FATURAMENTO";

                          setNewDocData({
                            ...newDocData,
                            tipoDocumento: val,
                            categoria: cat,
                          });
                        }}
                      >
                        <SelectItem key="Relatório Faturamento">
                          Relatório Faturamento
                        </SelectItem>
                        <SelectItem key="Logo">Logo</SelectItem>
                      </Select>

                      <Input
                        label="Data de Referência (Mês/Ano)"
                        placeholder="Ex: 04/2026"
                        value={newDocData.dataReferencia}
                        onValueChange={(v) =>
                          setNewDocData({ ...newDocData, dataReferencia: v })
                        }
                      />
                    </div>

                    <Textarea
                      label="Observações"
                      placeholder="Informações adicionais..."
                      value={newDocData.observacoes}
                      onValueChange={(v) =>
                        setNewDocData({ ...newDocData, observacoes: v })
                      }
                    />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          color="success"
                          isSelected={newDocData.comunicarEmail}
                          onValueChange={(v) =>
                            setNewDocData({ ...newDocData, comunicarEmail: v })
                          }
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Comunicar por E-mail
                        </span>
                      </div>
                      {newDocData.comunicarEmail && (
                        <Select
                          items={[
                            {
                              kind: "all" as const,
                              email: "__all__",
                              nome: "Todos os Contatos",
                              textValue: "Todos os Contatos",
                              descricao:
                                "Enviar para todos os contatos registrados",
                            },
                            ...contatos.map((c) => ({
                              kind: "contact" as const,
                              ...c,
                              textValue: `${c.nome} (${c.email})`,
                            })),
                          ]}
                          label="Contatos para notificação"
                          placeholder="Selecione os contatos da empresa"
                          selectedKeys={
                            contatos.length > 0 &&
                            newDocData.contatosNotificados.length ===
                              contatos.length &&
                            contatos.every((c) =>
                              newDocData.contatosNotificados.includes(c.email),
                            )
                              ? new Set(["__all__"])
                              : new Set(newDocData.contatosNotificados)
                          }
                          selectionMode="multiple"
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys) as string[];

                            if (selected.includes("__all__")) {
                              const allSelected =
                                contatos.length > 0 &&
                                newDocData.contatosNotificados.length ===
                                  contatos.length &&
                                contatos.every((c) =>
                                  newDocData.contatosNotificados.includes(
                                    c.email,
                                  ),
                                );

                              setNewDocData({
                                ...newDocData,
                                contatosNotificados: allSelected
                                  ? []
                                  : contatos.map((c) => c.email),
                              });
                            } else {
                              setNewDocData({
                                ...newDocData,
                                contatosNotificados: selected,
                              });
                            }
                          }}
                        >
                          {(c) =>
                            c.kind === "all" ? (
                              <SelectItem key="__all__" textValue={c.textValue}>
                                <div className="flex flex-col">
                                  <span className="font-semibold">
                                    {c.nome}
                                  </span>
                                  <span className="text-tiny text-default-400">
                                    {c.descricao}
                                  </span>
                                </div>
                              </SelectItem>
                            ) : (
                              <SelectItem key={c.email} textValue={c.textValue}>
                                <div className="flex flex-col">
                                  <span>{c.nome}</span>
                                  <span className="text-tiny text-default-400">
                                    {c.email}
                                  </span>
                                </div>
                              </SelectItem>
                            )
                          }
                        </Select>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="flat"
                        onPress={() => {
                          setShowUploadForm(false);
                          setEditingDoc(null);
                          setShowReplaceFile(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="bg-[#44735e]"
                        color="primary"
                        isLoading={uploadingDoc}
                        onPress={
                          editingDoc
                            ? handleUpdateDocumento
                            : handleUploadDocumento
                        }
                      >
                        {editingDoc ? "Salvar Alterações" : "Salvar Documento"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Gerencie os documentos da empresa.
                      </span>
                      <Button
                        className="bg-[#44735e]"
                        color="primary"
                        startContent={<Plus size={16} />}
                        onPress={() => {
                          setEditingDoc(null);
                          setShowReplaceFile(false);
                          setShowUploadForm(true);
                        }}
                      >
                        Novo Upload
                      </Button>
                    </div>
                    <Table
                      removeWrapper
                      aria-label="Lista de documentos da empresa"
                      shadow="none"
                    >
                      <TableHeader>
                        <TableColumn>DOCUMENTO</TableColumn>
                        <TableColumn>REFERÊNCIA</TableColumn>
                        <TableColumn>CRIADO POR</TableColumn>
                        <TableColumn width={100}>AÇÕES</TableColumn>
                      </TableHeader>
                      <TableBody
                        emptyContent={
                          loadingDocumentos
                            ? "Carregando..."
                            : "Nenhum documento encontrado."
                        }
                      >
                        {documentos.map((doc, idx) => (
                          <TableRow key={doc._id || idx}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-700">
                                  {doc.tipoDocumento}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  {doc.nomeArquivoOriginal}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{doc.dataReferencia || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium">
                                  {doc.criadoPor}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {doc.criadoEm
                                    ? new Date(doc.criadoEm).toLocaleString(
                                        "pt-BR",
                                      )
                                    : "-"}
                                </span>
                                {doc.comunicarEmail && (
                                  <Chip
                                    className="text-[10px] h-4 mt-0.5 max-w-fit"
                                    color="success"
                                    size="sm"
                                    variant="flat"
                                  >
                                    Notificado
                                  </Chip>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  isIconOnly
                                  as="a"
                                  href={doc.blobUrl}
                                  rel="noopener noreferrer"
                                  size="sm"
                                  target="_blank"
                                  variant="light"
                                >
                                  <Search className="text-gray-500" size={16} />
                                </Button>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() => {
                                    setEditingDoc(doc);
                                    setShowReplaceFile(false);
                                    setNewDocData({
                                      categoria: doc.categoria || "FATURAMENTO",
                                      tipoDocumento:
                                        doc.tipoDocumento ||
                                        "Relatório Faturamento",
                                      dataReferencia:
                                        doc.dataReferencia || currentMonthYear,
                                      observacoes: doc.observacoes || "",
                                      comunicarEmail:
                                        doc.comunicarEmail || false,
                                      contatosNotificados:
                                        doc.contatosNotificados || [],
                                    });
                                    setNewDocFile(null);
                                    setShowUploadForm(true);
                                  }}
                                >
                                  <Pencil className="text-gray-500" size={16} />
                                </Button>
                                <Button
                                  isIconOnly
                                  color="danger"
                                  size="sm"
                                  variant="light"
                                  onPress={() => handleDeleteDocumento(doc._id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter className="border-t border-gray-100">
            <Button variant="flat" onPress={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              isDisabled={
                !isCreate &&
                getSnapshot(
                  form,
                  ambientes,
                  responsaveis,
                  contratantes,
                  contatos,
                ) === initialStateSnapshot
              }
              isLoading={saving}
              style={{ backgroundColor: "#44735e" }}
              onPress={handleSave}
            >
              Salvar Alterações
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
