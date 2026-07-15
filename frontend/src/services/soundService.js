/**
 * soundService.js — Synthesized audio chimes using Web Audio API.
 * No external audio files needed. Sounds are lightweight and instant.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/** Play a tone at a given frequency for a given duration */
function playTone(frequency, duration = 0.15, type = 'sine', volume = 0.12) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail — sounds are optional
  }
}

/** Match found — cheerful ascending arpeggio */
export function playMatchFound() {
  playTone(523, 0.12, 'sine', 0.1);       // C5
  setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 80);  // E5
  setTimeout(() => playTone(784, 0.2, 'sine', 0.12), 160);  // G5
}

/** Disconnected — descending double tone */
export function playDisconnected() {
  playTone(440, 0.15, 'sine', 0.08);      // A4
  setTimeout(() => playTone(330, 0.2, 'sine', 0.08), 120);  // E4
}

/** Message received — soft pop */
export function playMessageReceived() {
  playTone(880, 0.08, 'sine', 0.06);
}

/** Mute/unmute toggle — short click */
export function playToggle() {
  playTone(600, 0.05, 'square', 0.04);
}
