import { useState, useEffect, useCallback, useMemo } from 'react';
import { type Superhero } from '@shared/schema';
import { createLogger } from '@/utils/config';

const COMPARE_KEY = 'superhero-compare';
const MAX_COMPARE = 3; // Maximum number of heroes to compare

// Create a structured logger for the compare functionality
const logger = createLogger('compare');

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
      logger.debug(`Loaded ${validatedList.length} heroes into compare list from localStorage`);
      return validatedList;
    } catch (error) {
      logger.error('Failed to load compare list from localStorage', error);
      return [];
    }
  });
  
  // Create a memoized Set of hero IDs for faster lookups
  const compareIdSet = useMemo(() => {
    return new Set(compareList.map(hero => hero.id));
  }, [compareList]);

  // Save compareList to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
      logger.debug(`Saved ${compareList.length} heroes to compare list in localStorage`);
    } catch (error) {
      logger.error('Failed to save compare list to localStorage:', error);
    }
  }, [compareList]);

  // Memoized function to add a hero to the compare list
  const addToCompare = useCallback((hero: Superhero) => {
    logger.debug('Attempting to add hero to compare:', hero.name);
    setCompareList(prev => {
      // Use the Set for a faster check of existence
      if (compareIdSet.has(hero.id)) {
        logger.debug('Hero already in compare list');
        return prev;
      }
      
      if (prev.length >= MAX_COMPARE) {
        logger.debug('Compare list full');
        return prev;
      }
      
      // Ensure the hero has valid powerstats before adding
      const validHero = ensureValidSuperhero(hero);
      logger.info(`Added hero to compare: ${hero.name}`);
      return [...prev, validHero];
    });
  }, [compareIdSet]);  // Only depends on the ID set, not the full list

  // Memoized function to remove a hero from the compare list
  const removeFromCompare = useCallback((heroId: string) => {
    logger.debug('Removing hero from compare:', heroId);
    setCompareList(prev => {
      const heroToRemove = prev.find(h => h.id === heroId);
      const result = prev.filter(h => h.id !== heroId);
      if (result.length !== prev.length) {
        logger.info(`Removed hero from compare: ${heroToRemove?.name || heroId}`);
      } else {
        logger.warn(`Attempted to remove non-existent hero ID from compare: ${heroId}`);
      }
      return result;
    });
  }, []);  // No dependencies as it just uses the heroId parameter

  // Highly optimized function to check if a hero is in the compare list
  const isInCompare = useCallback((heroId: string): boolean => {
    const result = compareIdSet.has(heroId);
    logger.debug(`Checking if hero ${heroId} is in compare: ${result}`);
    return result;
  }, [compareIdSet]);  // Only depends on the ID set which only changes when heroes are added/removed

  // Memoized function to clear the compare list
  const clearCompare = useCallback(() => {
    logger.debug('Clearing compare list for hero comparison');
    setCompareList([]);
  }, []);

  // Memoize these derived values to prevent recalculation on every render
  const compareInfo = useMemo(() => ({
    canAddMore: compareList.length < MAX_COMPARE,
    count: compareList.length
  }), [compareList.length]);

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    isInCompare,
    clearCompare,
    canAddMore: compareInfo.canAddMore,
    compareCount: compareInfo.count  // New property for easier access to count
  };
}