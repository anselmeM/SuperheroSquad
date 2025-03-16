import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Heart, BarChart2 } from "lucide-react";
import { type Superhero } from "@shared/schema";

interface SuperheroCardProps {
  hero: Superhero;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onToggleCompare?: () => void;
  isInCompare?: boolean;
}

export function SuperheroCard({ 
  hero, 
  isFavorite, 
  onToggleFavorite,
  onToggleCompare,
  isInCompare 
}: SuperheroCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative">
        <img 
          src={hero.image.url} 
          alt={hero.name}
          className="object-cover w-full h-full"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          {onToggleCompare && (
            <Button
              variant={isInCompare ? "default" : "ghost"}
              size="icon"
              className={`transition-colors duration-200 ${
                isInCompare ? 'bg-primary text-primary-foreground' : 'text-gray-500 hover:text-primary'
              }`}
              onClick={onToggleCompare}
            >
              <BarChart2 className="h-6 w-6" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`${isFavorite ? 'text-red-500' : 'text-gray-500'}`}
            onClick={onToggleFavorite}
          >
            <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
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
  );
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