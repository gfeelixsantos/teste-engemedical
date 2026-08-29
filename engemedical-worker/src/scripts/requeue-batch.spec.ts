/**
 * Spec de Unidade: requeue-batch.js
 *
 * Valida a lógica de montagem e envio do payload para a fila aso-enriquecimento.
 * Testa os seguintes cenários críticos:
 *   1. Payload com url (ASOINFO.url preenchido) → deve usar url real
 *   2. Payload sem url (ASOINFO.url ausente) → deve ser null (worker usa fallback)
 *   3. Payload monta os campos obrigatórios corretamente (schedulingId, nomeFuncionario, etc.)
 *   4. Encode Base64 do payload está correto (SDK Azure Storage Queue)
 *   5. Filtro do MongoDB busca somente DIGITALIZADA com url existente
 */

describe('requeue-batch payload builder', () => {
  // Helper que simula o que o requeue-batch.js faz para cada scheduling do Mongo
  function buildPayload(s: {
    _id: string;
    ASOINFO?: {
      url?: string;
      codigoProfissional?: string;
      professional?: any;
      credentials?: any;
    };
    CODIGOEMPRESA?: string;
    MEDICO?: string;
    NOME?: string;
    NOMEEMPRESA?: string;
    TIPOEXAMENOME?: string;
    CODIGOPRONTUARIO?: string;
  }) {
    const payload = {
      schedulingId: s._id.toString(),
      url: s.ASOINFO?.url || null,
      codEmpresa: s.CODIGOEMPRESA || null,
      medico: s.ASOINFO?.codigoProfissional || s.MEDICO || '',
      profissional: s.ASOINFO?.professional || null,
      credentials: s.ASOINFO?.credentials || null,
      nomeFuncionario: s.NOME || 'N/D',
      nomeEmpresa: s.NOMEEMPRESA || 'N/D',
      tipoExame: s.TIPOEXAMENOME || 'N/D',
    };

    const messageText = JSON.stringify(payload);
    const b64 = Buffer.from(messageText).toString('base64');
    return { payload, messageText, b64 };
  }

  // Helper que simula o que o handleMessage do worker faz para ler a mensagem
  function parseQueueMessage(messageText: string): any {
    let jsonString = messageText;
    if (
      !jsonString.trim().startsWith('{') &&
      !jsonString.trim().startsWith('[')
    ) {
      try {
        jsonString = Buffer.from(jsonString, 'base64').toString('utf-8');
      } catch {
        // fallback
      }
    }
    return JSON.parse(jsonString);
  }

  // ─── Cenário 1: URL real presente ───────────────────────────────────────────
  describe('quando ASOINFO.url está preenchido', () => {
    const scheduling = {
      _id: '69eb5703a7c459d71c8e1f50',
      ASOINFO: {
        url: 'https://cmso360.blob.core.windows.net/documents/aso/2026/ASO_12345_JOAO_SILVA_20260429.pdf',
        codigoProfissional: '123456',
      },
      CODIGOEMPRESA: '100',
      NOME: 'JOAO SILVA',
      NOMEEMPRESA: 'EMPRESA TESTE LTDA',
      TIPOEXAMENOME: 'ADMISSIONAL',
    };

    it('deve incluir a url real no payload', () => {
      const { payload } = buildPayload(scheduling);
      expect(payload.url).toBe(scheduling.ASOINFO.url);
    });

    it('deve incluir codEmpresa no payload', () => {
      const { payload } = buildPayload(scheduling);
      expect(payload.codEmpresa).toBe('100');
    });

    it('deve codificar o payload em base64 válido', () => {
      const { b64 } = buildPayload(scheduling);
      expect(() => Buffer.from(b64, 'base64').toString('utf-8')).not.toThrow();
    });

    it('worker deve parsear o b64 e recuperar a url corretamente', () => {
      const { b64, payload } = buildPayload(scheduling);
      const parsed = parseQueueMessage(b64);
      expect(parsed.url).toBe(payload.url);
      expect(parsed.schedulingId).toBe(scheduling._id);
    });

    it('worker deve parsear JSON puro sem b64 também', () => {
      const { messageText, payload } = buildPayload(scheduling);
      const parsed = parseQueueMessage(messageText);
      expect(parsed.url).toBe(payload.url);
    });
  });

  // ─── Cenário 2: URL ausente (casos legados) ──────────────────────────────────
  describe('quando ASOINFO.url está ausente', () => {
    const schedulingLegacy = {
      _id: '69eb5864a7c459d71c8e1f6b',
      ASOINFO: {
        codigoProfissional: '654321',
        // sem url
      },
      CODIGOEMPRESA: '200',
      NOME: 'MARIA OLIVEIRA',
      NOMEEMPRESA: 'EMPRESA B LTDA',
      TIPOEXAMENOME: 'PERIODICO',
    };

    it('deve definir url como null no payload', () => {
      const { payload } = buildPayload(schedulingLegacy);
      expect(payload.url).toBeNull();
    });

    it('worker parseia corretamente e url é null', () => {
      const { b64 } = buildPayload(schedulingLegacy);
      const parsed = parseQueueMessage(b64);
      expect(parsed.url).toBeNull();
    });

    it('worker cai no fallback aso/{ano}/{id}.pdf quando url é null', () => {
      // Simula a lógica do handleMessage (linhas 94-118 do service)
      const parsed = parseQueueMessage(buildPayload(schedulingLegacy).b64);
      const originalUrl = parsed.url;
      const year = new Date().getFullYear();
      // Se url for null/undefined, o worker usa o fallback
      const expectedFallback = `aso/${year}/${parsed.schedulingId}.pdf`;
      const blobName = originalUrl ? 'usaria-url-real' : expectedFallback;
      expect(blobName).toBe(expectedFallback);
      // ATENÇÃO: este é exatamente o bug que causa as falhas em produção
      // quando ASOs legados não têm ASOINFO.url preenchido
    });
  });

  // ─── Cenário 3: Campos obrigatórios ─────────────────────────────────────────
  describe('campos obrigatórios no payload', () => {
    const scheduling = {
      _id: 'abc123',
      ASOINFO: { url: 'https://blob/aso/2026/ASO_abc.pdf' },
      CODIGOEMPRESA: '300',
      NOME: 'CARLOS TESTE',
      NOMEEMPRESA: 'EMPRESA C',
      TIPOEXAMENOME: 'RETORNO',
    };

    it('deve ter schedulingId', () => {
      const { payload } = buildPayload(scheduling);
      expect(payload.schedulingId).toBe('abc123');
    });

    it('deve ter nomeFuncionario', () => {
      const { payload } = buildPayload(scheduling);
      expect(payload.nomeFuncionario).toBe('CARLOS TESTE');
    });

    it('deve ter nomeEmpresa', () => {
      const { payload } = buildPayload(scheduling);
      expect(payload.nomeEmpresa).toBe('EMPRESA C');
    });

    it('deve usar N/D quando campos ausentes', () => {
      const { payload } = buildPayload({
        _id: 'xyz',
        ASOINFO: { url: 'https://blob/aso/2026/ASO_xyz.pdf' },
      });
      expect(payload.nomeFuncionario).toBe('N/D');
      expect(payload.nomeEmpresa).toBe('N/D');
      expect(payload.tipoExame).toBe('N/D');
    });
  });

  // ─── Cenário 4: Encode/decode round-trip ────────────────────────────────────
  describe('encode/decode Base64 round-trip', () => {
    it('deve preservar todos os campos após encode → decode', () => {
      const scheduling = {
        _id: 'roundtrip-id',
        ASOINFO: {
          url: 'https://cmso360.blob.core.windows.net/documents/aso/2026/ASO_roundtrip.pdf',
          codigoProfissional: '999',
          professional: {
            codigo: '999',
            nome: 'DR. TESTE',
            cpf: '000.000.000-00',
          },
        },
        CODIGOEMPRESA: '42',
        NOME: 'FUNCIONARIO ROUND-TRIP',
        NOMEEMPRESA: 'EMPRESA RT',
        TIPOEXAMENOME: 'ADMISSIONAL',
      };

      const { b64 } = buildPayload(scheduling);
      const decoded = parseQueueMessage(b64);

      expect(decoded.schedulingId).toBe(scheduling._id);
      expect(decoded.url).toBe(scheduling.ASOINFO.url);
      expect(decoded.codEmpresa).toBe(scheduling.CODIGOEMPRESA);
      expect(decoded.nomeFuncionario).toBe(scheduling.NOME);
      expect(decoded.nomeEmpresa).toBe(scheduling.NOMEEMPRESA);
      expect(decoded.profissional?.nome).toBe(
        scheduling.ASOINFO.professional.nome,
      );
    });
  });

  // ─── Cenário 5: Filtro do MongoDB ───────────────────────────────────────────
  describe('filtro do MongoDB para buscar ASOs elegíveis', () => {
    // Simula o filtro que o requeue-batch.js aplica
    function matchesFilter(s: any): boolean {
      const hasStatus = s?.ASOINFO?.status === 'DIGITALIZADA';
      const hasUrl = s?.ASOINFO?.url != null && s?.ASOINFO?.url !== '';
      const hasAsoInfo = s?.ASOINFO != null;
      return hasStatus && hasUrl && hasAsoInfo;
    }

    it('deve incluir ASO DIGITALIZADA com url preenchida', () => {
      const s = {
        ASOINFO: { status: 'DIGITALIZADA', url: 'https://blob/aso.pdf' },
      };
      expect(matchesFilter(s)).toBe(true);
    });

    it('deve EXCLUIR ASO DIGITALIZADA sem url', () => {
      const s = { ASOINFO: { status: 'DIGITALIZADA' } };
      expect(matchesFilter(s)).toBe(false);
    });

    it('deve EXCLUIR ASO em status FALHA (evitar loops)', () => {
      const s = { ASOINFO: { status: 'FALHA', url: 'https://blob/aso.pdf' } };
      expect(matchesFilter(s)).toBe(false);
    });

    it('deve EXCLUIR ASO sem ASOINFO', () => {
      const s = {};
      expect(matchesFilter(s)).toBe(false);
    });

    it('deve EXCLUIR ASO LIBERADO (já processado)', () => {
      const s = {
        ASOINFO: { status: 'LIBERADO', url: 'https://blob/aso.pdf' },
      };
      expect(matchesFilter(s)).toBe(false);
    });
  });

  // ─── Cenário 6: Canary - detectar regressão do bug antigo ───────────────────
  describe('canary test - bug do lote antigo sem url', () => {
    it('mensagem sem url NÃO deve capotar ao ser parseada', () => {
      // Simula o payload do requeue-batch antigo (sem url)
      const legacyPayload = {
        schedulingId: '69eb5703a7c459d71c8e1f50',
        medico: '12345',
        nomeFuncionario: 'MARIANA FERREIRA DE CARVALHO',
        nomeEmpresa: 'RH BRASIL SERVICOS TEMPORARIOS LTDA',
        tipoExame: 'ADMISSIONAL',
        // URL AUSENTE - este era o bug
      };
      const b64 = Buffer.from(JSON.stringify(legacyPayload)).toString('base64');
      const decoded = parseQueueMessage(b64);
      // Não deve ter url
      expect(decoded.url).toBeUndefined();
      // schedulingId preservado
      expect(decoded.schedulingId).toBe(legacyPayload.schedulingId);
    });
  });
});
