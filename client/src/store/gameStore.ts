import { create } from 'zustand';

export type Point = [number, number];

export interface Stroke {
  id: string;
  color: string;
  fillColor: string;
  size: number;
  mode: 'stroke' | 'fill' | 'both';
  points: Point[];
}

export interface Brush {
  color: string;
  fillColor: string;
  size: number;
  mode: 'stroke' | 'fill' | 'both';
}

export interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameState {
  // Drawing state
  strokes: Stroke[];
  addStroke: (s: Stroke) => void;
  updateStroke: (s: Stroke) => void;
  removeStrokeById: (id: string) => void;
  clearStrokes: () => void;
  undo: () => void;

  // Brush state
  brush: Brush;
  setBrush: (b: Brush) => void;

  // Game state
  gameStatus: 'waiting' | 'playing' | 'ended';
  currentRound: number;
  maxRounds: number;
  isGameStarted: boolean;
  isMyTurn: boolean;
  canDraw: boolean;

  // Game actions
  setGameStatus: (status: 'waiting' | 'playing' | 'ended') => void;
  setGameStarted: (started: boolean) => void;
  setMyTurn: (isMyTurn: boolean) => void;
  setRoundInfo: (currentRound: number, maxRounds: number) => void;

  // Drawing permissions
  setCanDraw: (canDraw: boolean) => void;

  // Reset game state
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Drawing state
  strokes: [],
  addStroke: (s) => set(state => ({ strokes: [...state.strokes, s] })),
  updateStroke: (s) => set(state => ({
    strokes: state.strokes.map(stroke => stroke.id === s.id ? s : stroke)
  })),
  removeStrokeById: (id) => set(state => ({ strokes: state.strokes.filter(s => s.id !== id) })),
  clearStrokes: () => set({ strokes: [] }),
  undo: () => set(state => ({ strokes: state.strokes.slice(0, -1) })),

  // Brush state
  brush: { color: '#000000', fillColor: '#ff0000', size: 4, mode: 'stroke' }, // mode: 'stroke' or 'fill'
  setBrush: (b) => set({ brush: b }),

  // Game state
  gameStatus: 'waiting', // waiting, playing, ended
  currentRound: 0,
  maxRounds: 3,
  isGameStarted: false,
  isMyTurn: false,
  canDraw: false,

  // Game actions
  setGameStatus: (status) => set({ gameStatus: status }),
  setGameStarted: (started) => set({ isGameStarted: started }),
  setMyTurn: (isMyTurn) => set({ isMyTurn, canDraw: isMyTurn }),
  setRoundInfo: (currentRound, maxRounds) => set({ currentRound, maxRounds }),

  // Drawing permissions
  setCanDraw: (canDraw) => set({ canDraw }),

  // Reset game state
  resetGame: () => set({
    strokes: [],
    gameStatus: 'waiting',
    currentRound: 0,
    isGameStarted: false,
    isMyTurn: false,
    canDraw: false
  })
}));
