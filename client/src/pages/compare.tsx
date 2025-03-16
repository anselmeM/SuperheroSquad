import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCompare } from "@/hooks/use-compare";
import { Link } from "wouter";
import { ArrowLeft, X } from "lucide-react";
import { type PowerStats } from "@shared/schema";

export default function Compare() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  const stats: (keyof PowerStats)[] = [
    "intelligence",
    "strength",
    "speed",
    "durability",
    "power",
    "combat",
  ];

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
            Compare Heroes
          </h1>
          {compareList.length > 0 && (
            <Button variant="ghost" onClick={clearCompare} className="ml-auto">
              Clear All
            </Button>
          )}
        </div>

        {compareList.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              No heroes selected for comparison
            </p>
            <Link href="/">
              <Button>Select Heroes</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {compareList.map((hero) => (
                <Card key={hero.id} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeFromCompare(hero.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <CardContent className="pt-8">
                    <div className="aspect-square relative mb-4">
                      <img
                        src={hero.image.url}
                        alt={hero.name}
                        className="object-cover w-full h-full rounded-lg"
                      />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{hero.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="pt-6">
                {stats.map((stat) => (
                  <div key={stat} className="mb-6">
                    <h4 className="capitalize text-lg font-medium mb-4">{stat}</h4>
                    <div className="space-y-4">
                      {compareList.map((hero) => (
                        <div key={`${hero.id}-${stat}`}>
                          <div className="flex justify-between text-sm mb-2">
                            <span>{hero.name}</span>
                            <span>{hero.powerstats[stat]}%</span>
                          </div>
                          <Progress
                            value={hero.powerstats[stat]}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}