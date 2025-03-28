import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, BarChart2, Shield, Zap, Brain, Dumbbell, Wind, Activity, ArrowUpRight } from "lucide-react";
import { type Superhero } from "@shared/schema";
import { Link } from "wouter";
import { useState } from "react";

// Helper function to calculate the total power of a hero
function calculateTotalPower(powerstats: Superhero['powerstats']): number {
  const total = Object.values(powerstats).reduce((sum, value) => {
    return sum + Number(value);
  }, 0);
  return Math.round(total / 6); // Average of all stats
}

interface SuperheroCardProps {
  hero: Superhero;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onToggleCompare?: () => void;
  isInCompare?: boolean;
}

function StatBar({ label, value }: { label: string; value: number }) {
  // Determine the icon and color based on the stat label
  const getIconAndColor = () => {
    switch (label.toLowerCase()) {
      case 'intelligence':
        return { icon: <Brain className="h-3 w-3" />, color: 'bg-blue-500', textColor: 'text-blue-500' };
      case 'strength':
        return { icon: <Dumbbell className="h-3 w-3" />, color: 'bg-red-500', textColor: 'text-red-500' };
      case 'speed':
        return { icon: <Wind className="h-3 w-3" />, color: 'bg-green-500', textColor: 'text-green-500' };
      case 'power':
        return { icon: <Activity className="h-3 w-3" />, color: 'bg-purple-500', textColor: 'text-purple-500' };
      case 'durability':
        return { icon: <Shield className="h-3 w-3" />, color: 'bg-amber-500', textColor: 'text-amber-500' };
      case 'combat':
        return { icon: <Zap className="h-3 w-3" />, color: 'bg-rose-500', textColor: 'text-rose-500' };
      default:
        return { icon: null, color: 'bg-primary', textColor: 'text-primary' };
    }
  };

  const { icon, color, textColor } = getIconAndColor();
  
  // Determine progress color based on value
  const getProgressColor = () => {
    if (value >= 80) return color;
    if (value >= 60) return 'bg-emerald-500';
    if (value >= 40) return 'bg-amber-500';
    if (value >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1 group/stat">
      <div className="flex justify-between text-sm items-center">
        <span className={`flex items-center gap-1.5 font-medium ${textColor} transition-all duration-300`}>
          {icon}
          {label}
        </span>
        <div className="bg-muted/50 px-2 py-0.5 rounded text-xs font-mono transition-all duration-300 group-hover/stat:bg-muted">
          {value}%
        </div>
      </div>
      <Progress 
        value={value} 
        className={`h-1.5 transition-all duration-300 group-hover:h-2.5 overflow-hidden ${getProgressColor()}`}
      />
    </div>
  );
}

export function SuperheroCard({ 
  hero, 
  isFavorite, 
  onToggleFavorite,
  onToggleCompare,
  isInCompare 
}: SuperheroCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate power score with proper color
  const powerScore = calculateTotalPower(hero.powerstats);
  const getPowerScoreColor = () => {
    if (powerScore >= 80) return 'text-emerald-500 border-emerald-500';
    if (powerScore >= 60) return 'text-blue-500 border-blue-500';
    if (powerScore >= 40) return 'text-amber-500 border-amber-500';
    return 'text-rose-500 border-rose-500';
  };

  // Handle mouse press effect (subtle scale down)
  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  // Handle hover effect with a slight delay to avoid flashing on quick mouse movements
  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => {
      setIsHovered(true);
    }, 50);
    setHoverTimeout(timeout as unknown as NodeJS.Timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setIsHovered(false);
    setIsPressed(false);
  };

  return (
    <div 
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      <Link href={`/hero/${hero.id}`}>
        <Card 
          className={`
            overflow-hidden 
            transition-all 
            duration-300 
            cursor-pointer 
            border-2 
            ${isHovered ? 'shadow-2xl border-primary/60 shadow-primary/20' : 'shadow-md border-transparent'} 
            ${isPressed ? 'scale-[0.98]' : isHovered ? 'scale-[1.03]' : 'scale-100'}
            will-change-transform
          `}
        >
          <div className="aspect-square relative overflow-hidden">
            <img 
              src={hero.image.url} 
              alt={hero.name}
              className={`
                object-cover 
                w-full 
                h-full 
                transition-all 
                duration-500 
                ${isHovered ? 'scale-110 contrast-[1.1] brightness-[1.1]' : 'scale-100'} 
                will-change-transform
              `}
            />
            
            {/* Hero details overlay on hover */}
            <div 
              className={`
                absolute 
                inset-0 
                bg-gradient-to-t 
                from-black/80 
                via-black/40 
                to-transparent 
                flex 
                items-end 
                p-3 
                opacity-0 
                transition-all 
                duration-300 
                ${isHovered ? 'opacity-100' : ''}
              `}
            >
              {hero.biography?.fullName && (
                <div className="mb-10">
                  <div className="text-white text-xs font-medium uppercase tracking-wider mb-1 opacity-70">
                    Real Name
                  </div>
                  <div className="text-white text-sm font-bold">
                    {hero.biography.fullName || "Unknown"}
                  </div>
                </div>
              )}
            </div>

            {/* View details button on hover */}
            <div 
              className={`
                absolute 
                bottom-3 
                right-3
                transition-all 
                duration-300 
                transform
                ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} 
              `}
            >
              <Badge 
                className="bg-primary/90 text-white font-medium px-3 py-1.5 flex items-center gap-1.5 hover:bg-primary"
              >
                View Details
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Badge>
            </div>
            
            {/* Publisher badge */}
            {hero.biography?.publisher && (
              <Badge 
                variant="secondary" 
                className={`
                  absolute 
                  top-2 
                  left-2 
                  bg-background/80 
                  backdrop-blur-sm 
                  font-semibold
                  transition-all
                  duration-300
                  ${isHovered ? 'pl-3 pr-3' : ''}
                `}
              >
                {hero.biography.publisher}
              </Badge>
            )}
            
            {/* Alignment badge */}
            {hero.biography?.alignment && (
              <Badge 
                variant={hero.biography.alignment === "good" ? "default" : "destructive"} 
                className={`
                  absolute 
                  bottom-2 
                  left-2 
                  ${
                    hero.biography.alignment === "good" 
                      ? "bg-emerald-500/90" 
                      : hero.biography.alignment === "bad" 
                        ? "bg-rose-500/90" 
                        : "bg-blue-500/90"
                  } 
                  backdrop-blur-sm 
                  transition-all 
                  duration-300 
                  flex 
                  items-center 
                  gap-1.5
                  ${isHovered ? 'translate-y-0 opacity-100 scale-110' : ''}
                `}
              >
                {hero.biography.alignment === "good" ? (
                  <Shield className="h-3 w-3" />
                ) : hero.biography.alignment === "bad" ? (
                  <Zap className="h-3 w-3" />
                ) : null}
                {hero.biography.alignment.charAt(0).toUpperCase() + hero.biography.alignment.slice(1)}
              </Badge>
            )}
            
            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-2">
              {onToggleCompare && (
                <Button
                  variant={isInCompare ? "secondary" : "ghost"}
                  size="icon"
                  className={`
                    ${isInCompare 
                      ? 'bg-primary text-white border-primary scale-110' 
                      : 'bg-background/70 backdrop-blur-sm text-foreground hover:bg-background/90'
                    } 
                    transition-all 
                    duration-200 
                    shadow-md
                    hover:scale-110
                    active:scale-95
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleCompare();
                  }}
                >
                  <BarChart2 
                    className={`
                      h-5 
                      w-5 
                      ${isInCompare ? 'fill-white' : ''} 
                      transition-all 
                      duration-200
                      ${isHovered && !isInCompare ? 'animate-pulse' : ''}
                    `} 
                  />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`
                  ${isFavorite 
                    ? 'text-red-500 bg-background/80 backdrop-blur-sm hover:bg-background/90 scale-110' 
                    : 'bg-background/70 backdrop-blur-sm text-foreground hover:bg-background/90'
                  } 
                  transition-all 
                  duration-200 
                  shadow-md
                  hover:scale-110
                  active:scale-95
                `}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                <Heart 
                  className={`
                    h-5 
                    w-5 
                    ${isFavorite ? 'fill-current' : ''} 
                    transition-all 
                    duration-200
                    ${isHovered && !isFavorite ? 'animate-pulse' : ''}
                  `} 
                />
              </Button>
            </div>
          </div>
          <CardHeader className="pb-2 pt-3">
            <h3 className={`
              text-xl 
              font-bold 
              transition-colors 
              duration-300
              ${isHovered ? 'text-primary' : ''}
            `}>
              {hero.name}
            </h3>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">ID: {hero.id}</p>
              {hero.powerstats && (
                <Badge 
                  variant="outline" 
                  className={`
                    text-xs 
                    font-medium 
                    ${getPowerScoreColor()}
                    transition-all
                    duration-300
                    ${isHovered ? 'scale-110' : ''}
                  `}
                >
                  Power Score: {powerScore}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <StatBar label="Intelligence" value={hero.powerstats.intelligence} />
              <StatBar label="Strength" value={hero.powerstats.strength} />
              <StatBar label="Speed" value={hero.powerstats.speed} />
              <StatBar label="Durability" value={hero.powerstats.durability} />
              <StatBar label="Power" value={hero.powerstats.power} />
              <StatBar label="Combat" value={hero.powerstats.combat} />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}