import { FuncionarioEntity } from './FuncionarioEntity';
import { LaudoRestricaoData, SchedulingDocument } from '../types/scheduling';

const laudoBase: LaudoRestricaoData = {
  periodoDias: 30,
  dataInicio: '2024-01-15',
  restricoes: 'Evitar esforço',
  recomendacoes: 'Repouso',
  cid: 'M54',
  descricaoCid: 'Dorsalgia',
  dataFim: '2024-02-14',
};

function makeDoc(exames: any[]): SchedulingDocument {
  return {
    _id: 'test-id',
    ATENDIMENTOSTATUS: 'AVALIACAO_MEDICA',
    ASOSTATUS: '',
    SCHEDULINGCODE: '',
    CODIGOPRONTUARIO: '',
    RISCOSASO: null,
    CODIGOEMPRESA: '',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: '',
    CODIGO: '',
    NOME: '',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: '',
    MATRICULAFUNCIONARIO: '',
    CPFFUNCIONARIO: '',
    SITUACAO: '',
    DATANASCIMENTO: '',
    DATAAGENDAMENTO: '',
    DATAAGENDAMENTO_DATE: new Date(),
    HORARIO: '',
    UNIDADEATENDIMENTO: '',
    SEQUENCIAFICHA: '',
    TIPOEXAME: '',
    TIPOEXAMENOME: '',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: null,
    RECOMENDACAOMEDICA: null,
    MEDICO: null,
    ANEXOS: [],
    TERM: false,
    CLIENT: null,
    CREATED: '',
    EXAMES: exames,
    TICKET: null,
  } as SchedulingDocument;
}

describe('FuncionarioEntity.injetarRestricaoNoExameClinico', () => {
  it('Teste 2 — Exame Clínico ausente: sem exceção, EXAMES inalterado', () => {
    const exameAudiometria = {
      codigoExame: 'AUD001',
      nomeExame: 'Audiometria',
      grupo: 'Audiometria',
      status: 'FINALIZADO',
      formulario: { classificacaoOD: 'Normal', classificacaoOE: 'Normal' },
    };

    const entity = new FuncionarioEntity(makeDoc([exameAudiometria]));

    expect(() => entity.injetarRestricaoNoExameClinico(laudoBase)).not.toThrow();

    const exames = entity.getRaw().EXAMES;
    expect(exames).toHaveLength(1);
    expect(exames[0].codigoExame).toBe('AUD001');
    expect(exames[0].formulario.classificacaoOD).toBe('Normal');
  });
});
