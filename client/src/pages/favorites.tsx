import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SuperheroCard } from "@/components/superhero-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BarChart2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type Superhero } from "@shared/schema";
import { useState, useEffect } from "react";

export default function Favorites() {
  const { favorites, removeFavorite } = useFavorites();
  const { compareList, isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();
  const { toast } = useToast();
  const [favoriteHeroes, setFavoriteHeroes] = useState<{ [key: string]: Superhero | null }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch hero data for each favorite
  useEffect(() => {
    const fetchHeroData = async () => {
      if (favorites.length === 0) return;

      setIsLoading(true);
      const heroData: { [key: string]: Superhero | null } = { ...favoriteHeroes };

      // Only fetch for heroes we don't already have
      const heroesToFetch = favorites.filter(fav => !heroData[fav.id]);

      if (heroesToFetch.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        await Promise.all(
          heroesToFetch.map(async (favorite) => {
            try {
              const response = await fetch(`/api/hero/${favorite.id}`);
              if (!response.ok) {
                throw new Error(`Failed to fetch hero with ID: ${favorite.id}`);
              }
              const data = await response.json();
              heroData[favorite.id] = data;
            } catch (error) {
              console.error(`Error fetching hero ${favorite.id}:`, error);
              // If we can't fetch the hero, create a placeholder with minimal data
              heroData[favorite.id] = {
                id: favorite.id,
                name: favorite.name,
                image: { url: favorite.imageUrl },
                powerstats: {
                  intelligence: "50",
                  strength: "50",
                  speed: "50",
                  durability: "50",
                  power: "50",
                  combat: "50"
                }
              } as unknown as Superhero;
            }
          })
        );

        setFavoriteHeroes(heroData);
      } catch (error) {
        console.error("Error fetching hero data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeroData();
  }, [favorites]);

  // Create a loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="bg-muted animate-pulse h-40 rounded-md"></div>
      <div className="space-y-2">
        <div className="bg-muted animate-pulse h-6 rounded-md w-2/3"></div>
        <div className="bg-muted animate-pulse h-4 rounded-md w-1/2"></div>
        <div className="bg-muted animate-pulse h-2 rounded-md"></div>
        <div className="bg-muted animate-pulse h-2 rounded-md"></div>
        <div className="bg-muted animate-pulse h-2 rounded-md"></div>
        <div className="bg-muted animate-pulse h-2 rounded-md"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4 w-full justify-center md:justify-start">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bangers bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent tracking-wide">
              Favorite Heroes
            </h1>
          </div>
          <div className="flex gap-2 justify-center md:justify-end">
            <Link href="/compare">
              <Button 
                variant={compareList.length > 0 ? "default" : "outline"}
                className={`animate-in fade-in duration-300 ${compareList.length === 0 ? 'opacity-50' : ''}`}
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                Compare {compareList.length > 0 ? `(${compareList.length})` : ''}
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {favorites.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No favorite heroes yet</p>
            <Link href="/">
              <Button>Search Heroes</Button>
            </Link>
          </Card>
        ) : isLoading ? (
          // Show loading skeletons while fetching data
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: favorites.length }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => {
              const hero = favoriteHeroes[favorite.id] || {
                id: favorite.id,
                name: favorite.name,
                image: { url: favorite.imageUrl },
                powerstats: {
                  intelligence: "50",
                  strength: "50",
                  speed: "50",
                  durability: "50",
                  power: "50",
                  combat: "50"
                }
              } as unknown as Superhero;

              return (
                <SuperheroCard
                  key={hero.id}
                  hero={hero}
                  isFavorite={true}
                  onToggleFavorite={() => removeFavorite(hero.id)}
                  isInCompare={isInCompare(hero.id)}
                  onToggleCompare={() => {
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
                  }}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
