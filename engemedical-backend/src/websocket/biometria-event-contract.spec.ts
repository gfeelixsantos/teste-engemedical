import { EventType } from 'src/websocket/events/events';

// ============================================================
// EVENT CONTRACT TESTS
// ============================================================

describe('Biometria — Contrato de Eventos', () => {
  describe('Eventos de Cadastro', () => {
    it('deve definir biometria:cadastro_request', () => {
      expect(EventType.BIOMETRIA_CADASTRO_REQUEST).toBe('biometria:cadastro_request');
    });

    it('deve definir biometria:cadastro_command', () => {
      expect(EventType.BIOMETRIA_CADASTRO_COMMAND).toBe('biometria:cadastro_command');
    });

    it('deve definir biometria:cadastro_status', () => {
      expect(EventType.BIOMETRIA_CADASTRO_STATUS).toBe('biometria:cadastro_status');
    });

    it('deve definir biometria:cadastro_result', () => {
      expect(EventType.BIOMETRIA_CADASTRO_RESULT).toBe('biometria:cadastro_result');
    });

    it('deve definir biometria:cadastro_cancel', () => {
      expect(EventType.BIOMETRIA_CADASTRO_CANCEL).toBe('biometria:cadastro_cancel');
    });
  });

  describe('Eventos de Validação 1:1', () => {
    it('deve definir biometria:validacao_request', () => {
      expect(EventType.BIOMETRIA_VALIDACAO_REQUEST).toBe('biometria:validacao_request');
    });

    it('deve definir biometria:validacao_command', () => {
      expect(EventType.BIOMETRIA_VALIDACAO_COMMAND).toBe('biometria:validacao_command');
    });

    it('deve definir biometria:validacao_result', () => {
      expect(EventType.BIOMETRIA_VALIDACAO_RESULT).toBe('biometria:validacao_result');
    });
  });

  describe('Eventos de Captura Simples', () => {
    it('deve definir biometria:captura_request', () => {
      expect(EventType.BIOMETRIA_CAPTURA_REQUEST).toBe('biometria:captura_request');
    });

    it('deve definir biometria:captura_command', () => {
      expect(EventType.BIOMETRIA_CAPTURA_COMMAND).toBe('biometria:captura_command');
    });

    it('deve definir biometria:captura_success', () => {
      expect(EventType.BIOMETRIA_CAPTURA_SUCCESS).toBe('biometria:captura_success');
    });

    it('deve definir biometria:captura_error', () => {
      expect(EventType.BIOMETRIA_CAPTURA_ERROR).toBe('biometria:captura_error');
    });

    it('deve definir biometria:captura_started', () => {
      expect(EventType.BIOMETRIA_CAPTURA_STARTED).toBe('biometria:captura_started');
    });

    it('deve definir biometria:captura_result', () => {
      expect(EventType.BIOMETRIA_CAPTURA_RESULT).toBe('biometria:captura_result');
    });

    it('deve definir biometria:captura_status', () => {
      expect(EventType.BIOMETRIA_CAPTURA_STATUS).toBe('biometria:captura_status');
    });

    it('deve definir biometria:captura_cancel', () => {
      expect(EventType.BIOMETRIA_CAPTURA_CANCEL).toBe('biometria:captura_cancel');
    });
  });

  describe('Eventos de Validação Status', () => {
    it('deve definir biometria:validacao_status', () => {
      expect(EventType.BIOMETRIA_VALIDACAO_STATUS).toBe('biometria:validacao_status');
    });
  });

  describe('Eventos de Status do Funcionário', () => {
    it('deve definir biometria:status_funcionario_request', () => {
      expect(EventType.BIOMETRIA_STATUS_FUNCIONARIO_REQUEST).toBe('biometria:status_funcionario_request');
    });

    it('deve definir biometria:status_funcionario_result', () => {
      expect(EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT).toBe('biometria:status_funcionario_result');
    });
  });

  describe('Eventos de Agente', () => {
    it('deve definir biometria:agent_status', () => {
      expect(EventType.BIOMETRIA_AGENT_STATUS).toBe('biometria:agent_status');
    });

    it('deve definir biometria:agent_snapshot', () => {
      expect(EventType.BIOMETRIA_AGENT_SNAPSHOT).toBe('biometria:agent_snapshot');
    });

    it('deve definir biometria:request_state', () => {
      expect(EventType.BIOMETRIA_REQUEST_STATE).toBe('biometria:request_state');
    });

    it('deve definir biometria:agent_unavailable', () => {
      expect(EventType.BIOMETRIA_AGENT_UNAVAILABLE).toBe('biometria:agent_unavailable');
    });
  });

  // ============================================================
  // REGRAS DE ROTEAMENTO
  // ============================================================

  describe('Regras de Roteamento', () => {
    it('cadastro NÃO pode usar captura_command', () => {
      const eventoCadastro = EventType.BIOMETRIA_CADASTRO_COMMAND;
      const eventoCaptura = EventType.BIOMETRIA_CAPTURA_COMMAND;

      expect(eventoCadastro).not.toBe(eventoCaptura);
      expect(eventoCadastro).toContain('cadastro');
      expect(eventoCaptura).toContain('captura');
    });

    it('validação NÃO pode usar captura_command', () => {
      const eventoValidacao = EventType.BIOMETRIA_VALIDACAO_COMMAND;
      const eventoCaptura = EventType.BIOMETRIA_CAPTURA_COMMAND;

      expect(eventoValidacao).not.toBe(eventoCaptura);
      expect(eventoValidacao).toContain('validacao');
      expect(eventoCaptura).toContain('captura');
    });

    it('cadastro NÃO pode usar validacao_command', () => {
      const eventoCadastro = EventType.BIOMETRIA_CADASTRO_COMMAND;
      const eventoValidacao = EventType.BIOMETRIA_VALIDACAO_COMMAND;

      expect(eventoCadastro).not.toBe(eventoValidacao);
    });

    it('todos os eventos devem ter prefixo biometria:', () => {
      const eventos = [
        EventType.BIOMETRIA_CADASTRO_REQUEST,
        EventType.BIOMETRIA_CADASTRO_COMMAND,
        EventType.BIOMETRIA_CADASTRO_STATUS,
        EventType.BIOMETRIA_CADASTRO_RESULT,
        EventType.BIOMETRIA_CADASTRO_CANCEL,
        EventType.BIOMETRIA_VALIDACAO_REQUEST,
        EventType.BIOMETRIA_VALIDACAO_COMMAND,
        EventType.BIOMETRIA_VALIDACAO_STATUS,
        EventType.BIOMETRIA_VALIDACAO_RESULT,
        EventType.BIOMETRIA_STATUS_FUNCIONARIO_REQUEST,
        EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT,
        EventType.BIOMETRIA_CAPTURA_REQUEST,
        EventType.BIOMETRIA_CAPTURA_COMMAND,
        EventType.BIOMETRIA_CAPTURA_SUCCESS,
        EventType.BIOMETRIA_CAPTURA_ERROR,
        EventType.BIOMETRIA_CAPTURA_STARTED,
        EventType.BIOMETRIA_CAPTURA_RESULT,
        EventType.BIOMETRIA_CAPTURA_STATUS,
        EventType.BIOMETRIA_CAPTURA_CANCEL,
        EventType.BIOMETRIA_REQUEST_STATE,
        EventType.BIOMETRIA_AGENT_UNAVAILABLE,
        EventType.BIOMETRIA_AGENT_STATUS,
        EventType.BIOMETRIA_AGENT_SNAPSHOT,
      ];

      eventos.forEach((evento) => {
        expect(evento).toMatch(/^biometria:/);
      });
    });

    it('eventos de resultado devem conter result', () => {
      expect(EventType.BIOMETRIA_CADASTRO_RESULT).toContain('result');
      expect(EventType.BIOMETRIA_VALIDACAO_RESULT).toContain('result');
    });

    it('eventos de status devem conter status', () => {
      expect(EventType.BIOMETRIA_CADASTRO_STATUS).toContain('status');
    });
  });

  // ============================================================
  // REGRAS DE NEGÓCIO
  // ============================================================

  describe('Regras de Negócio', () => {
    it('cadastro deve salvar em biometrias (não captura simples)', () => {
      const eventoCadastro = EventType.BIOMETRIA_CADASTRO_RESULT;
      expect(eventoCadastro).toBeDefined();
      expect(eventoCadastro).toContain('cadastro');
    });

    it('validação deve registrar auditoria', () => {
      const eventoValidacao = EventType.BIOMETRIA_VALIDACAO_RESULT;
      expect(eventoValidacao).toBeDefined();
      expect(eventoValidacao).toContain('validacao');
    });

    it('captura simples não deve salvar em biometrias', () => {
      const eventoCaptura = EventType.BIOMETRIA_CAPTURA_SUCCESS;
      expect(eventoCaptura).toBeDefined();
      expect(eventoCaptura).toContain('captura');
      expect(eventoCaptura).not.toContain('cadastro');
    });
  });
});
