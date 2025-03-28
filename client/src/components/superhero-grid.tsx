import { useState, useEffect } from "react";
import { SuperheroCard } from "@/components/superhero-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type Superhero } from "@shared/schema";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";

interface SuperheroGridProps {
  heroes: Superhero[];
  isLoading: boolean;
  error?: string;
}

export function SuperheroGrid({ heroes, isLoading, error }: SuperheroGridProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();
  const { toast } = useToast();
  
  // Force update state to trigger re-renders when compare state changes
  const [, forceUpdate] = useState({});
  
  // Set up an effect to re-render when the compare list changes
  useEffect(() => {
    // Listen for localStorage changes related to compare list
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'superhero-compare') {
        console.log('Detected compare list change in localStorage');
        forceUpdate({});
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check every second for changes to ensure UI stays in sync
    const interval = setInterval(() => {
      forceUpdate({});
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  const handleCompareToggle = (hero: Superhero) => {
    console.log('Toggling compare for hero:', hero.name);
    
    // Determine if the hero is currently in the compare list
    const currentlyInCompare = isInCompare(hero.id);
    
    if (currentlyInCompare) {
      removeFromCompare(hero.id);
      toast({
        title: "Removed from comparison",
        description: `${hero.name} has been removed from comparison.`,
      });
    } else {
      if (!canAddMore) {
        toast({
          variant: "destructive",
          title: "Compare limit reached",
          description: "You can only compare up to 3 heroes at a time. Remove a hero first.",
        });
        return;
      }
      addToCompare(hero);
      toast({
        title: "Added to comparison",
        description: `${hero.name} has been added to comparison.`,
      });
    }
    
    // Force component update after state change
    setTimeout(() => forceUpdate({}), 0);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-square" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-2" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (heroes.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {heroes.map((hero) => {
        const isCompared = isInCompare(hero.id);
        console.log(`Rendering hero ${hero.name}, isInCompare:`, isCompared);

        return (
          <SuperheroCard 
            // Use a key that includes the compare state to force re-render when it changes
            key={`${hero.id}-${isCompared ? 'compared' : 'not-compared'}`} 
            hero={hero}
            isFavorite={isFavorite(hero.id)}
            onToggleFavorite={() => 
              isFavorite(hero.id) 
                ? removeFavorite(hero.id)
                : addFavorite(hero)
            }
            isInCompare={isCompared}
            onToggleCompare={() => handleCompareToggle(hero)}
          />
        );
      })}
    </div>
  );
}