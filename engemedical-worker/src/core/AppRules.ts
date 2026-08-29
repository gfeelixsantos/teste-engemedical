import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { SchedulingDocument } from 'src/mongo/types/scheduling';

export class AppRules {
  /**
   * Empresas para as quais SEMPRE devemos enviar resultado.
   */
  private static readonly FORCE_SEND_COMPANIES = [
    '737045', // DELTA INDUSTRIA CERAMICA LTDA
    '917729', // DELTA INDUSTRIA CERAMICA LTDA - FILIAL
    '737046', // BARRA DO TIETE COMERCIAL E SERVICOS LTDA
  ];

  static shouldSendResultSoc(schedule: SchedulingDocument): {
    shouldSend: boolean;
    examIndex: number;
  } {
    if (!schedule?.EXAMES?.length) {
      return { shouldSend: false, examIndex: -1 };
    }

    // 1. Regra das empresas
    const forceSend =
      !!schedule.CODIGOEMPRESA &&
      this.FORCE_SEND_COMPANIES.includes(schedule.CODIGOEMPRESA);

    // 2. Regra da audiometria (usada tanto no caso normal quanto no forcado)
    const audiometriaIndex = schedule.EXAMES.findIndex(
      (e) => e.grupo === 'Audiometria',
    );

    const audiometria =
      audiometriaIndex !== -1 ? schedule.EXAMES[audiometriaIndex] : null;

    const audiometriaDone = audiometria?.status === ExamStatus.FINALIZADO;

    // 3. Avaliação final: deve enviar?
    const shouldSend = forceSend || audiometriaDone;

    return {
      shouldSend,
      examIndex: shouldSend ? audiometriaIndex : -1,
    };
  }

  static sanitizeExams(schedule: SchedulingDocument): SchedulingDocument {
    if (!schedule?.EXAMES) return schedule;

    let exames = [...schedule.EXAMES];

    // 1. Remover exame de Triagem (independentemente da empresa)
    exames = exames.filter((e) => e.grupo !== 'Triagem');

    // 2. Se empresa for 385308 → remover Exame Clínico
    if (schedule.CODIGOEMPRESA === '385308') {
      exames = exames.filter((e) => e.grupo !== 'Exame Clínico');
    }

    // 3. Reatribui ao documento (imutabilidade opcional)
    schedule.EXAMES = exames;

    return schedule;
  }
}
