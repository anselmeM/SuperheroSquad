import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar, type SearchParams } from "@/components/search-bar";
import { SuperheroGrid } from "@/components/superhero-grid";
import { ThemeToggle } from "@/components/theme-toggle";
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
      publisher: "",
      alignment: "",
      gender: "",
    },
  });

  const { compareList } = useCompare();
  console.log('Home component - compareList length:', compareList.length);

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/search", searchParams.term],
    queryFn: () =>
      fetch(`/api/search?query=${encodeURIComponent(searchParams.term)}`).then((res) =>
        res.json()
      ),
    enabled: searchParams.term.length > 0,
  });

  // Filter heroes based on all filters
  const filteredHeroes = data?.results?.filter((hero: Superhero) => {
    const { filters } = searchParams;
    
    // Check power stats filters
    const meetsStatRequirements = 
      hero.powerstats.intelligence >= (filters.minIntelligence || 0) &&
      hero.powerstats.strength >= (filters.minStrength || 0) &&
      hero.powerstats.speed >= (filters.minSpeed || 0) &&
      hero.powerstats.power >= (filters.minPower || 0);
    
    // Check publisher filter
    const meetsPublisherRequirement = 
      !filters.publisher || 
      (hero.biography && hero.biography.publisher.toLowerCase().includes(filters.publisher.toLowerCase()));
    
    // Check alignment filter
    const meetsAlignmentRequirement = 
      !filters.alignment || 
      (hero.biography && hero.biography.alignment.toLowerCase() === filters.alignment.toLowerCase());
    
    // Check gender filter
    const meetsGenderRequirement = 
      !filters.gender || 
      (hero.appearance && hero.appearance.gender.toLowerCase() === filters.gender.toLowerCase());
    
    return (
      meetsStatRequirements && 
      meetsPublisherRequirement && 
      meetsAlignmentRequirement && 
      meetsGenderRequirement
    );
  });

  // Compare button to be displayed next to Favorites
  const CompareButton = () => {
    console.log('Rendering CompareButton - compareList length:', compareList.length);
    
    return (
      <Link href="/compare">
        <Button 
          variant={compareList.length > 0 ? "default" : "outline"}
          className={`animate-in fade-in duration-300 ${compareList.length === 0 ? 'opacity-50' : ''}`}
        >
          <BarChart2 className="mr-2 h-4 w-4" />
          Compare {compareList.length > 0 ? `(${compareList.length})` : ''}
        </Button>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background relative">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Superhero Search
          </h1>
          <div className="flex gap-2">
            <CompareButton />
            <Link href="/favorites">
              <Button variant="outline">
                <Heart className="mr-2 h-4 w-4" />
                Favorites
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <SearchBar onSearch={setSearchParams} isLoading={isLoading} />
        </div>

        {/* Results section with improved UI */}
        {searchParams && filteredHeroes && filteredHeroes.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-bold">
                {filteredHeroes.length} Heroes Found
              </h2>
              
              {/* Only show Clear Filters button if at least one filter is active */}
              {(searchParams.filters.publisher || 
                searchParams.filters.alignment || 
                searchParams.filters.gender || 
                (searchParams.filters.minIntelligence && searchParams.filters.minIntelligence > 0) ||
                (searchParams.filters.minStrength && searchParams.filters.minStrength > 0) ||
                (searchParams.filters.minSpeed && searchParams.filters.minSpeed > 0) ||
                (searchParams.filters.minPower && searchParams.filters.minPower > 0)) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchParams(prev => ({
                      ...prev,
                      filters: {
                        minIntelligence: 0,
                        minStrength: 0,
                        minSpeed: 0,
                        minPower: 0,
                        publisher: "",
                        alignment: "",
                        gender: "",
                      }
                    }));
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
            
            {/* Active filters displayed as badges */}
            {(searchParams.filters.publisher || 
              searchParams.filters.alignment || 
              searchParams.filters.gender || 
              (searchParams.filters.minIntelligence && searchParams.filters.minIntelligence > 0) ||
              (searchParams.filters.minStrength && searchParams.filters.minStrength > 0) ||
              (searchParams.filters.minSpeed && searchParams.filters.minSpeed > 0) ||
              (searchParams.filters.minPower && searchParams.filters.minPower > 0)) && (
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm text-muted-foreground py-1">Filters:</span>
                {searchParams.filters.publisher && (
                  <Badge variant="outline" className="px-3 py-1 bg-primary/10 animate-in fade-in duration-300">
                    Publisher: {searchParams.filters.publisher}
                  </Badge>
                )}
                {searchParams.filters.alignment && (
                  <Badge variant="outline" className="px-3 py-1 bg-primary/10 animate-in fade-in duration-300">
                    Alignment: {searchParams.filters.alignment}
                  </Badge>
                )}
                {searchParams.filters.gender && (
                  <Badge variant="outline" className="px-3 py-1 bg-primary/10 animate-in fade-in duration-300">
                    Gender: {searchParams.filters.gender}
                  </Badge>
                )}
                {searchParams.filters.minIntelligence && searchParams.filters.minIntelligence > 0 && (
                  <Badge variant="outline" className="px-3 py-1 bg-primary/10 animate-in fade-in duration-300">
                    Intelligence: {searchParams.filters.minIntelligence}+
                  </Badge>
                )}
                {searchParams.filters.minStrength && searchParams.filters.minStrength > 0 && (
                  <Badge variant="outline" className="px-3 py-1 bg-primary/10 animate-in fade-in duration-300">
                    Strength: {searchParams.filters.minStrength}+
                  </Badge>
                )}
                {searchParams.filters.minSpeed && searchParams.filters.minSpeed > 0 && (
                  <Badge variant="outline" className="px-3 py-1 bg-primary/10 animate-in fade-in duration-300">
                    Speed: {searchParams.filters.minSpeed}+
                  </Badge>
                )}
                {searchParams.filters.minPower && searchParams.filters.minPower > 0 && (
                  <Badge variant="outline" className="px-3 py-1 bg-primary/10 animate-in fade-in duration-300">
                    Power: {searchParams.filters.minPower}+
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <SuperheroGrid
          heroes={filteredHeroes || []}
          isLoading={isLoading}
          error={error?.message || data?.error}
          searchParams={searchParams}
        />
      </main>
    </div>
  );
}