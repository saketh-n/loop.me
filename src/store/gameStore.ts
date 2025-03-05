import { create } from 'zustand';

interface GameState {
  position: [number, number, number];
  setPosition: (position: [number, number, number]) => void;
  score: number;
  addScore: (points: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  position: [0, 1, 0], // Initial position (x, y, z)
  setPosition: (position) => set({ position }),
  score: 0,
  addScore: (points) => set((state) => ({ score: state.score + points })),
})); 