// ============================================================================
// audioNotification.ts - Sintetizador de Notificação Sonora de WhatsApp (Web Audio API)
// ============================================================================
// Utiliza a Web Audio API nativa para reproduzir um som elegante e cristalino
// estilo "ding-dong" de mensageria (Slack / WhatsApp Web), sem carregar arquivos .mp3.
// Inclui desbloqueio automático no primeiro gesto do usuário e proteção contra
// rajada sonora (throttle para nunca reproduzir múltiplos sons encavalados).
// ============================================================================

let audioCtx: AudioContext | null = null;
let lastSoundPlayedTime = 0;
const THROTTLE_INTERVAL_MS = 1500; // Mínimo de 1.5s entre notificações sonoras

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        // Ignora caso ainda não tenha havido interação do usuário
      });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Desbloqueia o contexto de áudio no primeiro clique ou tecla pressionada pelo usuário
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

/**
 * Toca o som suave de notificação de nova mensagem do WhatsApp.
 * Possui throttle embutido: se chamado 10 vezes em 1 segundo, tocará apenas 1 vez.
 */
export function playWhatsAppNotificationSound(): void {
  const now = Date.now();
  if (now - lastSoundPlayedTime < THROTTLE_INTERVAL_MS) {
    return; // Evita rajada sonora
  }
  lastSoundPlayedTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const startTime = ctx.currentTime;

    // --- Nota 1: D5 (587.33 Hz) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, startTime); // Tom suave ré

    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(startTime);
    osc1.stop(startTime + 0.18);

    // --- Nota 2: A5 (880 Hz) - Tom harmônico mais alto, característico de mensageria ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    const note2Start = startTime + 0.08;
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, note2Start); // Tom lá

    gain2.gain.setValueAtTime(0.001, note2Start);
    gain2.gain.linearRampToValueAtTime(0.35, note2Start + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, note2Start + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(note2Start);
    osc2.stop(note2Start + 0.5);
  } catch (err) {
    // Falha silenciosa para não quebrar a aplicação caso o áudio esteja restrito
    console.warn('[AudioNotification] Não foi possível reproduzir som de notificação:', err);
  }
}
