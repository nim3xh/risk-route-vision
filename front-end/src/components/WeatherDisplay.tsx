import { useEffect, useState } from "react";
import { riskApi } from "@/lib/api/client";
import { 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  Sun,
  Moon,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Gauge,
  Navigation,
  Sunrise,
  Sunset,
  RefreshCw,
  MapPin
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WeatherData {
  temperature_c: number;
  feels_like_c?: number;
  humidity_pct: number;
  pressure_hpa?: number;
  precip_mm: number;
  wind_kmh: number;
  wind_deg?: number;
  wind_gust_kmh?: number;
  clouds_pct?: number;
  visibility_m?: number;
  weather_main?: string;
  weather_description?: string;
  weather_icon?: string;
  sunrise?: number;
  sunset?: number;
  location_name?: string;
  country?: string;
  is_wet: 0 | 1;
  provider?: string;
  timestamp?: string;
}

interface WeatherDisplayProps {
  location?: { lat: number; lng: number; name?: string };
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

export function WeatherDisplay({ 
  location, 
  compact = false, 
  autoRefresh = false,
  refreshInterval = 300 // 5 minutes default
}: WeatherDisplayProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    if (!location) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await riskApi.getWeather(location.lat, location.lng);
      setWeather(data as WeatherData);
      setLastUpdate(new Date());
      toast.success("Weather updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch weather";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      fetchWeather();
    }
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    if (!autoRefresh || !location) return;
    
    const interval = setInterval(fetchWeather, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, location]);

  const getWeatherIcon = () => {
    if (!weather?.weather_main) return <Cloud className="h-8 w-8" />;
    
    const main = weather.weather_main.toLowerCase();
    const isNight = weather.weather_icon?.includes('n');
    
    if (main.includes('clear')) return isNight ? <Moon className="h-8 w-8" /> : <Sun className="h-8 w-8" />;
    if (main.includes('thunder')) return <CloudLightning className="h-8 w-8" />;
    if (main.includes('drizzle')) return <CloudDrizzle className="h-8 w-8" />;
    if (main.includes('rain')) return <CloudRain className="h-8 w-8" />;
    if (main.includes('snow')) return <CloudSnow className="h-8 w-8" />;
    if (main.includes('mist') || main.includes('fog')) return <CloudFog className="h-8 w-8" />;
    return <Cloud className="h-8 w-8" />;
  };

  const getWindDirection = (deg?: number) => {
    if (deg === undefined) return 'N/A';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  const getRiskLevel = () => {
    if (!weather) return { level: 'unknown', color: 'bg-slate-500', text: 'Unknown' };
    
    // Calculate risk based on conditions
    let riskScore = 0;
    
    if (weather.is_wet === 1) riskScore += 30;
    if (weather.visibility_m && weather.visibility_m < 1000) riskScore += 25;
    if (weather.wind_kmh > 40) riskScore += 20;
    if (weather.clouds_pct && weather.clouds_pct > 80) riskScore += 10;
    if (weather.temperature_c < 5 || weather.temperature_c > 40) riskScore += 15;
    
    if (riskScore >= 60) return { level: 'high', color: 'bg-rose-500', text: 'High Risk' };
    if (riskScore >= 30) return { level: 'medium', color: 'bg-amber-500', text: 'Moderate' };
    return { level: 'low', color: 'bg-emerald-500', text: 'Low Risk' };
  };

  if (!location) {
    return (
      <Card className="glass-panel p-6">
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <div className="text-center space-y-2">
            <MapPin className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-sm">No location selected</p>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading && !weather) {
    return (
      <Card className="glass-panel p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-24" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="glass-panel p-6">
        <div className="text-center space-y-3">
          <Cloud className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">{error || 'No weather data'}</p>
          <Button size="sm" variant="outline" onClick={fetchWeather} disabled={isLoading}>
            <RefreshCw className={cn("h-3 w-3 mr-2", isLoading && "animate-spin")} />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const riskLevel = getRiskLevel();

  if (compact) {
    return (
      <Card className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", weather.is_wet === 1 ? "bg-blue-500/20 text-blue-400" : "bg-slate-500/10")}>
              {getWeatherIcon()}
            </div>
            <div>
              <div className="text-2xl font-black tabular-nums">{Math.round(weather.temperature_c)}°</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">
                {weather.weather_description || 'Unknown'}
              </div>
            </div>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={fetchWeather}
            disabled={isLoading}
            className="rounded-full"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-panel p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-black italic tracking-tighter uppercase">
              {location.name || weather.location_name || 'Weather'}
            </h3>
          </div>
          {weather.country && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {weather.country} • {weather.provider || 'Live Data'}
            </p>
          )}
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={fetchWeather}
          disabled={isLoading}
          className="rounded-full hover:bg-white/10"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Main Weather Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-4 rounded-2xl transition-colors",
            weather.is_wet === 1 ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
          )}>
            {getWeatherIcon()}
          </div>
          <div>
            <div className="text-5xl font-black tabular-nums">{Math.round(weather.temperature_c)}°</div>
            {weather.feels_like_c && (
              <div className="text-sm text-muted-foreground">
                Feels like {Math.round(weather.feels_like_c)}°
              </div>
            )}
            <div className="text-sm font-bold uppercase tracking-wide mt-1">
              {weather.weather_description || 'Unknown'}
            </div>
          </div>
        </div>
        
        {/* Risk Badge */}
        <div className="text-right">
          <Badge 
            variant={riskLevel.level === 'high' ? 'destructive' : 'secondary'}
            className={cn("rounded-full px-4 py-2", riskLevel.color, "text-white")}
          >
            {riskLevel.text}
          </Badge>
          {weather.is_wet === 1 && (
            <div className="mt-2 text-xs text-blue-400 font-bold uppercase">
              Wet Conditions
            </div>
          )}
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Humidity */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Droplets className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Humidity</span>
          </div>
          <div className="text-xl font-black tabular-nums">{weather.humidity_pct}%</div>
        </div>

        {/* Wind */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Wind className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Wind</span>
          </div>
          <div className="text-xl font-black tabular-nums">
            {Math.round(weather.wind_kmh)} 
            <span className="text-xs ml-1 opacity-50">km/h</span>
          </div>
          {weather.wind_deg !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation 
                className="h-3 w-3" 
                style={{ transform: `rotate(${weather.wind_deg}deg)` }}
              />
              {getWindDirection(weather.wind_deg)}
            </div>
          )}
        </div>

        {/* Visibility */}
        {weather.visibility_m !== undefined && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Eye className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Visibility</span>
            </div>
            <div className="text-xl font-black tabular-nums">
              {(weather.visibility_m / 1000).toFixed(1)}
              <span className="text-xs ml-1 opacity-50">km</span>
            </div>
          </div>
        )}

        {/* Pressure */}
        {weather.pressure_hpa && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Gauge className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Pressure</span>
            </div>
            <div className="text-xl font-black tabular-nums">
              {weather.pressure_hpa}
              <span className="text-xs ml-1 opacity-50">hPa</span>
            </div>
          </div>
        )}

        {/* Cloud Cover */}
        {weather.clouds_pct !== undefined && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Cloud className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Clouds</span>
            </div>
            <div className="text-xl font-black tabular-nums">{weather.clouds_pct}%</div>
          </div>
        )}

        {/* Precipitation */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <CloudRain className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Precip.</span>
          </div>
          <div className="text-xl font-black tabular-nums">
            {weather.precip_mm.toFixed(1)}
            <span className="text-xs ml-1 opacity-50">mm</span>
          </div>
        </div>
      </div>

      {/* Sunrise/Sunset */}
      {(weather.sunrise || weather.sunset) && (
        <div className="flex items-center justify-around p-3 rounded-xl bg-white/5 border border-white/5">
          {weather.sunrise && (
            <div className="flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Sunrise</div>
                <div className="text-sm font-black">
                  {new Date(weather.sunrise * 1000).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          )}
          {weather.sunset && (
            <div className="flex items-center gap-2">
              <Sunset className="h-4 w-4 text-orange-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Sunset</div>
                <div className="text-sm font-black">
                  {new Date(weather.sunset * 1000).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Last Updated */}
      {lastUpdate && (
        <div className="text-center text-xs text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </Card>
  );
}
