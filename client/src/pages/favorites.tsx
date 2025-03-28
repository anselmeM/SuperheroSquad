import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SuperheroCard } from "@/components/superhero-card";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BarChart2 } from "lucide-react";

export default function Favorites() {
  const { favorites, removeFavorite } = useFavorites();
  const { compareList, isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background relative">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Favorite Heroes
          </h1>
        </div>

        {favorites.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No favorite heroes yet</p>
            <Link href="/">
              <Button>Search Heroes</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => {
              const hero = {
                id: favorite.id,
                name: favorite.name,
                image: { url: favorite.imageUrl },
                powerstats: {
                  intelligence: 0,
                  strength: 0,
                  speed: 0,
                  durability: 0,
                  power: 0,
                  combat: 0
                }
              };
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
      
      {/* Floating Compare Button */}
      {compareList.length > 0 && (
        <Link href="/compare">
          <Button 
            className="fixed bottom-6 right-6 rounded-full shadow-lg animate-in fade-in zoom-in duration-300 z-50"
            size="lg"
          >
            <BarChart2 className="mr-2 h-5 w-5" />
            Compare Heroes ({compareList.length})
          </Button>
        </Link>
      )}
    </div>
  );
}
