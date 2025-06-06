import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCompare } from "@/hooks/use-compare";
import { Link } from "wouter";
import { ArrowLeft, Database, X } from "lucide-react";
import { type PowerStats, type Superhero } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareButtons } from "@/components/share-buttons";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4 w-full justify-center md:justify-start">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bangers bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent tracking-wide">
              Compare Heroes
            </h1>
          </div>
          <div className="flex gap-2 justify-center md:justify-end flex-wrap">
            <Link href="/favorites">
              <Button variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                Favorites
              </Button>
            </Link>
            {compareList.length > 0 && (
              <Button variant="outline" onClick={clearCompare}>
                Clear All
              </Button>
            )}
            <Link href="/dashboard">
              <Button variant="secondary" size="icon" className="bg-primary/10 hover:bg-primary/20">
                <Database className="h-4 w-4" />
                <span className="sr-only">Dashboard</span>
              </Button>
            </Link>
            <ThemeToggle />
            {compareList.length > 0 && (
              <ShareButtons 
                title="Superhero Comparison"
                description={`Check out this comparison of ${compareList.map(hero => hero.name).join(' vs ')}!`}
                hashtags={['superheroes', 'comparison', 'stats']}
              />
            )}
          </div>
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

            {/* Tabbed Comparison View */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-xl font-medium mb-6">Power Stats Comparison</h4>
                
                <Tabs defaultValue="radar" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="radar">Radar Chart</TabsTrigger>
                    <TabsTrigger value="bars">Bar Comparison</TabsTrigger>
                  </TabsList>
                  
                  {/* Radar Chart Tab */}
                  <TabsContent value="radar" className="w-full">
                    <div className="w-full h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          data={stats.map(stat => {
                            const statData: Record<string, any> = { stat: stat.charAt(0).toUpperCase() + stat.slice(1) };
                            compareList.forEach(hero => {
                              // Handle null or undefined stats
                              const statValue = hero.powerstats[stat];
                              // Only add defined values to the chart
                              if (statValue !== null && statValue !== undefined) {
                                statData[hero.name] = statValue;
                              }
                              // For null/undefined values, don't include the data point
                              // which will create a gap in the radar chart
                            });
                            return statData;
                          })}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="stat" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          
                          {compareList.map((hero, index) => {
                            // Generate a color based on the index
                            const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];
                            const color = colors[index % colors.length];
                            
                            return (
                              <Radar
                                key={hero.id}
                                name={hero.name}
                                dataKey={hero.name}
                                stroke={color}
                                fill={color}
                                fillOpacity={0.2}
                                // Set connectNulls to false to show gaps for unknown stats
                                connectNulls={false}
                              />
                            );
                          })}
                          <Tooltip />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-6 text-sm text-muted-foreground">
                      <p>The radar chart shows all stats for each hero, making it easy to visualize their overall profile and strengths at a glance.</p>
                    </div>
                  </TabsContent>
                  
                  {/* Bar Comparison Tab */}
                  <TabsContent value="bars">
                    <div className="space-y-8">
                      {stats.map((stat) => (
                        <div key={stat} className="mb-6">
                          <h4 className="capitalize text-lg font-medium mb-4">{stat}</h4>
                          <div className="space-y-4">
                            {compareList.map((hero) => {
                              const statValue = hero.powerstats[stat];
                              const isUnknown = statValue === null || statValue === undefined;
                              
                              return (
                                <div key={`${hero.id}-${stat}`}>
                                  <div className="flex justify-between text-sm mb-2">
                                    <span>{hero.name}</span>
                                    <span>
                                      {isUnknown ? (
                                        <span className="italic text-muted-foreground">Unknown</span>
                                      ) : (
                                        `${statValue}%`
                                      )}
                                    </span>
                                  </div>
                                  {isUnknown ? (
                                    <div className="h-2 w-full bg-muted relative rounded-full overflow-hidden">
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-full w-full bg-muted-foreground/20 flex items-center justify-center">
                                          <div className="h-[1px] w-full bg-muted-foreground/40"></div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <Progress
                                      value={Number(statValue)}
                                      className="h-2"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 text-sm text-muted-foreground">
                      <p>The bar view provides a direct side-by-side comparison of each individual stat.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}