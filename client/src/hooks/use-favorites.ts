import { useState, useEffect } from 'react';
import { type Favorite, type Superhero } from '@shared/schema';
import { createLogger } from '@/utils/config';

// Create a structured logger for the favorites functionality
const logger = createLogger('favorites');

const FAVORITES_KEY = 'superhero-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    const parsedFavorites = saved ? JSON.parse(saved) : [];
    logger.debug(`Loaded ${parsedFavorites.length} favorites from localStorage`);
    return parsedFavorites;
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    logger.debug(`Saved ${favorites.length} favorites to localStorage`);
  }, [favorites]);

  const addFavorite = (hero: Superhero) => {
    logger.debug(`Adding hero to favorites: ${hero.name} (${hero.id})`);
    setFavorites(prev => {
      if (prev.some(f => f.id === hero.id)) {
        logger.debug(`Hero ${hero.name} already in favorites, skipping`);
        return prev;
      }
      
      const newFavorite: Favorite = {
        id: hero.id,
        name: hero.name,
        imageUrl: hero.image.url,
        addedAt: new Date().toISOString()
      };
      
      logger.info(`Added hero to favorites: ${hero.name}`);
      return [...prev, newFavorite];
    });
  };

  const removeFavorite = (heroId: string) => {
    const heroToRemove = favorites.find(f => f.id === heroId);
    if (heroToRemove) {
      logger.debug(`Removing hero from favorites: ${heroToRemove.name} (${heroId})`);
    } else {
      logger.warn(`Attempted to remove non-existent hero ID: ${heroId}`);
    }
    
    setFavorites(prev => {
      const result = prev.filter(f => f.id !== heroId);
      if (result.length !== prev.length) {
        logger.info(`Removed hero from favorites: ${heroToRemove?.name || heroId}`);
      }
      return result;
    });
  };

  const isFavorite = (heroId: string) => {
    const result = favorites.some(f => f.id === heroId);
    logger.debug(`Checking if hero ${heroId} is favorite: ${result}`);
    return result;
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite
  };
}
