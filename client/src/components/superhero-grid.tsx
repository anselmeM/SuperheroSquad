import { useState, useEffect, memo, useCallback } from "react";
import { SuperheroCard } from "@/components/superhero-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
        // Set longer interval for check only when needed
        forceUpdate({});
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Remove the interval check as it's not needed with our optimized implementation
    // and was causing constant re-renders
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
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
      <Alert variant="destructive" className="max-w-3xl mx-auto mb-8">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="font-semibold">{typeof error === 'string' ? error.split(':')[0] || 'Error' : 'Search Error'}</div>
            <AlertDescription className="text-sm opacity-90">
              {typeof error === 'string' ? error : 'Failed to retrieve superheroes. Please try again later.'}
            </AlertDescription>
            {error.includes('API key') && (
              <div className="mt-2 text-xs px-3 py-2 bg-destructive/20 rounded-sm">
                <p className="font-medium">Possible API key issue detected</p>
                <p>The API key for the Superhero API may be invalid or expired. Please check your environment variables.</p>
              </div>
            )}
          </div>
        </div>
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

  // Create a memoized hero card component that only re-renders when its props change
  const MemoizedHeroCard = memo(({ hero, isCompared, isFav }: { 
    hero: Superhero; 
    isCompared: boolean; 
    isFav: boolean;
  }) => {
    // Memoize callback functions
    const handleToggleFavorite = useCallback(() => {
      return isFav ? removeFavorite(hero.id) : addFavorite(hero);
    }, [hero.id, isFav]);
    
    const handleToggleCompare = useCallback(() => {
      return handleCompareToggle(hero);
    }, [hero.id, hero.name]);
    
    return (
      <SuperheroCard 
        key={hero.id}
        hero={hero}
        isFavorite={isFav}
        onToggleFavorite={handleToggleFavorite}
        isInCompare={isCompared}
        onToggleCompare={handleToggleCompare}
      />
    );
  });
  
  // Display name for debugging
  MemoizedHeroCard.displayName = 'MemoizedHeroCard';
  
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleHeroes.map((hero) => {
          const isCompared = isInCompare(hero.id);
          const isFav = isFavorite(hero.id);
          
          // Remove console.log in production
          // console.log(`Rendering hero ${hero.name}, isInCompare:`, isCompared);
          
          return (
            <MemoizedHeroCard 
              key={hero.id}
              hero={hero}
              isCompared={isCompared}
              isFav={isFav}
            />
          );
        })}
      </div>
      
      {/* Pagination section with separator */}
      {heroes.length > itemsPerPage && (
        <>
          <div className="mt-12 mb-6 flex items-center">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
            <div className="mx-4 text-primary/70 font-major tracking-widest text-xs uppercase">Navigate Pages</div>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
      
      {/* Results summary - enhanced style */}
      <div className="flex justify-center mt-2 animate-in fade-in duration-300">
        <div className="inline-flex items-center bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full border shadow-sm">
          <span className="text-sm font-lato text-muted-foreground mr-2">Showing</span>
          <span className="font-major text-primary font-medium px-1.5 py-0.5 rounded bg-primary/10 mx-1">{startIndex + 1} - {Math.min(endIndex, heroes.length)}</span>
          <span className="text-sm font-lato text-muted-foreground mx-1">of</span>
          <span className="font-major text-primary font-medium px-1.5 py-0.5 rounded bg-primary/10 mx-1">{heroes.length}</span>
          <span className="text-sm font-lato text-muted-foreground ml-1">heroes</span>
        </div>
      </div>
    </div>
  );
}