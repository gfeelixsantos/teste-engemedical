import { describe, expect, it } from '@jest/globals';

import {
  hasPsychosocialFormData,
  shouldPersistConcludedPayloadForAuxiliaryExam,
  ensurePsicossocialConclusao,
} from './psychosocial-form.util';

describe('hasPsychosocialFormData', () => {
  it('reconhece o payload psicossocial completo', () => {
    expect(
      hasPsychosocialFormData({
        transtornoEmocional: 'Não',
        medicamentosControlados: 'Não',
        usoAlcoolDrogas: 'Não',
        observacoes: 'Sem queixas',
      }),
    ).toBe(true);
  });

  it('retorna false para payloads de EEG/ECG sem campos psicossociais', () => {
    expect(
      hasPsychosocialFormData({
        status: 'concluded',
        anotacoes: '',
        examesRealizados: [],
      }),
    ).toBe(false);
  });

  it('identifica ECG/EEG com payload psicossocial para concluir o exame atual', () => {
    expect(
      shouldPersistConcludedPayloadForAuxiliaryExam({
        grupo: 'ECG',
        codigoExame: '20.01.001-0',
        formulario: {
          transtornoEmocional: 'Não',
          observacoes: 'Sem queixas',
        },
      }),
    ).toBe(true);

    expect(
      shouldPersistConcludedPayloadForAuxiliaryExam({
        grupo: 'EEG',
        codigoExame: '22010017',
        formulario: {
          transtornoEmocional: 'Sim',
          observacoes: 'Queixas presentes',
        },
      }),
    ).toBe(true);

    expect(
      shouldPersistConcludedPayloadForAuxiliaryExam({
        grupo: 'ECG',
        codigoExame: '20.01.001-0',
        formulario: {
          status: 'concluded',
          anotacoes: 'resultado técnico',
        },
      }),
    ).toBe(false);
  });

  it('injeta conclusao Apto quando ausente em formulario psicossocial', () => {
    const res = ensurePsicossocialConclusao({
      transtornoEmocional: 'Não',
      observacoes: 'Sem queixas',
    });
    expect(res.conclusao).toBe('Apto');
  });
});

