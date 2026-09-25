// VOID // AGENT LAB — Phase 11A: Reusable Audio System
// Restrained sci-fi SFX with volume/mute and autoplay handling

export type SFXKey =
  | 'deploy'
  | 'jump'
  | 'cruise'
  | 'anomaly'
  | 'hostile'
  | 'damage'
  | 'success'
  | 'failure'
  | 'abort'
  | 'docking'
  | 'button'
  | 'select'
  | 'levelup'
  | 'scan'
  | 'error';

export interface SFXConfig {
  frequency: number;
  type: OscillatorType;
  duration: number;
  attack: number;
  decay: number;
  gain: number;
  detune?: number;
}

const SFX_REGISTRY: Record<SFXKey, SFXConfig> = {
  deploy:     { frequency: 110, type: 'sine', duration: 0.35, attack: 0.02, decay: 0.2, gain: 0.18, detune: -1200 },
  jump:       { frequency: 220, type: 'square', duration: 0.12, attack: 0.005, decay: 0.08, gain: 0.15 },
  cruise:     { frequency: 180, type: 'triangle', duration: 0.18, attack: 0.02, decay: 0.1, gain: 0.1, detune: 50 },
  anomaly:    { frequency: 440, type: 'sawtooth', duration: 0.4, attack: 0.01, decay: 0.25, gain: 0.12, detune: 200 },
  hostile:    { frequency: 130, type: 'sawtooth', duration: 0.3, attack: 0.01, decay: 0.18, gain: 0.16, detune: -400 },
  damage:     { frequency: 90, type: 'square', duration: 0.25, attack: 0.001, decay: 0.15, gain: 0.18, detune: -800 },
  success:    { frequency: 523, type: 'sine', duration: 0.4, attack: 0.02, decay: 0.2, gain: 0.15 },
  failure:    { frequency: 180, type: 'square', duration: 0.5, attack: 0.02, decay: 0.3, gain: 0.14 },
  abort:      { frequency: 150, type: 'triangle', duration: 0.3, attack: 0.01, decay: 0.2, gain: 0.12 },
  docking:    { frequency: 330, type: 'sine', duration: 0.35, attack: 0.02, decay: 0.2, gain: 0.14 },
  button:     { frequency: 600, type: 'sine', duration: 0.06, attack: 0.005, decay: 0.03, gain: 0.08 },
  select:     { frequency: 480, type: 'sine', duration: 0.05, attack: 0.005, decay: 0.025, gain: 0.07 },
  levelup:    { frequency: 660, type: 'sine', duration: 0.6, attack: 0.02, decay: 0.4, gain: 0.14 },
  scan:       { frequency: 880, type: 'sine', duration: 0.12, attack: 0.005, decay: 0.08, gain: 0.1 },
  error:      { frequency: 120, type: 'square', duration: 0.15, attack: 0.005, decay: 0.1, gain: 0.12 },
};

// Audio context singleton
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;
let sfxVolume = 0.6;
let hasUserInteraction = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = isMuted ? 0 : sfxVolume;
  }
  return audioContext;
}

function resumeAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Mark that user has interacted (for autoplay policy)
export function markUserInteraction(): void {
  hasUserInteraction = true;
  resumeAudioContext();
}

// Master controls
export function setMuted(muted: boolean): void {
  isMuted = muted;
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : sfxVolume;
  }
}

export function setSFXVolume(volume: number): void {
  sfxVolume = Math.max(0, Math.min(1, volume));
  if (masterGain && !isMuted) {
    masterGain.gain.value = sfxVolume;
  }
}

export function getMuted(): boolean {
  return isMuted;
}

export function getSFXVolume(): number {
  return sfxVolume;
}

// Play a registered SFX
export function playSFX(key: SFXKey, options?: { volume?: number; playbackRate?: number }): void {
  if (isMuted) return;
  if (!hasUserInteraction) return; // Respect autoplay policy

  const ctx = getAudioContext();
  const config = SFX_REGISTRY[key];
  if (!config) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = config.type;
  osc.frequency.value = config.frequency;
  if (config.detune) osc.detune.value = config.detune;

  const vol = (options?.volume ?? 1) * config.gain;
  osc.connect(gain);
  gain.connect(masterGain!);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + config.attack);
  gain.gain.exponentialRampToValueAtTime(0.001, now + config.attack + config.decay);

  osc.start(now);
  osc.stop(now + config.attack + config.decay + 0.05);

  // Cleanup
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

// Play a sequence of SFX for complex events
export function playSequence(keys: SFXKey[], intervalMs: number = 80): void {
  keys.forEach((key, i) => {
    setTimeout(() => playSFX(key), i * intervalMs);
  });
}

// Specific event helpers
export const sfx = {
  deploy: () => playSFX('deploy'),
  jump: () => playSFX('jump'),
  cruise: () => playSFX('cruise'),
  anomaly: () => playSFX('anomaly'),
  hostile: () => playSFX('hostile'),
  damage: () => playSFX('damage'),
  success: () => playSFX('success'),
  failure: () => playSFX('failure'),
  abort: () => playSFX('abort'),
  docking: () => playSFX('docking'),
  button: () => playSFX('button'),
  select: () => playSFX('select'),
  levelup: () => playSFX('levelup'),
  scan: () => playSFX('scan'),
  error: () => playSFX('error'),
};

// UI click handlers (attach to any clickable element for autoplay unlock)
export function attachAutoplayUnlock(element: HTMLElement): void {
  const unlock = () => {
    markUserInteraction();
    element.removeEventListener('click', unlock);
    element.removeEventListener('keydown', unlock);
  };
  element.addEventListener('click', unlock, { once: true });
  element.addEventListener('keydown', unlock, { once: true });
}