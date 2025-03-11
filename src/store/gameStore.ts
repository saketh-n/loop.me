import { create } from 'zustand';

interface GameState {
  position: [number, number, number];
  setPosition: (position: [number, number, number]) => void;
  score: number;
  addScore: (points: number) => void;
  health: number;
  maxHealth: number;
  takeDamage: (damage: number) => void;
  isGameComplete: boolean;
  setGameComplete: (complete: boolean) => void;
  hasLegsEnabled: boolean;
  setLegsEnabled: (enabled: boolean) => void;
  isGameFailed: boolean;
  setGameFailed: (failed: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  position: [0, 1, 0], // Initial position (x, y, z)
  setPosition: (position) => set({ position }),
  score: 0,
  addScore: (points) => set((state) => ({ score: state.score + points })),
  health: 100,
  maxHealth: 100,
  takeDamage: (damage) => set((state) => {
    const newHealth = Math.max(0, state.health - damage);
    if (damage > 0 && damage >= 20) {
      // Break legs on high damage impacts (20 or more) and set game to failed state
      return { health: newHealth, hasLegsEnabled: false, isGameFailed: true };
    }
    if (newHealth === 0 && !state.isGameComplete) {
      return { health: newHealth, isGameComplete: true };
    }
    return { health: newHealth };
  }),
  isGameComplete: false,
  setGameComplete: (complete) => set({ isGameComplete: complete }),
  hasLegsEnabled: true,
  setLegsEnabled: (enabled) => set({ hasLegsEnabled: enabled }),
  isGameFailed: false,
  setGameFailed: (failed) => set({ isGameFailed: failed }),
})); 