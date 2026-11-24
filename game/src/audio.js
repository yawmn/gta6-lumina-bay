// SoundEngine: all sound is procedural WebAudio — oscillators and filtered noise,
// no audio files and no network. Engine hum follows the driven car's speed, the
// siren wails while police chase, and gunshots, explosions and pickups are short
// bursts. It starts only after a user gesture (the browser requires one) and stays
// silent in screenshot mode.

export function createSoundEngine() {
  let context = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(context.destination);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(context.destination);
      sirenOsc.start();
    } catch {
      context = null;
    }
    return context;
  }

  function burst(duration, type, fromFreq, toFreq, volume) {
    if (muted || !ensure()) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(fromFreq, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), context.currentTime + duration);
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      osc.connect(gain).connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + duration);
    } catch {
      // Audio is decoration: never let it break the game.
    }
  }

  return {
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      if (sirenGain) sirenGain.gain.value = 0;
      return muted;
    },
    isMuted() {
      return muted;
    },
    gunshot() {
      burst(0.12, 'square', 900, 120, 0.16);
    },
    explosion() {
      burst(0.7, 'sawtooth', 160, 30, 0.3);
    },
    pickup() {
      burst(0.18, 'sine', 520, 1040, 0.14);
    },
    missionPass() {
      burst(0.25, 'sine', 660, 660, 0.14);
      setTimeout(() => burst(0.35, 'sine', 880, 880, 0.14), 140);
    },
    update(driving, speedRatio, policeNear) {
      if (!context || muted) return;
      if (engineGain) engineGain.gain.value = driving ? 0.04 + speedRatio * 0.05 : 0;
      if (engineOsc) engineOsc.frequency.value = 55 + speedRatio * 130;
      if (sirenGain) sirenGain.gain.value = policeNear ? 0.035 : 0;
      if (sirenOsc) sirenOsc.frequency.value = 650 + Math.sin(performance.now() / 380) * 220;
    },
  };
}
