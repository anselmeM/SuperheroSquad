import { useState, useEffect } from "react";
import { SuperheroCard } from "@/components/superhero-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, X, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Superhero } from "@shared/schema";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";
import { SearchParams } from "./search-bar";
import { Pagination } from "./pagination";

interface SuperheroGridProps {
  heroes: Superhero[];
  isLoading: boolean;
  error?: string;
  searchParams?: SearchParams;
  itemsPerPage?: number;
}

export function SuperheroGrid({ heroes, isLoading, error, searchParams, itemsPerPage = 8 }: SuperheroGridProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();
  const { toast } = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Reset to page 1 when search results change
  useEffect(() => {
    setCurrentPage(1);
  }, [heroes]);
  
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
    return (
      <div className="text-center py-12">
        <div className="mb-4 opacity-50">
          <img 
            src="https://www.superherodb.com/pictures2/portraits/10/100/1496.jpg" 
            alt="Search for heroes" 
            className="w-32 h-32 object-cover mx-auto rounded-full shadow-lg mb-4"
          />
        </div>
        <h3 className="text-xl font-bold mb-2">No heroes found</h3>
        <p className="text-muted-foreground">
          Try changing your search term or adjusting the filters
        </p>
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(heroes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleHeroes = heroes.slice(startIndex, endIndex);

  // Scroll to top when page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleHeroes.map((hero) => {
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
      
      {/* Pagination controls */}
      {heroes.length > itemsPerPage && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
      
      {/* Results summary */}
      <div className="text-center text-sm font-lato text-muted-foreground mt-4 animate-in fade-in duration-300">
        Showing <span className="font-major text-primary font-medium">{startIndex + 1} - {Math.min(endIndex, heroes.length)}</span> of <span className="font-major text-primary font-medium">{heroes.length}</span> heroes
      </div>
    </div>
  );
}