import { SuperheroCard } from "@/components/superhero-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type Superhero } from "@shared/schema";
import { useFavorites } from "@/hooks/use-favorites";

interface SuperheroGridProps {
  heroes: Superhero[];
  isLoading: boolean;
  error?: string;
}

export function SuperheroGrid({ heroes, isLoading, error }: SuperheroGridProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();

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
      {heroes.map((hero) => (
        <SuperheroCard 
          key={hero.id} 
          hero={hero}
          isFavorite={isFavorite(hero.id)}
          onToggleFavorite={() => 
            isFavorite(hero.id) 
              ? removeFavorite(hero.id)
              : addFavorite(hero)
          }
        />
      ))}
    </div>
  );
}