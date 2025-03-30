import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
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
import { ShareButtons } from "@/components/share-buttons";
import type { Superhero } from "@shared/schema";
import NotFound from "./not-found";

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
      setError(null); // Reset error state on each fetch
      
      try {
        const response = await fetch(`/api/hero/${heroId}`);
        const data = await response.json();
        
        // Check if the response was not ok (non-200 status)
        if (!response.ok) {
          // Format the error message using both error and message fields if available
          const errorMessage = data.message 
            ? `${data.error}: ${data.message}` 
            : data.error || `Error ${response.status}: ${response.statusText}`;
          
          setError(errorMessage);
          
          // Log additional details for monitoring/debugging
          console.error('Hero fetch error:', {
            status: response.status,
            statusText: response.statusText,
            errorData: data
          });
          
          return; // Exit early since we have an error
        }
        
        if (data.id) {
          setHero(data);
        } else {
          setError("Hero data is incomplete or invalid");
        }
      } catch (err: any) {
        // Handle network or parsing errors
        const errorMessage = err.message || "An unexpected error occurred";
        setError(`Failed to load hero: ${errorMessage}`);
        console.error('Hero fetch exception:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a hero ID
    if (heroId) {
      fetchHero();
    } else {
      setError("No hero ID provided");
      setLoading(false);
    }
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
    // Use our custom NotFound component for a better user experience
    return <NotFound heroError={error || "Hero not found"} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4 w-full justify-center md:justify-start">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bangers bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent tracking-wide">
              {hero.name}
            </h1>
          </div>
          <div className="flex gap-2 justify-center md:justify-end flex-wrap">
            <Button
              variant="outline"
              className={isFavorite ? "text-red-500" : ""}
              onClick={handleToggleFavorite}
            >
              <Heart className={`mr-2 h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
              <span className="sm:hidden">{isFavorite ? "Unfavorite" : "Favorite"}</span>
            </Button>
            <Button
              variant={isInCompare(hero.id) ? "default" : "outline"}
              onClick={handleToggleCompare}
            >
              <BarChart2 className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">{isInCompare(hero.id) ? "Remove from Compare" : "Add to Compare"}</span>
              <span className="sm:hidden">{isInCompare(hero.id) ? "Uncompare" : "Compare"}</span>
            </Button>
            <ThemeToggle />
            <ShareButtons 
              title={`${hero.name} - Superhero Profile`}
              description={`Check out ${hero.name}'s superhero profile and stats!`}
              imageUrl={hero.image.url}
            />
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

function StatBar({ label, value }: { label: string; value: string | number | null | undefined }) {
  // Check if the value is missing
  const isUnknown = value === null || value === undefined;
  
  // Convert value to number for UI display and progress bar
  const numericValue = isUnknown ? 0 : (typeof value === 'string' ? parseInt(value) || 0 : value);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isUnknown ? "italic text-muted-foreground" : ""}>
          {isUnknown ? "Unknown" : `${numericValue}%`}
        </span>
      </div>
      {isUnknown ? (
        <div className="h-2 w-full bg-muted relative rounded-full overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-full bg-muted-foreground/10 flex items-center justify-center">
              <div className="h-[1px] w-full bg-muted-foreground/30 border-dashed border-t border-muted-foreground/50"></div>
            </div>
          </div>
        </div>
      ) : (
        <Progress value={numericValue} className="h-2" />
      )}
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