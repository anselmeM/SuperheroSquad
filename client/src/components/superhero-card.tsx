import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type Superhero } from "@shared/schema";

interface SuperheroCardProps {
  hero: Superhero;
}

export function SuperheroCard({ hero }: SuperheroCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative">
        <img 
          src={hero.image.url} 
          alt={hero.name}
          className="object-cover w-full h-full"
        />
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
