import { useState, useEffect } from 'react';
import { type Superhero } from '@shared/schema';

const COMPARE_KEY = 'superhero-compare';
const MAX_COMPARE = 3; // Maximum number of heroes to compare

// Enhanced version of the hero object that ensures powerstats are handled correctly
const ensureValidSuperhero = (hero: Superhero): Superhero => {
  // Make sure powerstats object exists at minimum
  const powerstats = hero.powerstats || {};
  
  // Helper function to parse stats properly
  const parseStat = (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined || value === "") return null;
    
    // If it's already a number, return it
    if (typeof value === 'number') return value;
    
    // Try to parse string to number
    const parsed = Number(value);
    
    // Check if the parsed value is a valid number
    return isNaN(parsed) ? null : parsed;
  };

  return {
    ...hero,
    powerstats: {
      intelligence: parseStat(powerstats.intelligence),
      strength: parseStat(powerstats.strength),
      speed: parseStat(powerstats.speed), 
      durability: parseStat(powerstats.durability),
      power: parseStat(powerstats.power),
      combat: parseStat(powerstats.combat)
    }
  };
};

export function useCompare() {
  const [compareList, setCompareList] = useState<Superhero[]>(() => {
    try {
      const saved = localStorage.getItem(COMPARE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      // Ensure each hero in the compare list has valid powerstats
      const validatedList = parsed.map(ensureValidSuperhero);
      console.log('Initial compare list:', validatedList);
      return validatedList;
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
      // Ensure the hero has valid powerstats before adding
      const validHero = ensureValidSuperhero(hero);
      const newList = [...prev, validHero];
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