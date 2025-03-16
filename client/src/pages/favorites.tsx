import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SuperheroCard } from "@/components/superhero-card";
import { useFavorites } from "@/hooks/use-favorites";
import { ArrowLeft } from "lucide-react";

export default function Favorites() {
  const { favorites, removeFavorite } = useFavorites();

  return (
    <div className="min-h-screen bg-background">
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
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
