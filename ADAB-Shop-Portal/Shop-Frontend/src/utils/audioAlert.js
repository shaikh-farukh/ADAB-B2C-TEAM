// Native Web Audio API chime synthesis for real-time notifications (zero audio file dependencies)
export function playNotificationChime(forcePlay = false) {
  try {
    if (!forcePlay && typeof localStorage !== 'undefined') {
      const isMuted = localStorage.getItem('adab_sound_enabled') === 'false';
      if (isMuted) return;
    }

    const AudioContext = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // Primary chime tone (E5: 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Harmonic chime tone (A5: 880.00Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Graceful fallback if audio is autoplay-restricted by browser policy
  }
}
