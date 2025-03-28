import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Loader2, SlidersHorizontal, X, 
  Zap, Brain, Shield, Dumbbell, Wind, Activity,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

export interface SearchParams {
  term: string;
  filters: {
    minIntelligence?: number;
    minStrength?: number;
    minSpeed?: number;
    minPower?: number;
    publisher?: string;
    alignment?: string;
    gender?: string;
  };
}

interface Suggestion {
  id: string;
  name: string;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [input, setInput] = useState("");
  const [filters, setFilters] = useState({
    minIntelligence: 0,
    minStrength: 0,
    minSpeed: 0,
    minPower: 0,
    publisher: "",
    alignment: "",
    gender: "",
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (input.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // Debounce the API call
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(input)}`);
        const data = await response.json();
        
        if (data.response === "success" && data.results) {
          const heroSuggestions: Suggestion[] = data.results.map((hero: any) => ({
            id: hero.id,
            name: hero.name
          })).slice(0, 5); // Limit to 5 suggestions
          
          setSuggestions(heroSuggestions);
          setOpen(heroSuggestions.length > 0);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [input]);

  const handleSearch = () => {
    if (input.trim()) {
      setOpen(false);
      onSearch({
        term: input.trim(),
        filters,
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectSuggestion = (hero: Suggestion) => {
    setInput(hero.name);
    setOpen(false);
    
    // Trigger search with the selected hero
    onSearch({
      term: hero.name,
      filters,
    });
  };

  const clearInput = () => {
    setInput('');
    setSuggestions([]);
    setOpen(false);
  };

  // Count active filters
  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key.startsWith('min')) {
      // For numeric filters like minIntelligence
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue > 0) return count + 1;
    } else if (typeof value === 'string' && value !== '') {
      // For string filters like publisher
      return count + 1;
    }
    return count;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="relative flex items-center w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Input
                  type="text"
                  placeholder="Search for a superhero..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyUp={handleKeyPress}
                  className="pl-10 pr-10 shadow-sm border-2 focus:border-primary transition-all duration-300 h-12"
                />
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[300px] shadow-lg border-0 overflow-hidden rounded-lg" align="start">
                <Command>
                  <CommandList>
                    {isLoadingSuggestions ? (
                      <CommandEmpty>
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                          <span>Loading suggestions...</span>
                        </div>
                      </CommandEmpty>
                    ) : suggestions.length === 0 ? (
                      <CommandEmpty className="py-6">
                        <div className="text-center space-y-2">
                          <Search className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                          <p>No superheroes found</p>
                        </div>
                      </CommandEmpty>
                    ) : (
                      <CommandGroup heading="Hero Suggestions">
                        {suggestions.map((hero) => (
                          <CommandItem
                            key={hero.id}
                            value={hero.name}
                            onSelect={() => handleSelectSuggestion(hero)}
                            className="cursor-pointer py-3 px-4 hover:bg-primary/10"
                          >
                            <div className="flex items-center">
                              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/20 text-primary mr-3">
                                <Search className="h-3 w-3" />
                              </div>
                              <span className="font-medium">{hero.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {input && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full" 
                onClick={clearInput}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="relative group h-12">
                <span className="flex items-center">
                  <SlidersHorizontal className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Filters</span>
                </span>
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 px-1.5 h-5 min-w-5 flex items-center justify-center bg-primary text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0 border-2">
              <div className="p-4 border-b bg-muted/50">
                <h3 className="font-semibold text-lg flex items-center">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filter Heroes
                </h3>
              </div>
              <div className="p-5 space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Publisher & Alignment</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="publisher" className="text-sm font-medium flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                        Publisher
                      </label>
                      <select 
                        id="publisher"
                        className="w-full p-2 text-sm rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-transparent"
                        value={filters.publisher}
                        onChange={(e) => setFilters(prev => ({ ...prev, publisher: e.target.value }))}
                      >
                        <option value="">All Publishers</option>
                        <option value="Marvel Comics">Marvel Comics</option>
                        <option value="DC Comics">DC Comics</option>
                        <option value="Dark Horse Comics">Dark Horse Comics</option>
                        <option value="Image Comics">Image Comics</option>
                        <option value="Warner Bros">Warner Bros</option>
                        <option value="Shueisha">Shueisha</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="alignment" className="text-sm font-medium flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-muted-foreground" />
                        Alignment
                      </label>
                      <select 
                        id="alignment"
                        className="w-full p-2 text-sm rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-transparent"
                        value={filters.alignment}
                        onChange={(e) => setFilters(prev => ({ ...prev, alignment: e.target.value }))}
                      >
                        <option value="">All Alignments</option>
                        <option value="good">Good</option>
                        <option value="bad">Evil</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="gender" className="text-sm font-medium flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        Gender
                      </label>
                      <select 
                        id="gender"
                        className="w-full p-2 text-sm rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-transparent"
                        value={filters.gender}
                        onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                      >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Minimum Power Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <label className="flex items-center font-medium">
                          <Brain className="h-4 w-4 mr-2 text-blue-500" />
                          Intelligence
                        </label>
                        <span className="font-mono bg-primary/10 px-2 rounded text-xs">{filters.minIntelligence}</span>
                      </div>
                      <Slider
                        value={[filters.minIntelligence]}
                        min={0}
                        max={100}
                        step={5}
                        className="py-2"
                        onValueChange={([value]) =>
                          setFilters((prev) => ({ ...prev, minIntelligence: value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <label className="flex items-center font-medium">
                          <Dumbbell className="h-4 w-4 mr-2 text-red-500" />
                          Strength
                        </label>
                        <span className="font-mono bg-primary/10 px-2 rounded text-xs">{filters.minStrength}</span>
                      </div>
                      <Slider
                        value={[filters.minStrength]}
                        min={0}
                        max={100}
                        step={5}
                        className="py-2"
                        onValueChange={([value]) =>
                          setFilters((prev) => ({ ...prev, minStrength: value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <label className="flex items-center font-medium">
                          <Wind className="h-4 w-4 mr-2 text-green-500" />
                          Speed
                        </label>
                        <span className="font-mono bg-primary/10 px-2 rounded text-xs">{filters.minSpeed}</span>
                      </div>
                      <Slider
                        value={[filters.minSpeed]}
                        min={0}
                        max={100}
                        step={5}
                        className="py-2"
                        onValueChange={([value]) =>
                          setFilters((prev) => ({ ...prev, minSpeed: value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <label className="flex items-center font-medium">
                          <Activity className="h-4 w-4 mr-2 text-purple-500" />
                          Power
                        </label>
                        <span className="font-mono bg-primary/10 px-2 rounded text-xs">{filters.minPower}</span>
                      </div>
                      <Slider
                        value={[filters.minPower]}
                        min={0}
                        max={100}
                        step={5}
                        className="py-2"
                        onValueChange={([value]) =>
                          setFilters((prev) => ({ ...prev, minPower: value }))
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 flex justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFilters({
                      minIntelligence: 0,
                      minStrength: 0,
                      minSpeed: 0,
                      minPower: 0,
                      publisher: "",
                      alignment: "",
                      gender: "",
                    })}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset All
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleSearch()}
                    className="font-medium"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !input.trim()} 
            className="h-12 px-6 transition-all duration-300 font-medium"
            variant={input.trim() ? "default" : "secondary"}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            <span>{input.trim() ? "Search" : "Browse All"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}