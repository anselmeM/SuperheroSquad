import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, SlidersHorizontal, X } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div className="relative w-full">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search for a superhero..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyUp={handleKeyPress}
                    className={`flex-1 pr-8 ${input ? 'pr-8' : ''}`}
                  />
                  {input && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" 
                      onClick={clearInput}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" align="start">
              <Command>
                <CommandList>
                  {isLoadingSuggestions ? (
                    <CommandEmpty>
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading suggestions...</span>
                      </div>
                    </CommandEmpty>
                  ) : suggestions.length === 0 ? (
                    <CommandEmpty>No superheroes found</CommandEmpty>
                  ) : (
                    <CommandGroup heading="Suggestions">
                      {suggestions.map((hero) => (
                        <CommandItem
                          key={hero.id}
                          value={hero.name}
                          onSelect={() => handleSelectSuggestion(hero)}
                          className="cursor-pointer"
                        >
                          {hero.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72">
            <DropdownMenuLabel>Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Categories</h3>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div className="space-y-1">
                    <label htmlFor="publisher" className="text-sm font-medium">Publisher</label>
                    <select 
                      id="publisher"
                      className="w-full p-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <div className="space-y-1">
                    <label htmlFor="alignment" className="text-sm font-medium">Alignment</label>
                    <select 
                      id="alignment"
                      className="w-full p-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={filters.alignment}
                      onChange={(e) => setFilters(prev => ({ ...prev, alignment: e.target.value }))}
                    >
                      <option value="">All Alignments</option>
                      <option value="good">Good</option>
                      <option value="bad">Evil</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="gender" className="text-sm font-medium">Gender</label>
                    <select 
                      id="gender"
                      className="w-full p-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <h3 className="mb-3 text-sm font-semibold">Power Stats</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Intelligence: {filters.minIntelligence}
                    </label>
                    <Slider
                      value={[filters.minIntelligence]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) =>
                        setFilters((prev) => ({ ...prev, minIntelligence: value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Strength: {filters.minStrength}
                    </label>
                    <Slider
                      value={[filters.minStrength]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) =>
                        setFilters((prev) => ({ ...prev, minStrength: value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Speed: {filters.minSpeed}
                    </label>
                    <Slider
                      value={[filters.minSpeed]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) =>
                        setFilters((prev) => ({ ...prev, minSpeed: value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Power: {filters.minPower}
                    </label>
                    <Slider
                      value={[filters.minPower]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) =>
                        setFilters((prev) => ({ ...prev, minPower: value }))
                      }
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-2 flex justify-end">
                <Button 
                  variant="outline" 
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
                  className="mr-2"
                >
                  Reset
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleSearch()}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={handleSearch} disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2">Search</span>
        </Button>
      </div>
    </div>
  );
}