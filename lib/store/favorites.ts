import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 本地收藏（Supabase 未設定或未登入時的 fallback）
 */
interface LocalFavoritesState {
  symbols: string[];
  toggle: (symbol: string) => void;
  has: (symbol: string) => boolean;
  clear: () => void;
}

export const useLocalFavorites = create<LocalFavoritesState>()(
  persist(
    (set, get) => ({
      symbols: [],
      toggle: (symbol) =>
        set((s) => ({
          symbols: s.symbols.includes(symbol)
            ? s.symbols.filter((x) => x !== symbol)
            : [...s.symbols, symbol],
        })),
      has: (symbol) => get().symbols.includes(symbol),
      clear: () => set({ symbols: [] }),
    }),
    { name: 'aistockmap-local-favorites' }
  )
);
