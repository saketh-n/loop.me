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
    if (newHealth === 0 && !state.isGameComplete) {
      return { health: newHealth, isGameComplete: true };
    }
    return { health: newHealth };
  }),
  isGameComplete: false,
  setGameComplete: (complete) => set({ isGameComplete: complete }),
})); 