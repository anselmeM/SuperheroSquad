import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";
import { SuperheroGrid } from "@/components/superhero-grid";
import { type SearchResponse } from "@shared/schema";
import { Heart } from "lucide-react";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/search", searchTerm],
    queryFn: () =>
      fetch(`/api/search?query=${encodeURIComponent(searchTerm)}`).then((res) =>
        res.json()
      ),
    enabled: searchTerm.length > 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Superhero Search
          </h1>
          <Link href="/favorites">
            <Button variant="outline">
              <Heart className="mr-2 h-4 w-4" />
              Favorites
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <SearchBar onSearch={setSearchTerm} isLoading={isLoading} />
        </div>

        <SuperheroGrid
          heroes={data?.results || []}
          isLoading={isLoading}
          error={error?.message || data?.error}
        />
      </main>
    </div>
  );
}