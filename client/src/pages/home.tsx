import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar, type SearchParams } from "@/components/search-bar";
import { SuperheroGrid } from "@/components/superhero-grid";
import { ThemeToggle } from "@/components/theme-toggle";
import { type SearchResponse, type Superhero } from "@shared/schema";
import { Heart, BarChart2, Check, Share } from "lucide-react";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
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
  
  // Load search params from URL on first render
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    if (params.size > 0) {
      const term = params.get('q') || '';
      
      // Parse filter params
      const filters = {
        minIntelligence: parseInt(params.get('int') || '0'),
        minStrength: parseInt(params.get('str') || '0'),
        minSpeed: parseInt(params.get('spd') || '0'),
        minPower: parseInt(params.get('pwr') || '0'),
        publisher: params.get('pub') || '',
        alignment: params.get('align') || '',
        gender: params.get('gender') || '',
      };
      
      // Update search params
      setSearchParams({ term, filters });
    }
  }, []);
  
  // Update URL when search params change
  useEffect(() => {
    // Skip updating URL if no search term (initial state)
    if (!searchParams.term) return;
    
    const params = new URLSearchParams();
    
    // Add search term
    if (searchParams.term) {
      params.set('q', searchParams.term);
    }
    
    // Add filters (only add non-empty/non-zero values)
    const { filters } = searchParams;
    
    if (filters.minIntelligence && filters.minIntelligence > 0) params.set('int', filters.minIntelligence.toString());
    if (filters.minStrength && filters.minStrength > 0) params.set('str', filters.minStrength.toString());
    if (filters.minSpeed && filters.minSpeed > 0) params.set('spd', filters.minSpeed.toString());
    if (filters.minPower && filters.minPower > 0) params.set('pwr', filters.minPower.toString());
    if (filters.publisher) params.set('pub', filters.publisher);
    if (filters.alignment) params.set('align', filters.alignment);
    if (filters.gender) params.set('gender', filters.gender);
    
    // Update the URL without refreshing the page
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    setLocation(newUrl, { replace: true });
  }, [searchParams, setLocation]);

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
    
    // Helper to convert a value to a number
    const toNumber = (value: string | number): number => {
      return typeof value === 'string' ? parseInt(value) || 0 : value;
    };
    
    // Check power stats filters - handling both string and number values
    const meetsStatRequirements = 
      toNumber(hero.powerstats.intelligence) >= (filters.minIntelligence || 0) &&
      toNumber(hero.powerstats.strength) >= (filters.minStrength || 0) &&
      toNumber(hero.powerstats.speed) >= (filters.minSpeed || 0) &&
      toNumber(hero.powerstats.power) >= (filters.minPower || 0);
    
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h1 className="text-5xl font-bangers bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent tracking-wider text-center md:text-left">
            Superhero Search
          </h1>
          <div className="flex gap-2 justify-center md:justify-end flex-wrap">
            <CompareButton />
            <Link href="/favorites">
              <Button variant="outline">
                <Heart className="mr-2 h-4 w-4" />
                Favorites
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="icon" className="bg-primary/10 hover:bg-primary/20">
                <BarChart2 className="h-4 w-4" />
                <span className="sr-only">Dashboard</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <SearchBar 
            onSearch={setSearchParams} 
            isLoading={isLoading} 
            initialSearchParams={searchParams}
          />
        </div>

        {/* Results section with improved UI */}
        {searchParams && filteredHeroes && filteredHeroes.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-montserrat font-semibold">
                {filteredHeroes.length} Heroes Found
              </h2>
              
              <div className="flex flex-wrap gap-2">
                {/* Share Search button always visible if we have a search term */}
                {searchParams.term && (
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-primary/80 hover:bg-primary"
                    onClick={() => {
                      // Get the current URL from the browser
                      const shareUrl = window.location.href;
                      
                      // Copy to clipboard
                      navigator.clipboard.writeText(shareUrl)
                        .then(() => {
                          // Show a toast notification
                          toast({
                            title: "URL Copied!",
                            description: "Search URL copied to clipboard. Share it with others!",
                            action: (
                              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <Check className="h-4 w-4" />
                              </div>
                            ),
                          });
                        })
                        .catch(err => {
                          console.error('Could not copy text: ', err);
                          
                          // Show toast with error
                          toast({
                            title: "Couldn't copy automatically",
                            description: "Copy this URL manually: " + shareUrl,
                            variant: "destructive",
                          });
                        });
                    }}
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Share Search
                  </Button>
                )}
                
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
                <span className="text-sm font-lato text-muted-foreground py-1">Filters:</span>
                {/* Common badge style for all filter badges */}
                {(() => {
                  const badgeClass = "px-3 py-1 bg-primary/10 font-major text-xs uppercase tracking-wide animate-in fade-in duration-300";
                  
                  return (
                    <>
                      {searchParams.filters.publisher && (
                        <Badge variant="outline" className={badgeClass}>
                          Publisher: {searchParams.filters.publisher}
                        </Badge>
                      )}
                      {searchParams.filters.alignment && (
                        <Badge variant="outline" className={badgeClass}>
                          Alignment: {searchParams.filters.alignment}
                        </Badge>
                      )}
                      {searchParams.filters.gender && (
                        <Badge variant="outline" className={badgeClass}>
                          Gender: {searchParams.filters.gender}
                        </Badge>
                      )}
                      {searchParams.filters.minIntelligence && searchParams.filters.minIntelligence > 0 && (
                        <Badge variant="outline" className={badgeClass}>
                          Intel: {searchParams.filters.minIntelligence}+
                        </Badge>
                      )}
                      {searchParams.filters.minStrength && searchParams.filters.minStrength > 0 && (
                        <Badge variant="outline" className={badgeClass}>
                          Str: {searchParams.filters.minStrength}+
                        </Badge>
                      )}
                      {searchParams.filters.minSpeed && searchParams.filters.minSpeed > 0 && (
                        <Badge variant="outline" className={badgeClass}>
                          Spd: {searchParams.filters.minSpeed}+
                        </Badge>
                      )}
                      {searchParams.filters.minPower && searchParams.filters.minPower > 0 && (
                        <Badge variant="outline" className={badgeClass}>
                          Pwr: {searchParams.filters.minPower}+
                        </Badge>
                      )}
                    </>
                  );
                })()}
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