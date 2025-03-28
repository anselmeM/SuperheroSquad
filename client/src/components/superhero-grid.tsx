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

  const handleCompareToggle = (hero: Superhero) => {
    console.log('Toggling compare for hero:', hero.name);
    if (isInCompare(hero.id)) {
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