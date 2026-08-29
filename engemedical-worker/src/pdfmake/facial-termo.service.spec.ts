import { FacialTermoService } from './facial-termo.service';
import { TermoConsentimentoService } from './termo-consentimento.service';
import { TermoFacialInput, TermoFacialOutput } from './facial-termo.types';
import { gerarTermoConsentimento } from './templates/termoConsentimento';
import { TermoConsentimentoInput } from './termo-consentimento.types';

function makeInput(overrides?: Partial<TermoFacialInput>): TermoFacialInput {
  return {
    requestId: 'req-facial-123',
    versaoTermo: 'v1.0',
    validadeDias: 365,
    validadeAte: '2027-05-27T14:30:00.000Z',
    funcionario: {
      nome: 'MARIA JOSE DA SILVA',
      cpfMascarado: '***.141.***-97',
      codigo: 'FUNC-001',
    },
    empresa: { nome: 'A10 SERVICOS LTDA' },
    clinica: {
      nome: 'CENTRO MEDICO SAUDE OCUPACIONAL',
      contatoDpo: 'dpo@cmsocupacional.com.br',
    },
    atendimento: {
      schedulingId: 'sch-001',
      prontuarioId: 'prt-001',
      unidade: 'RIO CLARO',
      dataHora: '2026-05-27T14:30:00.000Z',
    },
    facial: {
      provider: 'BRY_SIGN',
      sessionId: 'session-001',
      transactionId: 'tx-001',
      relatorioEvidenciasUrl: 'https://blob.test/evidencias/facial-report.pdf',
      relatorioEvidenciasHash: 'a'.repeat(64),
    },
    lgpd: {
      baseLegalCode: 'PROTECAO_DA_SAUDE',
      baseLegalTexto:
        'Protecao da saude e demais hipoteses legalmente aplicaveis ao atendimento ocupacional.',
      finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL',
      cienciaRegistradaEm: '2026-05-27T14:30:00.000Z',
      cienciaRegistradaPor: 'OPER-001',
      alternativaDisponivel: true,
    },
    operador: { codigo: 'OPER-001', nome: 'ANA CRISTINA SANTOS' },
    ...overrides,
  };
}

function makeConsentimentoInput(
  overrides?: Partial<TermoFacialInput>,
): TermoConsentimentoInput {
  const input = makeInput(overrides);
  return {
    tipo: 'FACIAL',
    requestId: input.requestId,
    versaoTermo: input.versaoTermo,
    validadeDias: input.validadeDias,
    validadeAte: input.validadeAte,
    funcionario: input.funcionario,
    empresa: input.empresa,
    clinica: input.clinica,
    atendimento: input.atendimento,
    lgpd: input.lgpd,
    operador: input.operador,
    relatorioEvidenciasUrl:
      'https://cmsodocs.blob.core.windows.net/public/autenticacao/prt-001/relatorio-evidencias.pdf',
    relatorioEvidenciasProviderUrl: input.facial.relatorioEvidenciasUrl,
    relatorioEvidenciasHash: input.facial.relatorioEvidenciasHash,
    forceInline: (input as any).forceInline,
    facial: {
      provider: input.facial.provider,
      sessionId: input.facial.sessionId,
      transactionId: input.facial.transactionId,
    },
  } as TermoConsentimentoInput;
}

describe('FacialTermoService (via TermoConsentimentoService)', () => {
  let service: FacialTermoService;
  let consentimentoService: TermoConsentimentoService;

  beforeAll(() => {
    consentimentoService = new TermoConsentimentoService();
    service = new FacialTermoService(consentimentoService);
  });

  it('deve gerar PDF valido para termo facial', async () => {
    const result = (await service.gerar(makeInput())) as TermoFacialOutput;
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(1000);
    expect(result.contentType).toBe('application/pdf');
    expect(result.filename).toMatch(/^TERMO_FACIAL_.+\.pdf$/);
    expect(result.documentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deve conter QR code apontando para URL canonica do relatorio', async () => {
    const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'b'.repeat(64));
    const raw = JSON.stringify(definition);
    expect(raw).toContain(
      '"qr":"https://cmsodocs.blob.core.windows.net/public/autenticacao/prt-001/relatorio-evidencias.pdf"',
    );
    expect(raw).not.toContain('https://blob.test/evidencias/facial-report.pdf');
  });

  it('nao deve expor CPF bruto nem payload sensivel no PDF facial', async () => {
    const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'b'.repeat(64));
    const raw = JSON.stringify(definition).toLowerCase();
    expect(raw).toContain('***.141.***-97');
    expect(raw).not.toContain('42514186897');
    expect(raw).not.toContain('templateencrypted');
    expect(raw).not.toContain('templatehash');
    expect(raw).not.toContain('authtag');
    expect(raw).not.toContain('base64document');
    expect(raw).not.toContain('payloadinterno');
  });

  it('deve retornar buffer inline quando forceInline estiver ativo', async () => {
    const azureBlob = {
      uploadPublic: jest.fn(),
      getPublicUrl: jest.fn(),
      download: jest.fn(),
    } as any;
    const inlineService = new TermoConsentimentoService(azureBlob);

    const result = await inlineService.gerar(
      makeConsentimentoInput({ forceInline: true }),
    );

    expect('buffer' in result).toBe(true);
    expect((result as any).buffer).toBeInstanceOf(Buffer);
    expect(azureBlob.uploadPublic).not.toHaveBeenCalled();
  });
});
