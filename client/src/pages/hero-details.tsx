
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type Superhero } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatBar } from "@/components/stat-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function HeroDetails() {
  const [, params] = useRoute("/hero/:id");
  const heroId = params?.id;

  const { data: hero, isLoading, error } = useQuery<Superhero>({
    queryKey: ["/api/hero", heroId],
    queryFn: () => fetch(`/api/hero/${heroId}`).then((res) => res.json()),
    enabled: !!heroId,
  });

  if (isLoading) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load hero details</AlertDescription>
      </Alert>
    );
  }

  if (!hero) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Hero not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square relative">
            <img 
              src={hero.image.url} 
              alt={hero.name}
              className="object-cover w-full h-full rounded-lg"
            />
          </div>
          <div>
            <CardHeader>
              <h1 className="text-3xl font-bold">{hero.name}</h1>
              <p className="text-sm text-muted-foreground">ID: {hero.id}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Power Stats</h2>
                  <div className="space-y-2">
                    <StatBar label="Intelligence" value={hero.powerstats.intelligence} />
                    <StatBar label="Strength" value={hero.powerstats.strength} />
                    <StatBar label="Speed" value={hero.powerstats.speed} />
                    <StatBar label="Durability" value={hero.powerstats.durability} />
                    <StatBar label="Power" value={hero.powerstats.power} />
                    <StatBar label="Combat" value={hero.powerstats.combat} />
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
