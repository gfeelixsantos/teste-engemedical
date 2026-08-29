import {
  ExamsScheduled,
  FileUpload,
  RiscosAso,
  SchedulingDocument,
} from '../types/scheduling';
import { AsoStatus } from '../enum/scheduling.enum';

export class SchedulingClass implements Partial<SchedulingDocument> {
  // propriedades do pedido de exames
  CODIGOEMPRESA: string = '';
  NOMEEMPRESA: string = '';
  CNPJEMPRESA: string = '';
  CPFEMPRESA: string = '';
  SUBGRUPOEMPRESA: string = '';
  SEQUENCIAFICHA: string = '';
  CPFFUNCIONARIO: string = '';
  MATRICULAFUNCIONARIO: string = '';
  CODIGOUNIDADE: string = '';
  NOMEUNIDADE: string = '';
  CODIGOSETOR: string = '';
  NOMESETOR: string = '';
  CODIGOCARGO: string = '';
  NOMECARGO: string = '';
  RISCOSASO: RiscosAso[];
  DATANASCIMENTO: string = '';

  // propriedades do agendamento
  ATENDIMENTOSTATUS: string = '';
  ASOSTATUS: string = AsoStatus.GERADO;
  CODIGO: string = '';

  UNIDADEATENDIMENTO: string = '';
  TIPOEXAME: string = '';
  TIPOEXAMENOME: string = '';
  OBSERVACOES: string = '';
  CODIGOINTERNOEMPRESA: string;

  NOME: string;
  SCHEDULINGCODE: string = '';
  CODIGOPRONTUARIO: string = '';
  SITUACAO: string;
  DATAAGENDAMENTO: string;
  DATAAGENDAMENTO_DATE: Date;
  HORARIO: string;
  ANOTACOES: string | null;
  RECOMENDACAOMEDICA: string | null;
  ANEXOS: FileUpload[];
  EXAMES: ExamsScheduled[] = [];
  TICKET = null;

  constructor(data?: Partial<SchedulingDocument>) {
    if (data) {
      Object.assign(this, data);

      this.SCHEDULINGCODE = this.CODIGOEMPRESA + this.CODIGO + this.TIPOEXAME;
      this.CODIGOPRONTUARIO = `${this.CODIGOEMPRESA}-${this.CODIGO}-${this.TIPOEXAME}-${this.DATAAGENDAMENTO.replace('/', '').replace('/', '')}`;
      this.convertTypeExamNumberToString(this.TIPOEXAME);
    }
  }

  private convertTypeExamNumberToString(type: string) {
    let result: string;

    switch (type) {
      case '1':
        result = 'ADMISSIONAL';
        break;
      case '2':
        result = 'PERIODICO';
        break;
      case '3':
        result = 'RETORNO TRABALHO';
        break;
      case '4':
        result = 'MUDANCA FUNCAO';
        break;
      case '5':
        result = 'DEMISSIONAL';
        break;
      case '6':
        result = 'MONITORACAO PONTUAL';
        break;
      case '10':
        result = 'CONSULTA ASSISTENCIAL';
        break;
      default:
        result = '';
        break;
    }

    this.TIPOEXAMENOME = result;
  }
}
