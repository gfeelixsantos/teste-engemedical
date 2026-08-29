function buildSpeechFallbackText(call) {
  const subject = call.name?.trim() ? call.name.trim() : `Senha ${call.ticket}`;
  const destination = call.sala?.trim();

  return destination ? `${subject}, ${destination}` : subject;
}

function waitMs(delay, setTimeoutFn = setTimeout) {
  return new Promise((resolve) => {
    setTimeoutFn(resolve, delay);
  });
}

function playNativeSpeechFallback({
  call,
  speechSynthesis,
  SpeechSynthesisUtterance,
  setUtterance,
  timeoutMs = 10000,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  return new Promise((resolve) => {
    if (!speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      void waitMs(1000, setTimeoutFn).then(resolve);
      return;
    }

    let finished = false;
    let timeout;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (timeout) clearTimeoutFn(timeout);
      if (setUtterance) setUtterance(null);
      resolve();
    };

    try {
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        buildSpeechFallbackText(call),
      );
      const voice = speechSynthesis
        .getVoices()
        .find((item) => item.lang?.toLowerCase().startsWith("pt-br"));

      utterance.lang = "pt-BR";
      utterance.rate = 1;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = finish;
      utterance.onerror = finish;

      if (setUtterance) setUtterance(utterance);

      timeout = setTimeoutFn(() => {
        speechSynthesis.cancel();
        finish();
      }, timeoutMs);

      speechSynthesis.speak(utterance);
    } catch (error) {
      finish();
    }
  });
}

function waitForAudioEnd({
  audio,
  timeoutMs = 10000,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  logger = console,
}) {
  return new Promise((resolve) => {
    let settled = false;
    let timeout;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeoutFn(timeout);
      audio.removeEventListener("ended", finish);
      resolve();
    };

    timeout = setTimeoutFn(() => {
      logger?.warn?.("Timeout de fallback na reproducao do audio acionado");
      finish();
    }, timeoutMs);

    audio.addEventListener("ended", finish);
  });
}

async function playPreparedAudioWithFallback({
  call,
  audioEnabled,
  prepareAudio,
  playFallback,
  disabledDelayMs = 2500,
  afterPlayDelayMs = 1000,
  playbackTimeoutMs = 10000,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  logger = console,
}) {
  if (!audioEnabled) {
    await waitMs(disabledDelayMs, setTimeoutFn);
    return "disabled";
  }

  if (!call.audio) {
    await playFallback(call);
    return "fallback";
  }

  try {
    const audio = await prepareAudio();
    await audio.play();
    await waitForAudioEnd({
      audio,
      timeoutMs: playbackTimeoutMs,
      setTimeoutFn,
      clearTimeoutFn,
      logger,
    });
    await waitMs(afterPlayDelayMs, setTimeoutFn);
    return "audio";
  } catch (error) {
    logger?.error?.("Erro no audio:", error);
    await playFallback(call);
    return "fallback";
  }
}

module.exports = {
  buildSpeechFallbackText,
  playNativeSpeechFallback,
  playPreparedAudioWithFallback,
};
