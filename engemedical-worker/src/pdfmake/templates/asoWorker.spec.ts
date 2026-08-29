import { WorkerAsoInput } from '../aso-worker.types';
import { gerarTemplateAsoWorker } from './asoWorker';

describe('gerarTemplateAsoWorker', () => {
  const mockInput: WorkerAsoInput = {
    origem: 'BIOMETRIA',
    requestId: 'req-123',
    funcionario: {
      nome: 'TESTE FUNCIONARIO',
      codigo: 'F001',
      cpfMascarado: '123.***.***-00',
    },
    empresa: {
      codigo: 'E001',
      nome: 'TESTE EMPRESA',
      cnpj: '00.000.000/0001-00',
    },
    unidade: { nome: 'UNIDADE TESTE' },
    atendimento: {
      schedulingId: 'S001',
      tipoExameNome: 'ADMISSIONAL',
      dataAgendamento: '28/05/2026',
    },
    medicoCoordenador: {
      nome: 'DR. COORDENADOR TESTE',
      crm: '123456',
      uf: 'SP',
    },
    autenticacaoAtendimento: {
      metodo: 'BIOMETRIA',
      biometria: {
        imageBase64: 'data:image/png;base64,mock-image',
      },
    },
    exames: [],
    riscos: [],
  };

  it('deve renderizar o Medico Coordenador no template', async () => {
    const doc = await gerarTemplateAsoWorker(mockInput);
    const raw = JSON.stringify(doc);
    expect(raw).toContain('MÉDICO RESPONSÁVEL PELO PCMSO');
    expect(raw).toContain('DR. COORDENADOR TESTE');
  });

  it('deve renderizar a imagem biometrica no footer BIOMETRIA', async () => {
    const doc = await gerarTemplateAsoWorker(mockInput);
    const footer = typeof doc.footer === 'function' ? (doc.footer as Function)() : doc.footer;
    const raw = JSON.stringify(footer);
    expect(raw).toContain('data:image/png;base64,mock-image');
    expect(raw).toContain('Biometria validada, com evidência eletrônica');
  });

  it('deve renderizar o QR Code no footer FACIAL com URL canonica do relatorio', async () => {
    const prontuario = '950646-49-1-25062026';
    const facialInput: WorkerAsoInput = {
      ...mockInput,
      origem: 'FACIAL',
      atendimento: {
        ...mockInput.atendimento,
        prontuarioId: prontuario,
      },
      autenticacaoAtendimento: {
        metodo: 'FACIAL',
        evidencias: {
          relatorioEvidenciasUrl: 'https://evidencia.url/antiga',
        },
      },
    };

    const doc = await gerarTemplateAsoWorker(facialInput);
    const footer = typeof doc.footer === 'function' ? (doc.footer as Function)() : doc.footer;
    const raw = JSON.stringify(footer);
    expect(raw).toContain(
      `https://cmsodocs.blob.core.windows.net/public/autenticacao/${prontuario}/relatorio-evidencias.pdf`,
    );
    expect(raw).not.toContain('https://evidencia.url/antiga');
    expect(raw).toContain('Reconhecimento facial validado, com evidência eletrônica');
  });

  it('nao deve renderizar texto de assinatura eletronica no fallback DIGITALIZADA', async () => {
    const digitalizadaInput: WorkerAsoInput = {
      ...mockInput,
      medicoExaminador: {
        nome: 'DR. EXAMINADOR',
        codigo: 'M001',
        conselho: 'CRM',
        ufconselho: 'SP',
        cpf: '123.456.789-00',
        signatureStatus: 'DIGITALIZADA',
      },
    };

    const doc = await gerarTemplateAsoWorker(digitalizadaInput);
    const footer = typeof doc.footer === 'function' ? (doc.footer as Function)() : doc.footer;
    const raw = JSON.stringify(footer);
    expect(raw).not.toContain('Documento assinado eletronicamente');
  });
});
