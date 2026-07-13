import { create } from 'zustand';

interface MarketState {
  market: 'tw' | 'us' | 'jp';
  setMarket: (m: 'tw' | 'us' | 'jp') => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  market: 'tw',
  setMarket: (market) => set({ market }),
}));
