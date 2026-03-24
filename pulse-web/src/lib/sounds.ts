/**
 * Sound effect utilities for the practice flow.
 * Uses the Web Audio API to generate a "correct answer" chime
 * without needing any external audio files.
 */

export function playCorrectSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // First tone — bright major chord "ding"
    const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Ascending major chord: C5 → E5 → G5
    playTone(523.25, now, 0.3, 0.15);        // C5
    playTone(659.25, now + 0.08, 0.3, 0.12); // E5
    playTone(783.99, now + 0.16, 0.4, 0.10); // G5
    
    // Clean up context after sounds finish
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Silently fail if audio context is not available
  }
}
