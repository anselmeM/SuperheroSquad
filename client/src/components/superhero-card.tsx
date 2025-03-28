import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Heart, BarChart2 } from "lucide-react";
import { type Superhero } from "@shared/schema";
import { Link } from "wouter";

interface SuperheroCardProps {
  hero: Superhero;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onToggleCompare?: () => void;
  isInCompare?: boolean;
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export function SuperheroCard({ 
  hero, 
  isFavorite, 
  onToggleFavorite,
  onToggleCompare,
  isInCompare 
}: SuperheroCardProps) {
  console.log(`SuperheroCard - Rendering ${hero.name}, isInCompare:`, isInCompare);

  return (
    <div>
      <Link href={`/hero/${hero.id}`}>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
          <div className="aspect-square relative">
            <img 
              src={hero.image.url} 
              alt={hero.name}
              className="object-cover w-full h-full"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              {onToggleCompare && (
                <Button
                  variant={isInCompare ? "secondary" : "ghost"}
                  size="icon"
                  className={`${isInCompare ? 'bg-primary text-white border-primary' : 'text-gray-500'} transition-colors duration-200`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleCompare();
                  }}
                >
                  <BarChart2 className={`h-6 w-6 ${isInCompare ? 'fill-white' : ''} transition-all duration-200`} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`${isFavorite ? 'text-red-500' : 'text-gray-500'} transition-colors duration-200`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''} transition-all duration-200`} />
              </Button>
            </div>
          </div>
          <CardHeader className="pb-2">
            <h3 className="text-xl font-semibold">{hero.name}</h3>
            <p className="text-sm text-muted-foreground">ID: {hero.id}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <StatBar label="Intelligence" value={hero.powerstats.intelligence} />
              <StatBar label="Strength" value={hero.powerstats.strength} />
              <StatBar label="Speed" value={hero.powerstats.speed} />
              <StatBar label="Durability" value={hero.powerstats.durability} />
              <StatBar label="Power" value={hero.powerstats.power} />
              <StatBar label="Combat" value={hero.powerstats.combat} />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}