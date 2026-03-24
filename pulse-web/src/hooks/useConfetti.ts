'use client';

import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export function useConfetti() {
  const fireConfetti = useCallback(() => {
    // Burst from the center with neon-themed colors
    const defaults = {
      spread: 70,
      ticks: 80,
      gravity: 1.2,
      decay: 0.92,
      startVelocity: 30,
      colors: ['#00F0FF', '#00D4E0', '#33F3FF', '#66F7FF', '#10B981', '#00E0F0'],
    };

    confetti({
      ...defaults,
      particleCount: 50,
      origin: { x: 0.5, y: 0.6 },
      scalar: 1.1,
    });

    // Slight delay for a second burst
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.4, y: 0.55 },
        scalar: 0.9,
      });
      confetti({
        ...defaults,
        particleCount: 30,
        origin: { x: 0.6, y: 0.55 },
        scalar: 0.9,
      });
    }, 150);
  }, []);

  return { fireConfetti };
}
