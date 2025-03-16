import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";

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
  };
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [input, setInput] = useState("");
  const [filters, setFilters] = useState({
    minIntelligence: 0,
    minStrength: 0,
    minSpeed: 0,
    minPower: 0,
  });

  const handleSearch = () => {
    if (input.trim()) {
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search for a superhero..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyUp={handleKeyPress}
          className="flex-1"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Power Stats Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 space-y-6">
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