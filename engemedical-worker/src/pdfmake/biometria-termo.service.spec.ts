import { BiometriaTermoService } from './biometria-termo.service';
import { TermoConsentimentoService } from './termo-consentimento.service';
import {
  TermoBiometriaInput,
  TermoBiometriaOutput,
} from './biometria-termo.types';
import { gerarTermoConsentimento } from './templates/termoConsentimento';
import { TermoConsentimentoInput } from './termo-consentimento.types';

function makeInput(
  overrides?: Partial<TermoBiometriaInput>,
): TermoBiometriaInput {
  return {
    requestId: 'req-12345',
    versaoTermo: 'v1.0',
    validadeDias: 365,
    validadeAte: '2027-05-26T14:30:00.000Z',
    funcionario: {
      nome: 'MARIA JOSE DA SILVA',
      cpfMascarado: '***.141.***-97',
      codigo: 'FUNC-001',
    },
    empresa: { nome: 'A10 SERVICOS LTDA', cnpj: '11222333000181' },
    clinica: {
      nome: 'CENTRO MEDICO SAUDE OCUPACIONAL',
      cnpj: '55666777000199',
      contatoDpo: 'dpo@cmsocupacional.com.br',
    },
    atendimento: {
      schedulingId: 'sch-001',
      prontuarioId: 'prt-001',
      unidade: 'RIO CLARO',
      dataHora: '2026-05-26T14:30:00.000Z',
    },
    biometria: {
      dedo: 'INDICADOR_DIREITO',
      relatorioEvidenciasUrl: 'https://blob.test/evidencias/biometria-report.pdf',
      digitalDocumentalFinalidade: 'COMPOSICAO_DOCUMENTAL',
      digitalDocumentalOrigem: 'IMAGEM_DERIVADA_NAO_RAW',
      templateVersion: 'futronic-ansi-v1',
      templateStorage: 'ENCRYPTED_AES_256_GCM',
    },
    lgpd: {
      baseLegalCode: 'PROTECAO_DA_SAUDE',
      baseLegalTexto:
        'Protecao da saude e demais hipoteses legalmente aplicaveis ao atendimento ocupacional.',
      finalidade: 'VALIDACAO_IDENTIDADE_ATENDIMENTO_OCUPACIONAL',
      cienciaRegistradaEm: '2026-05-26T14:30:00.000Z',
      cienciaRegistradaPor: 'OPER-001',
      alternativaDisponivel: true,
    },
    operador: { codigo: 'OPER-001', nome: 'ANA CRISTINA SANTOS' },
    ...overrides,
  };
}

function makeConsentimentoInput(
  overrides?: Partial<TermoBiometriaInput>,
): TermoConsentimentoInput {
  const input = makeInput(overrides);
  return {
    tipo: 'BIOMETRIA',
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
    relatorioEvidenciasUrl: input.biometria.relatorioEvidenciasUrl,
    biometria: {
      dedo: input.biometria.dedo,
      digitalDocumentalUrl: input.biometria.digitalDocumentalUrl,
      digitalDocumentalBlobPath: input.biometria.digitalDocumentalBlobPath,
      digitalDocumentalPreviewBase64: input.biometria.digitalDocumentalPreviewBase64,
      digitalDocumentalFinalidade: input.biometria.digitalDocumentalFinalidade,
      digitalDocumentalOrigem: input.biometria.digitalDocumentalOrigem,
      templateVersion: input.biometria.templateVersion,
      templateStorage: input.biometria.templateStorage,
    },
  } as TermoConsentimentoInput;
}

describe('BiometriaTermoService (via TermoConsentimentoService)', () => {
  let service: BiometriaTermoService;
  let consentimentoService: TermoConsentimentoService;

  beforeAll(() => {
    consentimentoService = new TermoConsentimentoService();
    service = new BiometriaTermoService(consentimentoService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('gerar', () => {
    it('deve gerar PDF com input valido', async () => {
      const result = (await service.gerar(makeInput())) as TermoBiometriaOutput;
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(1000);
      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toMatch(/^TERMO_BIOMETRIA_.+\.pdf$/);
      expect(result.documentHash).toBeDefined();
      expect(result.documentHash.length).toBe(64);
    });

    it('PDF deve ser formato A4', async () => {
      const result = (await service.gerar(makeInput())) as TermoBiometriaOutput;
      const raw = result.buffer.toString('utf8');
      expect(raw).toContain('/MediaBox');
    });

    it('deve conter requestId no buffer', async () => {
      const result = (await service.gerar(makeInput())) as TermoBiometriaOutput;
      const raw = result.buffer.toString('utf8');
      expect(raw).toContain('req-12345');
    });

    it('deve conter versao do termo no buffer', async () => {
      const result = (await service.gerar(makeInput())) as TermoBiometriaOutput;
      const raw = result.buffer.toString('utf8');
      expect(raw).toContain('v1.0');
    });

    it('deve conter o titulo atualizado no buffer', async () => {
      const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'a'.repeat(64));
      const raw = JSON.stringify(definition);
      expect(raw).toContain('Registro de Aceite');
    });

    it('deve exibir somente CPF mascarado no PDF', async () => {
      const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'a'.repeat(64));
      const raw = JSON.stringify(definition);
      expect(raw).toContain('***.141.***-97');
      expect(raw).not.toContain('42514186897');
    });

    it('deve mencionar validade de 365 dias e data limite', async () => {
      const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'a'.repeat(64));
      const raw = JSON.stringify(definition);
      expect(raw).toContain('365');
      expect(raw).toContain('2027');
    });

    it('deve mencionar a base legal em linguagem amigavel', async () => {
      const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'a'.repeat(64));
      const raw = JSON.stringify(definition);
      expect(raw).toContain('Protecao da saude');
    });

    it('deve mencionar ASO, exames complementares e documentos do atendimento', async () => {
      const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'a'.repeat(64));
      const raw = JSON.stringify(definition);
      expect(raw).toContain('ASO');
      expect(raw).toContain('exames complementares');
      expect(raw).toContain('documentos do atendimento');
    });

    it('NAO deve incluir a secao de imagem documental no termo', async () => {
      const definition = await gerarTermoConsentimento(
        makeConsentimentoInput({
          biometria: {
            ...makeInput().biometria,
            digitalDocumentalPreviewBase64:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3sAAAAASUVORK5CYII=',
          },
        }),
        'a'.repeat(64),
      );
      const raw = JSON.stringify(definition);
      expect(raw).not.toContain('Imagem documental da captura');
    });

    it('buffer NAO deve conter templateEncrypted', async () => {
      const result = (await service.gerar(makeInput())) as TermoBiometriaOutput;
      const raw = result.buffer.toString('utf8').toLowerCase();
      expect(raw).not.toContain('templateencrypted');
      expect(raw).not.toContain('templateencryption');
      expect(raw).not.toContain('templatehash');
    });

    it('buffer NAO deve conter score, threshold, authTag ou RAW', async () => {
      const result = (await service.gerar(makeInput())) as TermoBiometriaOutput;
      const raw = result.buffer.toString('utf8').toLowerCase();
      expect(raw).not.toContain('score');
      expect(raw).not.toContain('threshold');
      expect(raw).not.toContain('authtag');
      expect(raw).not.toContain(' raw ');
    });

    it('deve retornar documentHash com 64 caracteres hexadecimais', async () => {
      const result = (await service.gerar(makeInput())) as TermoBiometriaOutput;
      expect(result.documentHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve falhar se funcionario.nome estiver ausente', async () => {
      await expect(
        service.gerar(
          makeInput({
            funcionario: { nome: '', cpfMascarado: '', codigo: '' },
          }),
        ),
      ).rejects.toThrow('funcionario.nome');
    });

    it('deve falhar se empresa.nome estiver ausente', async () => {
      await expect(service.gerar(makeInput({ empresa: { nome: '' } }))).rejects.toThrow(
        'empresa.nome',
      );
    });

    it('deve falhar se clinica.nome estiver ausente', async () => {
      await expect(service.gerar(makeInput({ clinica: { nome: '' } }))).rejects.toThrow(
        'clinica.nome',
      );
    });

    it('deve falhar se versaoTermo estiver ausente', async () => {
      const input = makeInput();
      (input as any).versaoTermo = '';
      await expect(service.gerar(input)).rejects.toThrow('versaoTermo');
    });

    it('deve falhar com erro sanitizado (sem expor dados internos)', async () => {
      try {
        await service.gerar(
          makeInput({
            funcionario: { nome: '', cpfMascarado: '', codigo: '' },
          }),
        );
        fail('Deveria ter lancado erro');
      } catch (err: any) {
        expect(err.message).not.toContain('template');
        expect(err.message).not.toContain('score');
        expect(err.message).not.toContain('hash');
      }
    });

    it('deve conter QR code apontando para o relatorio de evidencias', async () => {
      const definition = await gerarTermoConsentimento(makeConsentimentoInput(), 'a'.repeat(64));
      const raw = JSON.stringify(definition);
      expect(raw).toContain('"qr":"https://blob.test/evidencias/biometria-report.pdf"');
    });
  });
});
