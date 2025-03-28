import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, BarChart2, Shield, Zap } from "lucide-react";
import { type Superhero } from "@shared/schema";
import { Link } from "wouter";

// Helper function to calculate the total power of a hero
function calculateTotalPower(powerstats: Superhero['powerstats']): number {
  const total = Object.values(powerstats).reduce((sum, value) => {
    return sum + Number(value);
  }, 0);
  return Math.round(total / 6); // Average of all stats
}

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
      <Progress 
        value={value} 
        className="h-2 transition-all duration-500 group-hover:h-3" 
      />
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
    <div className="group">
      <Link href={`/hero/${hero.id}`}>
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group-hover:scale-[1.02]">
          <div className="aspect-square relative">
            <img 
              src={hero.image.url} 
              alt={hero.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            {/* Publisher badge */}
            {hero.biography?.publisher && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm font-semibold"
              >
                {hero.biography.publisher}
              </Badge>
            )}
            
            {/* Alignment badge */}
            {hero.biography?.alignment && (
              <Badge 
                variant={hero.biography.alignment === "good" ? "default" : "destructive"} 
                className={`absolute bottom-2 left-2 ${
                  hero.biography.alignment === "good" 
                    ? "bg-emerald-500/80" 
                    : hero.biography.alignment === "bad" 
                      ? "bg-rose-500/80" 
                      : "bg-blue-500/80"
                } backdrop-blur-sm transition-all duration-300 flex items-center gap-1`}
              >
                {hero.biography.alignment === "good" ? (
                  <Shield className="h-3 w-3" />
                ) : hero.biography.alignment === "bad" ? (
                  <Zap className="h-3 w-3" />
                ) : null}
                {hero.biography.alignment.charAt(0).toUpperCase() + hero.biography.alignment.slice(1)}
              </Badge>
            )}
            
            <div className="absolute top-2 right-2 flex gap-2">
              {onToggleCompare && (
                <Button
                  variant={isInCompare ? "secondary" : "ghost"}
                  size="icon"
                  className={`${isInCompare ? 'bg-primary text-white border-primary' : 'bg-background/70 backdrop-blur-sm text-foreground hover:bg-background/90'} transition-all duration-200 shadow-sm`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleCompare();
                  }}
                >
                  <BarChart2 className={`h-5 w-5 ${isInCompare ? 'fill-white' : ''} transition-all duration-200`} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`${isFavorite ? 'text-red-500 bg-background/70 backdrop-blur-sm hover:bg-background/90' : 'bg-background/70 backdrop-blur-sm text-foreground hover:bg-background/90'} transition-all duration-200 shadow-sm`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''} transition-all duration-200`} />
              </Button>
            </div>
          </div>
          <CardHeader className="pb-2">
            <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{hero.name}</h3>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">ID: {hero.id}</p>
              <div className="flex gap-1">
                {hero.powerstats && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Power: {calculateTotalPower(hero.powerstats)}
                  </Badge>
                )}
              </div>
            </div>
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