import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, BarChart2, Users, Briefcase, MapPin, Book } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFavorites } from "@/hooks/use-favorites";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { Superhero } from "@shared/schema";

export default function HeroDetail() {
  const [, params] = useRoute("/hero/:id");
  const heroId = params?.id || "";
  const [hero, setHero] = useState<Superhero | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();
  const { toast } = useToast();
  
  const isFavorite = favorites.some(fav => fav.id === heroId);

  useEffect(() => {
    const fetchHero = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/hero/${heroId}`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else if (data.id) {
          setHero(data);
        } else {
          setError("Failed to fetch hero details");
        }
      } catch (err) {
        setError("An error occurred while fetching hero details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHero();
  }, [heroId]);

  const handleToggleFavorite = () => {
    if (hero) {
      if (isFavorite) {
        removeFavorite(hero.id);
        toast({
          title: "Removed from favorites",
          description: `${hero.name} has been removed from your favorites.`,
        });
      } else {
        addFavorite(hero);
        toast({
          title: "Added to favorites",
          description: `${hero.name} has been added to your favorites.`,
        });
      }
    }
  };

  const handleToggleCompare = () => {
    if (hero) {
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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !hero) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Error loading hero</h1>
        <p className="text-muted-foreground mb-6">{error || "Hero not found"}</p>
        <Link href="/">
          <Button>Back to Search</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              {hero.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={isFavorite ? "text-red-500" : ""}
              onClick={handleToggleFavorite}
            >
              <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            </Button>
            <Button
              variant={isInCompare(hero.id) ? "default" : "outline"}
              onClick={handleToggleCompare}
            >
              <BarChart2 className="mr-2 h-5 w-5" />
              {isInCompare(hero.id) ? "Remove from Compare" : "Add to Compare"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <Card>
              <div className="aspect-square relative">
                <img
                  src={hero.image.url}
                  alt={hero.name}
                  className="object-cover w-full h-full"
                />
              </div>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Power Stats</h3>
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
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="biography" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="biography">Biography</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="work">Work</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
              </TabsList>
              
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <TabsContent value="biography" className="space-y-4">
                    <h2 className="text-2xl font-bold">Biography</h2>
                    {hero.biography ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoItem label="Full Name" value={hero.biography["full-name"]} />
                          <InfoItem label="Alter Egos" value={hero.biography["alter-egos"]} />
                          <InfoItem label="Place of Birth" value={hero.biography["place-of-birth"]} />
                          <InfoItem label="First Appearance" value={hero.biography["first-appearance"]} />
                          <InfoItem label="Publisher" value={hero.biography.publisher} />
                          <InfoItem label="Alignment" value={hero.biography.alignment} />
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="text-lg font-semibold mb-2">Aliases</h3>
                          <div className="flex flex-wrap gap-2">
                            {hero.biography.aliases.map((alias: string, index: number) => (
                              <Badge key={index} variant="secondary">{alias}</Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Biography information not available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="appearance" className="space-y-4">
                    <h2 className="text-2xl font-bold">Appearance</h2>
                    {hero.appearance ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem label="Gender" value={hero.appearance.gender} />
                        <InfoItem label="Race" value={hero.appearance.race} />
                        <InfoItem label="Height" value={hero.appearance.height.join(" / ")} />
                        <InfoItem label="Weight" value={hero.appearance.weight.join(" / ")} />
                        <InfoItem label="Eye Color" value={hero.appearance["eye-color"]} />
                        <InfoItem label="Hair Color" value={hero.appearance["hair-color"]} />
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Appearance information not available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="work" className="space-y-4">
                    <h2 className="text-2xl font-bold">Work</h2>
                    {hero.work ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Occupation
                          </h3>
                          <p className="text-muted-foreground mt-1">{hero.work.occupation || "Unknown"}</p>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Base
                          </h3>
                          <p className="text-muted-foreground mt-1">{hero.work.base || "Unknown"}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Work information not available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="connections" className="space-y-4">
                    <h2 className="text-2xl font-bold">Connections</h2>
                    {hero.connections ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Group Affiliation
                          </h3>
                          <p className="text-muted-foreground mt-1">{hero.connections["group-affiliation"] || "None"}</p>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Book className="h-5 w-5" />
                            Relatives
                          </h3>
                          <ScrollArea className="h-[200px] rounded-md border p-4">
                            <p className="text-muted-foreground">{hero.connections.relatives || "None known"}</p>
                          </ScrollArea>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Connection information not available</p>
                    )}
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
      <p className="text-base">{value || "Unknown"}</p>
      <Separator className="mt-1" />
    </div>
  );
}