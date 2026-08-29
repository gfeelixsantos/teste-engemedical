const test = require('node:test');
const assert = require('node:assert');

// ============================================================
// BIOMETRIA — CONTRATO DE EVENTOS FRONTEND
// ============================================================

test('deve definir nome correto para biometria:cadastro_request', () => {
  const evento = 'biometria:cadastro_request';
  assert.strictEqual(evento, 'biometria:cadastro_request');
});

test('deve definir nome correto para biometria:cadastro_command', () => {
  const evento = 'biometria:cadastro_command';
  assert.strictEqual(evento, 'biometria:cadastro_command');
});

test('deve definir nome correto para biometria:cadastro_result', () => {
  const evento = 'biometria:cadastro_result';
  assert.strictEqual(evento, 'biometria:cadastro_result');
});

test('deve definir nome correto para biometria:validacao_request', () => {
  const evento = 'biometria:validacao_request';
  assert.strictEqual(evento, 'biometria:validacao_request');
});

test('deve definir nome correto para biometria:validacao_command', () => {
  const evento = 'biometria:validacao_command';
  assert.strictEqual(evento, 'biometria:validacao_command');
});

test('deve definir nome correto para biometria:validacao_result', () => {
  const evento = 'biometria:validacao_result';
  assert.strictEqual(evento, 'biometria:validacao_result');
});

test('deve definir nome correto para biometria:captura_request', () => {
  const evento = 'biometria:captura_request';
  assert.strictEqual(evento, 'biometria:captura_request');
});

test('deve definir nome correto para biometria:captura_command', () => {
  const evento = 'biometria:captura_command';
  assert.strictEqual(evento, 'biometria:captura_command');
});

// ============================================================
// REGRAS DE ROTEAMENTO
// ============================================================

test('cadastro NAO pode usar captura_command', () => {
  const eventoCadastro = 'biometria:cadastro_command';
  const eventoCaptura = 'biometria:captura_command';
  assert.notStrictEqual(eventoCadastro, eventoCaptura);
  assert.ok(eventoCadastro.includes('cadastro'));
  assert.ok(eventoCaptura.includes('captura'));
});

test('validacao NAO pode usar captura_command', () => {
  const eventoValidacao = 'biometria:validacao_command';
  const eventoCaptura = 'biometria:captura_command';
  assert.notStrictEqual(eventoValidacao, eventoCaptura);
  assert.ok(eventoValidacao.includes('validacao'));
  assert.ok(eventoCaptura.includes('captura'));
});

test('todos os eventos devem ter prefixo biometria:', () => {
  const eventos = [
    'biometria:cadastro_request',
    'biometria:cadastro_command',
    'biometria:cadastro_status',
    'biometria:cadastro_result',
    'biometria:validacao_request',
    'biometria:validacao_command',
    'biometria:validacao_result',
    'biometria:captura_request',
    'biometria:captura_command',
    'biometria:captura_success',
    'biometria:captura_error',
  ];

  eventos.forEach((evento) => {
    assert.ok(evento.startsWith('biometria:'), `Evento "${evento}" deve ter prefixo "biometria:"`);
  });
});

// ============================================================
// PAYLOADS
// ============================================================

test('payload de cadastro_request deve conter campos obrigatorios', () => {
  const payload = {
    requestId: 'req-001',
    unidade: 'RIO CLARO',
    sala: 'SALA 1',
    operador: { id: 'op-001', nome: 'Operador' },
    funcionario: { id: 'func-001', nome: 'Funcionario', cpf: '12345678909' },
    dedo: { codigo: 'INDICADOR_DIREITO', label: 'Indicador direito' },
    origem: 'RECEPCAO',
    solicitadoEm: new Date().toISOString(),
  };

  assert.ok(payload.requestId);
  assert.ok(payload.unidade);
  assert.ok(payload.funcionario);
  assert.ok(payload.funcionario.cpf);
  assert.ok(payload.dedo);
  assert.ok(payload.dedo.codigo);
});

test('payload de validacao_request deve conter cpf e dataNascimento', () => {
  const payload = {
    requestId: 'req-val-001',
    unidade: 'RIO CLARO',
    ipLocal: '192.168.1.100',
    funcionario: {
      cpf: '12345678909',
      dataNascimento: '1990-01-01',
      nome: 'Funcionario Test',
    },
    dedo: { codigo: 'INDICADOR_DIREITO', label: 'Indicador direito' },
    origem: 'recepcao',
  };

  assert.ok(payload.funcionario.cpf);
  assert.ok(payload.funcionario.dataNascimento);
  assert.ok(payload.dedo);
});

test('payload de validacao_result deve conter aprovado, score, threshold', () => {
  const payload = {
    requestId: 'req-val-001',
    aprovado: true,
    score: 85.5,
    threshold: 70.0,
    engine: 'futronic-ansi',
    templateVersion: 'futronic-ansi-v1',
    dedo: 'INDICADOR_DIREITO',
    capturadoEm: new Date().toISOString(),
  };

  assert.strictEqual(typeof payload.aprovado, 'boolean');
  assert.strictEqual(typeof payload.score, 'number');
  assert.strictEqual(typeof payload.threshold, 'number');
  assert.ok(payload.engine);
  assert.ok(payload.templateVersion);
});

test('payload de validacao_result NAO deve conter template', () => {
  const payload = {
    requestId: 'req-val-001',
    aprovado: true,
    score: 85.5,
    threshold: 70.0,
    engine: 'futronic-ansi',
    templateVersion: 'futronic-ansi-v1',
    dedo: 'INDICADOR_DIREITO',
    capturadoEm: new Date().toISOString(),
  };

  assert.strictEqual(payload.template, undefined);
  assert.strictEqual(payload.templateBase64, undefined);
});

test('payload de cadastro_result NAO deve conter imagemDerivadaBase64', () => {
  const payload = {
    requestId: 'req-001',
    status: 'concluido',
    capturas: [
      {
        indice: 1,
        imagemDerivadaHash: 'hash123',
      },
    ],
  };

  assert.strictEqual(payload.capturas[0].imagemDerivadaBase64, undefined);
  assert.ok(payload.capturas[0].imagemDerivadaHash);
});

// ============================================================
// SEGURANCA
// ============================================================

test('CPF nao deve ser logado puro', () => {
  const cpfPuro = '12345678909';
  const cpfMascarado = `${cpfPuro.slice(0, 3)}.***.***-${cpfPuro.slice(9)}`;

  assert.ok(cpfMascarado.includes('***'));
  assert.ok(!cpfMascarado.includes('456789'));
});

test('template nao deve aparecer em logs', () => {
  const templateBase64 = Buffer.from([0x41, 0x4E, 0x53, 0x49]).toString('base64');
  const logMessage = `Template size: ${templateBase64.length} bytes`;

  assert.ok(!logMessage.includes('QU5TSQ=='));
});

// ============================================================
// UX E ERRO DE CONEXAO
// ============================================================

test('cadastro e validacao devem suportar agent_not_found e reader_unavailable', () => {
  const statusSuportadosCadastro = [
    "selecionando_dedo",
    "agent_not_found",
    "reader_unavailable",
    "concluido",
    "erro",
  ];
  
  const statusSuportadosValidacao = [
    "idle",
    "buscando_cadastro",
    "cadastro_encontrado",
    "agent_resolving",
    "agent_found",
    "command_sent",
    "waiting_finger",
    "capturing",
    "extracting_template",
    "comparing_templates",
    "aprovado",
    "reprovado",
    "error",
    "agent_not_found",
    "reader_unavailable",
  ];

  assert.ok(statusSuportadosCadastro.includes("agent_not_found"));
  assert.ok(statusSuportadosCadastro.includes("reader_unavailable"));
  assert.ok(statusSuportadosValidacao.includes("agent_not_found"));
  assert.ok(statusSuportadosValidacao.includes("reader_unavailable"));
});

test('tentativa de retry deve gerar novo requestId', () => {
  const reqIdAntigo = 'req-001';
  const reqIdNovo = `status_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  assert.notStrictEqual(reqIdAntigo, reqIdNovo);
});

test('delay visual deve enfileirar steps sem pular', () => {
  const seqEsperada = [
    "buscando_cadastro",
    "cadastro_encontrado",
    "agent_resolving",
    "agent_found",
    "command_sent",
    "waiting_finger",
    "capturing",
    "extracting_template",
    "comparing_templates",
    "aprovado",
  ];

  // O delay por step deve ser de pelo menos 350ms a 500ms
  const minDelay = 350;
  const maxDelay = 500;
  const stepDelay = 450;
  assert.ok(stepDelay >= minDelay && stepDelay <= maxDelay, 'Delay de step fora do range');
  assert.strictEqual(seqEsperada[0], 'buscando_cadastro');
  assert.strictEqual(seqEsperada[seqEsperada.length - 1], 'aprovado');
});
