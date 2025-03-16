import { useState, useEffect } from 'react';
import { type Superhero } from '@shared/schema';

const COMPARE_KEY = 'superhero-compare';
const MAX_COMPARE = 3; // Maximum number of heroes to compare

export function useCompare() {
  const [compareList, setCompareList] = useState<Superhero[]>(() => {
    try {
      const saved = localStorage.getItem(COMPARE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      console.log('Initial compare list:', parsed);
      return parsed;
    } catch {
      console.error('Failed to load compare list from localStorage');
      return [];
    }
  });

  useEffect(() => {
    try {
      console.log('Saving compare list:', compareList);
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
    } catch (error) {
      console.error('Failed to save compare list to localStorage:', error);
    }
  }, [compareList]);

  const addToCompare = (hero: Superhero) => {
    console.log('Adding hero to compare:', hero.name);
    setCompareList(prev => {
      if (prev.some(h => h.id === hero.id)) {
        console.log('Hero already in compare list');
        return prev;
      }
      if (prev.length >= MAX_COMPARE) {
        console.log('Compare list full');
        return prev;
      }
      const newList = [...prev, hero];
      console.log('New compare list:', newList);
      return newList;
    });
  };

  const removeFromCompare = (heroId: string) => {
    console.log('Removing hero from compare:', heroId);
    setCompareList(prev => {
      const newList = prev.filter(h => h.id !== heroId);
      console.log('New compare list after removal:', newList);
      return newList;
    });
  };

  const isInCompare = (heroId: string): boolean => {
    const result = compareList.some(h => h.id === heroId);
    console.log(`Checking if hero ${heroId} is in compare:`, result);
    return result;
  };

  const clearCompare = () => {
    console.log('Clearing compare list');
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