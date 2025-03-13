import { create } from 'zustand';
import { levels, LevelConfig } from '../config/levels';

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
  fallTime: number;
  setFallTime: (time: number) => void;
  isEndlessFall: boolean;
  setEndlessFall: (endless: boolean) => void;
  currentLevel: number;
  levelConfig: LevelConfig;
  nextLevel: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
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
  fallTime: 0,
  setFallTime: (time) => set({ fallTime: time }),
  isEndlessFall: false,
  setEndlessFall: (endless) => set({ isEndlessFall: endless }),
  currentLevel: 1,
  levelConfig: levels[0],
  nextLevel: () => set((state) => {
    const nextLevelIndex = state.currentLevel;
    if (nextLevelIndex < levels.length) {
      return {
        currentLevel: nextLevelIndex + 1,
        levelConfig: levels[nextLevelIndex],
        // Reset state for new level
        health: 100,
        hasLegsEnabled: true,
        isGameComplete: false,
        isGameFailed: false,
        isEndlessFall: false,
        fallTime: 0,
        position: [0, levels[nextLevelIndex].spawnHeight + 2, 0],
      };
    }
    return state;
  }),
})); 