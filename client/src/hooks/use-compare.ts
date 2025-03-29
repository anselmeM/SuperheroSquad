import { useState, useEffect, useCallback } from 'react';
import { type Superhero } from '@shared/schema';

const COMPARE_KEY = 'superhero-compare';
const MAX_COMPARE = 3; // Maximum number of heroes to compare

/**
 * Helper function for development-only logging
 * Only logs in development environment
 */
const logDebug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Compare Hook]', ...args);
  }
};

/**
 * Helper function to parse stat values consistently
 * Handles various edge cases (null, undefined, empty strings, "null", NaN)
 * @param value The raw stat value to parse
 * @returns A valid number or null if the value is invalid/missing
 */
const parseStat = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "" || String(value).toLowerCase() === 'null') {
    return null;
  }
  
  // If it's already a number and not NaN, return it
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // Try to parse string to number
  const parsed = Number(value);
  
  // Check if the parsed value is a valid finite number
  return Number.isFinite(parsed) ? parsed : null; // Return null if not a finite number
};

/**
 * Ensures a superhero object has properly formatted powerstats
 * This prevents issues when displaying charts or comparing heroes
 * @param hero The superhero object to validate
 * @returns A superhero object with validated powerstats
 */
const ensureValidSuperhero = (hero: Superhero): Superhero => {
  // Make sure powerstats object exists at minimum
  const powerstats = hero.powerstats || {};
  
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
      return validatedList;
    } catch {
      console.error('Failed to load compare list from localStorage');
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
    } catch (error) {
      console.error('Failed to save compare list to localStorage:', error);
    }
  }, [compareList]);

  const addToCompare = useCallback((hero: Superhero) => {
    logDebug('Attempting to add hero to compare:', hero.name);
    setCompareList(prev => {
      if (prev.some(h => h.id === hero.id)) {
        logDebug('Hero already in compare list');
        return prev;
      }
      if (prev.length >= MAX_COMPARE) {
        logDebug('Compare list full');
        return prev;
      }
      // Ensure the hero has valid powerstats before adding
      const validHero = ensureValidSuperhero(hero);
      const newList = [...prev, validHero];
      return newList;
    });
  }, []);

  const removeFromCompare = useCallback((heroId: string) => {
    logDebug('Removing hero from compare:', heroId);
    setCompareList(prev => {
      const newList = prev.filter(h => h.id !== heroId);
      return newList;
    });
  }, []);

  const isInCompare = useCallback((heroId: string): boolean => {
    const result = compareList.some(h => h.id === heroId);
    return result;
  }, [compareList]);

  const clearCompare = useCallback(() => {
    logDebug('Clearing compare list');
    setCompareList([]);
  }, []);

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    isInCompare,
    clearCompare,
    canAddMore: compareList.length < MAX_COMPARE
  };
}