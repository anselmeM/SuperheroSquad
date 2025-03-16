import { useState, useEffect } from 'react';
import { type Favorite, type Superhero } from '@shared/schema';

const FAVORITES_KEY = 'superhero-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (hero: Superhero) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === hero.id)) return prev;
      
      const newFavorite: Favorite = {
        id: hero.id,
        name: hero.name,
        imageUrl: hero.image.url,
        addedAt: new Date().toISOString()
      };
      
      return [...prev, newFavorite];
    });
  };

  const removeFavorite = (heroId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== heroId));
  };

  const isFavorite = (heroId: string) => {
    return favorites.some(f => f.id === heroId);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite
  };
}
