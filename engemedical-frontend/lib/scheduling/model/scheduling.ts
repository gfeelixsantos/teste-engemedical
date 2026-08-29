import {
  AsoStatus,
  AtendimentoStatus,
  ExamStatus,
} from "../enum/scheduling.enum";
import {
  Client,
  ExamRegister,
  FileUpload,
  RiscosAso,
  Scheduling,
} from "../interface/scheduling";

import { Ticket } from "@/lib/ticket/ticket";
import { CadastroEmpresa } from "@/lib/soc/interfaces/CadastroEmpresa";
import { TIPOS_EXAME } from "@/config/constants";
import { getBrazilDateISO } from "@/lib/utils";

export class SchedulingClass implements Scheduling {
  ANEXOS: FileUpload[] = [];
  ANOTACOES: string | null = null;
  ASOSTATUS: string = "";
  ATENDIMENTOSTATUS: string = AtendimentoStatus.EM_ATENDIMENTO;
  CNPJEMPRESA: string = "";
  CLIENT?: Client;
  CODIGO: string = "";
  CODIGOCARGO: string = "";
  CODIGOEMPRESA: string = "";
  CODIGOINTERNOEMPRESA: string | null = null;
  CODIGOPRONTUARIO: string = "";
  CODIGOSETOR: string = "";
  CODIGOUNIDADE: string = "";
  CPFEMPRESA: string = "";
  CPFFUNCIONARIO: string = "";
  DATAAGENDAMENTO: string = "";
  DATAAGENDAMENTO_DATE: Date = new Date();
  DATANASCIMENTO: string | null = null;
  EXAMES: ExamRegister[] = [];
  HORARIO: string = "";
  MATRICULAFUNCIONARIO: string = "";
  MEDICO: string = "";
  NOME: string = "";
  NOMECARGO: string = "";
  NOMEEMPRESA: string = "";
  NOMESETOR: string = "";
  NOMEUNIDADE: string = "";
  OBSERVACOES: string | null = null;
  PARECERMEDICO: string | null = null;
  ALTURA_PARECER: string | null = null;
  CONFINADO_PARECER: string | null = null;
  PRONTUARIOSVINCULADOS: string[] = [];
  RECOMENDACAOMEDICA: string | null = null;
  RISCOSASO: RiscosAso[] | null = null;
  SCHEDULINGCODE: string = "";
  SEQUENCIAFICHA: string = "";
  SITUACAO: string = "";
  SUBGRUPOEMPRESA: string | null = null;
  TICKET: any = null;
  TIPOEXAME: string = "";
  TIPOEXAMENOME: string = "";
  UNIDADEATENDIMENTO: string = "";
  _id: string = "";

  constructor(data?: Partial<Scheduling>) {
    if (data) {
      Object.assign(this, data);

      this.SCHEDULINGCODE = this.CODIGOEMPRESA + this.CODIGO + this.TIPOEXAME;
      this.CODIGOPRONTUARIO = `${this.CODIGOEMPRESA}-${this.CODIGO}-${this.TIPOEXAME}-${this.DATAAGENDAMENTO.replace("/", "").replace("/", "")}`;
      this.convertTypeExamNumberToString(this.TIPOEXAME);
    }
  }

  private convertTypeExamNumberToString(type: string) {
    let result;

    switch (type) {
      case "1":
        result = "ADMISSIONAL";
        break;
      case "2":
        result = "PERIODICO";
        break;
      case "3":
        result = "RETORNO TRABALHO";
        break;
      case "4":
        result = "MUDANCA FUNCAO";
        break;
      case "5":
        result = "DEMISSIONAL";
        break;
      case "6":
        result = "MONITORACAO PONTUAL";
        break;
      case "10":
        result = "CONSULTA ASSISTENCIAL";
        break;
      default:
        result = "";
        break;
    }

    this.TIPOEXAMENOME = result;
  }

  // Método para mapear exames selecionados para ExamRegister[]
  mapExamesSelecionados(
    codigoExames: string[],
    examesList: any,
  ): ExamRegister[] {
    const exames: ExamRegister[] = [];

    codigoExames.forEach((grupo) => {
      const examesDoGrupo = examesList[grupo] || [];

      examesDoGrupo.forEach((exame: any) => {
        exame.codigos.forEach((codigo: string) => {
          exames.push({
            codigoExame: codigo,
            nomeExame: exame.nome,
            status: ExamStatus.PENDENTE,
            dataExame: getBrazilDateISO(),
            sequencialResultadoExame: "",
            preparacao: "",
            profissional: "",
            sala: "",
            url: "",
            formulario: null,
            grupo: grupo,
          });
        });
      });
    });

    return exames;
  }

  // Método para criar um Scheduling a partir do formulário manual
  static createFromManualForm(formData: {
    empresa: string;
    nome: string;
    tipoExame: string;
    codigoExames: string[];
    preferencialTipo: string;
    anotacoes: string;
    ticketSelecionado: Ticket | null;
    socCompanies: CadastroEmpresa[];
    filesUpload: FileUpload[];
    examesList: any;
  }): SchedulingClass {
    const scheduling = new SchedulingClass();

    // Encontrar empresa selecionada
    const empresaSelecionada = formData.socCompanies.find(
      (emp) => emp.CODIGO === formData.empresa,
    );

    // Preencher dados básicos
    scheduling.CODIGOEMPRESA = formData.empresa;
    scheduling.NOMEEMPRESA = empresaSelecionada?.RAZAOSOCIAL || "";
    scheduling.CNPJEMPRESA = empresaSelecionada?.CNPJ || "";
    scheduling.CODIGOINTERNOEMPRESA =
      empresaSelecionada?.["CÓD. CLIENTE (INT.)"] || null;
    scheduling.NOME = formData.nome;
    scheduling.TIPOEXAME = formData.tipoExame;
    scheduling.TIPOEXAMENOME =
      Object.entries(TIPOS_EXAME).find(
        ([_, value]) => value === formData.tipoExame,
      )?.[0] || formData.tipoExame;
    scheduling.ANOTACOES = formData.anotacoes;
    scheduling.DATAAGENDAMENTO = new Date().toLocaleDateString("pt-br");
    scheduling.DATAAGENDAMENTO_DATE = new Date();
    scheduling.HORARIO = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    scheduling.ANEXOS = formData.filesUpload;

    // Mapear exames selecionados
    scheduling.EXAMES = scheduling.mapExamesSelecionados(
      formData.codigoExames,
      formData.examesList,
    );

    // Configurar ticket se existir
    if (formData.ticketSelecionado) {
      scheduling.TICKET = {
        prefixo: formData.ticketSelecionado.prefixo,
        numero: formData.ticketSelecionado.numero,
        preferencial: formData.ticketSelecionado.preferencial,
        tipoPreferencial: formData.preferencialTipo,
      };
    }

    // Status ASO
    scheduling.ASOSTATUS = AsoStatus.NAO_GERADO;

    return scheduling;
  }

  toJSON(): Scheduling {
    return { ...this };
  }
}

/*
  "SCHEDULINGCODE": "1975781264",
  "CODIGOEMPRESA": "1975781",
  "CNPJEMPRESA": "21.227.734/0001-88",
  "SUBGRUPOEMPRESA": "20",
  "CODIGOINTERNOEMPRESA": "",
  "NOMEEMPRESA": "NOVAPORCELANATO INDUSTRIA E COMERCIO DE PORCELANATO LTDA.",
  "NOME": "ADRIANO MANOEL DOS SANTOS",
  "NOMEUNIDADE": "NOVAPORCELANATO",
  "NOMESETOR": "EXPEDIÇÃO",
  "NOMECARGO": "OPERADOR DE EMPILHADEIRA",
  "CPFFUNCIONARIO": "08049125564",
  "DATANASCIMENTO": "16/05/1997",
  "DATAAGENDAMENTO": "24/09/2025",
  "DATAAGENDAMENTO_DATE": "1758682800000",
  "HORARIO": "07:30",
  "UNIDADEATENDIMENTO": "RIO CLARO",
  "TIPOEXAME": 4,
  "TIPOEXAMENOME": "MUDANCA FUNCAO",
  "ANOTACOES": null,
  "ANEXOS": [],
  "TERM": true,
  "CLIENT": null
  "EXAMES": [],
  "TICKET": {
    "_id": null,
    "emissao": null,
    "numero": null,
    "prefixo": "",
    "preferencial": false,
    "preferencialTipo": "",
    "status": "",
    "unidade": "",
    "sala": "",
    "atendente": "",
    "type": "TICKET"
  }
}


*/
