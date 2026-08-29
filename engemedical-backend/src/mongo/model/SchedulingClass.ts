import {
  ExamsScheduled,
  FileUpload,
  RiscosAso,
  SchedulingDocument,
} from '../types/scheduling';
import { AsoStatus, TipoExameMap } from '../enum/scheduling.enum';

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
  SEXO: string = '';

  // propriedades do agendamento
  ATENDIMENTOSTATUS: string = '';
  ASOSTATUS: string = AsoStatus.GERADO;
  ASOINFO = null;
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
      // 1. Aplica todas as propriedades
      Object.assign(this, data);

      if (this.DATAAGENDAMENTO) {
        // O formato esperado é "DD/MM/YYYY".
        const parts = this.DATAAGENDAMENTO.split('/');

        if (parts.length === 3) {
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];

          // Cria a data no formato YYYY-MM-DDT00:00:00Z para garantir o parse correto em JS.
          const isoDateString = `${year}-${month}-${day}T03:00:00Z`;

          // Redefine explicitamente a propriedade como um objeto Date
          this.DATAAGENDAMENTO_DATE = new Date(isoDateString);
        }
      }

      // Garante que dataExame dentro de EXAMES seja sempre um objeto Date (BSON Date no Mongo)
      // para evitar erros de deserialização no C#
      if (this.EXAMES && Array.isArray(this.EXAMES)) {
        this.EXAMES = this.EXAMES.map((ex) => {
          if (typeof ex.dataExame === 'string' && ex.dataExame.trim() !== '') {
            let parsedDate: Date;
            if (ex.dataExame.includes('/')) {
              const [d, m, y] = ex.dataExame.split('/').map(Number);
              parsedDate = new Date(y, m - 1, d);
            } else {
              parsedDate = new Date(ex.dataExame);
            }

            return {
              ...ex,
              dataExame: !isNaN(parsedDate.getTime())
                ? parsedDate
                : ex.dataExame,
            };
          }
          return ex;
        });
      }

      // 3. Sua lógica original para códigos (mantida após a conversão da data)
      this.SCHEDULINGCODE = this.CODIGOEMPRESA + this.CODIGO + this.TIPOEXAME;
      this.CODIGOPRONTUARIO = `${this.CODIGOEMPRESA}-${this.CODIGO}-${this.TIPOEXAME}-${this.DATAAGENDAMENTO.replace(/\//g, '')}`;
      this.convertTypeExamNumberToString(this.TIPOEXAME);
    }
  }

  private convertTypeExamNumberToString(type: string) {
    this.TIPOEXAMENOME = TipoExameMap[type] ?? '';
  }
}
