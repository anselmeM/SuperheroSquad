import { useState, useEffect } from 'react';
import { type Superhero } from '@shared/schema';

const COMPARE_KEY = 'superhero-compare';
const MAX_COMPARE = 3; // Maximum number of heroes to compare

export function useCompare() {
  const [compareList, setCompareList] = useState<Superhero[]>(() => {
    const saved = localStorage.getItem(COMPARE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
  }, [compareList]);

  const addToCompare = (hero: Superhero) => {
    setCompareList(prev => {
      if (prev.some(h => h.id === hero.id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, hero];
    });
  };

  const removeFromCompare = (heroId: string) => {
    setCompareList(prev => prev.filter(h => h.id !== heroId));
  };

  const isInCompare = (heroId: string) => {
    return compareList.some(h => h.id === heroId);
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    isInCompare,
    clearCompare,
    canAddMore: compareList.length < MAX_COMPARE
  };
}
