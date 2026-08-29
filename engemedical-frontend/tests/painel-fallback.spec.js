const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSpeechFallbackText,
  playPreparedAudioWithFallback,
} = require("../lib/painel/painel-audio-fallback");

const baseCall = {
  id: 1,
  name: "Paciente Teste CMSO",
  sala: "dirigir-se à sala 1",
  ticket: "A001",
  exame: "RECEPCAO",
  unidade: "RIO CLARO",
};

test("monta o texto falado com nome e destino", () => {
  assert.equal(
    buildSpeechFallbackText(baseCall),
    "Paciente Teste CMSO, dirigir-se à sala 1",
  );
});

test("aciona o fallback quando a chamada chega sem mp3", async () => {
  const fallbackCalls = [];
  const result = await playPreparedAudioWithFallback({
    call: baseCall,
    audioEnabled: true,
    prepareAudio: async () => {
      throw new Error("Nao deveria tentar preparar audio sem call.audio");
    },
    playFallback: async (call) => {
      fallbackCalls.push(call);
    },
  });

  assert.equal(result, "fallback");
  assert.equal(fallbackCalls.length, 1);
  assert.equal(fallbackCalls[0].id, baseCall.id);
});

test("aciona o fallback quando o mp3 falha ao carregar", async () => {
  const fallbackCalls = [];
  const errors = [];

  const result = await playPreparedAudioWithFallback({
    call: {
      ...baseCall,
      audio: "/audio/arquivo-inexistente.mp3",
    },
    audioEnabled: true,
    prepareAudio: async () => {
      throw new Error("Falha simulada ao carregar o MP3");
    },
    playFallback: async (call) => {
      fallbackCalls.push(call);
    },
    logger: {
      error: (...args) => errors.push(args.join(" ")),
      warn: () => {},
    },
  });

  assert.equal(result, "fallback");
  assert.equal(fallbackCalls.length, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Falha simulada ao carregar o MP3/);
});
