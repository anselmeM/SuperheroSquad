import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useRoute } from "wouter";

interface NotFoundProps {
  heroError?: string;
}

// We separate the hero-specific and general 404 components
function HeroNotFound({ error }: { error: string }) {
  // Hero-specific error messages
  const messages = [
    "This hero is on a secret mission!",
    "Even Justice League archives have no record of this hero.",
    "Somewhere in the multiverse, this hero exists... but not here.",
    "This super ID doesn't match any known hero.",
    "Hero signal lost in the space-time continuum!"
  ];
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-primary/20">
        <CardContent className="pt-6 pb-8 flex flex-col items-center text-center">
          <div className="relative w-24 h-24 mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
            <AlertCircle className="w-24 h-24 text-primary relative z-10" />
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="text-4xl font-bold">404</span>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent mb-2">
            Hero Missing!
          </h1>
          
          <p className="text-lg mb-6 text-muted-foreground">{randomMessage}</p>
          
          {error && error !== "Hero not found" && (
            <div className="mb-4 p-3 bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button asChild className="gap-2 flex-1" size="lg">
              <Link href="/">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 flex-1" size="lg">
              <Link href="/?query=superman">
                <Search className="h-4 w-4" />
                Find Heroes
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground pt-6 max-w-sm">
            The superhero you're looking for may be on a secret mission or doesn't exist in our universe.
          </p>
          
          <div className="w-full h-12 mt-6 bg-[url('https://static.vecteezy.com/system/resources/previews/013/649/626/original/city-skyline-silhouette-illustration-free-png.png')] bg-contain bg-repeat-x bg-bottom opacity-20" />
        </CardContent>
      </Card>
    </div>
  );
}

// General 404 page for missing routes
function GeneralNotFound() {
  // General 404 messages
  const messages = [
    "Even Superman couldn't find this page!",
    "Holy missing page, Batman!",
    "This page has vanished faster than The Flash.",
    "Not even Doctor Strange can locate this page in the multiverse.",
    "Looks like this page was snapped away by Thanos.",
    "Great Scott! This page is lost in time!"
  ];
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-primary/20">
        <CardContent className="pt-6 pb-8 flex flex-col items-center text-center">
          <div className="relative w-24 h-24 mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
            <AlertCircle className="w-24 h-24 text-primary relative z-10" />
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="text-4xl font-bold">404</span>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent mb-2">
            Page Not Found
          </h1>
          
          <p className="text-lg mb-6 text-muted-foreground">{randomMessage}</p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button asChild className="gap-2 flex-1" size="lg">
              <Link href="/">
                <Home className="h-4 w-4" />
                Return Home
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground pt-6 max-w-sm">
            This page doesn't exist in our superhero universe. Check the URL or head back to the headquarters.
          </p>
          
          <div className="w-full h-12 mt-6 bg-[url('https://static.vecteezy.com/system/resources/previews/013/649/626/original/city-skyline-silhouette-illustration-free-png.png')] bg-contain bg-repeat-x bg-bottom opacity-20" />
        </CardContent>
      </Card>
    </div>
  );
}

// For route-level 404 handling we need a wrapper that works with Wouter
export function RouteNotFound() {
  return <GeneralNotFound />;
}

// Main component that decides which 404 to show
export default function NotFound({ heroError }: NotFoundProps) {
  const [match] = useRoute('/hero/:id');
  
  // If we have a hero error or we're on a hero route, show the hero-specific 404
  if (heroError || match) {
    return <HeroNotFound error={heroError || "Hero not found"} />;
  }
  
  // Otherwise show the general 404
  return <GeneralNotFound />;
}
