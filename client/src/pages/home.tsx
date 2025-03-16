import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SearchBar, type SearchParams } from "@/components/search-bar";
import { SuperheroGrid } from "@/components/superhero-grid";
import { type SearchResponse, type Superhero } from "@shared/schema";
import { Heart, BarChart2 } from "lucide-react";
import { useCompare } from "@/hooks/use-compare";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    term: "",
    filters: {
      minIntelligence: 0,
      minStrength: 0,
      minSpeed: 0,
      minPower: 0,
    },
  });

  const { compareList } = useCompare();

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/search", searchParams.term],
    queryFn: () =>
      fetch(`/api/search?query=${encodeURIComponent(searchParams.term)}`).then((res) =>
        res.json()
      ),
    enabled: searchParams.term.length > 0,
  });

  // Filter heroes based on power stats
  const filteredHeroes = data?.results?.filter((hero: Superhero) => {
    const { filters } = searchParams;
    return (
      hero.powerstats.intelligence >= (filters.minIntelligence || 0) &&
      hero.powerstats.strength >= (filters.minStrength || 0) &&
      hero.powerstats.speed >= (filters.minSpeed || 0) &&
      hero.powerstats.power >= (filters.minPower || 0)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Superhero Search
          </h1>
          <div className="flex gap-2">
            {compareList.length > 0 && (
              <Link href="/compare">
                <Button variant="outline" className="animate-in fade-in duration-300">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  Compare ({compareList.length})
                </Button>
              </Link>
            )}
            <Link href="/favorites">
              <Button variant="outline">
                <Heart className="mr-2 h-4 w-4" />
                Favorites
              </Button>
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <SearchBar onSearch={setSearchParams} isLoading={isLoading} />
        </div>

        <SuperheroGrid
          heroes={filteredHeroes || []}
          isLoading={isLoading}
          error={error?.message || data?.error}
        />
      </main>
    </div>
  );
}