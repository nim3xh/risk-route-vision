import { useEffect, useState } from "react";
import { useRiskStore } from "@/store/useRiskStore";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Thermometer, Droplets, Wind, CloudRain, Radio, Settings2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { riskApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WeatherPanelProps {
  location?: { lat: number; lng: number };
}

export function WeatherPanel({ location }: WeatherPanelProps) {
  const { weather, setWeather, weatherMode, setWeatherMode, liveWeather, setLiveWeather } = useRiskStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchLiveWeather = async () => {
    if (!location) return;
    setIsSyncing(true);
    try {
      const data = await riskApi.getWeather(location.lat, location.lng);
      setLiveWeather(data);
    } catch (err) {
      toast.error("Failed to fetch live weather");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (weatherMode === "live" && location) {
      fetchLiveWeather();
    }
  }, [location?.lat, location?.lng, weatherMode]);

  const activeWeather = weatherMode === "live" ? liveWeather || weather : weather;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5">
           <button 
             onClick={() => setWeatherMode("manual")}
             className={cn(
               "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
               weatherMode === "manual" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
             )}
           >
             <Settings2 className="h-3 w-3" />
             Manual
           </button>
           <button 
             onClick={() => setWeatherMode("live")}
             className={cn(
               "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
               weatherMode === "live" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
             )}
           >
             <Radio className={cn("h-3 w-3", weatherMode === "live" && "animate-pulse")} />
             Live
           </button>
        </div>
        
        {weatherMode === "live" && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-white/10"
            onClick={fetchLiveWeather}
            disabled={isSyncing || !location}
          >
            <RefreshCcw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          </Button>
        )}
      </div>

      <div className={cn("grid grid-cols-1 gap-4 transition-all duration-500", weatherMode === "live" && "opacity-80")}>
        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 opacity-70">
              <Thermometer className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Thermal</span>
            </div>
            <span className="text-xs font-black tabular-nums italic text-primary">{activeWeather.temperature_c}°</span>
          </div>
          {weatherMode === "manual" ? (
            <Slider
              value={[weather.temperature_c]}
              min={10}
              max={45}
              step={1}
              onValueChange={([val]) => setWeather({ temperature_c: val })}
              className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-primary"
            />
          ) : (
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-primary/40 transition-all duration-500" 
                 style={{ width: `${((activeWeather.temperature_c - 10) / 35) * 100}%` }} 
               />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Humidity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Humidity</span>
              <span className="text-[10px] font-bold tabular-nums">{activeWeather.humidity_pct}%</span>
            </div>
            {weatherMode === "manual" ? (
              <Slider
                value={[weather.humidity_pct]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]) => setWeather({ humidity_pct: val })}
                className="[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
              />
            ) : (
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/20 transition-all duration-500" 
                  style={{ width: `${activeWeather.humidity_pct}%` }} 
                />
              </div>
            )}
          </div>

          {/* Wind */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Velocity</span>
              <span className="text-[10px] font-bold tabular-nums">{activeWeather.wind_kmh} <span className="text-[8px] opacity-50">km/h</span></span>
            </div>
            {weatherMode === "manual" ? (
              <Slider
                value={[weather.wind_kmh]}
                min={0}
                max={80}
                step={2}
                onValueChange={([val]) => setWeather({ wind_kmh: val })}
                className="[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
              />
            ) : (
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/20 transition-all duration-500" 
                  style={{ width: `${(activeWeather.wind_kmh / 80) * 100}%` }} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Road Status */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3">
             <div className={cn(
               "p-2 rounded-xl transition-colors",
               activeWeather.is_wet === 1 ? "bg-blue-500/20 text-blue-400" : "bg-slate-500/10 text-slate-500"
             )}>
               <CloudRain className="h-4 w-4" />
             </div>
             <div className="space-y-0.5">
               <span className="text-[10px] font-bold uppercase tracking-widest block">Surface State</span>
               <span className="text-[8px] text-muted-foreground uppercase">{activeWeather.is_wet === 1 ? "Hydroplane Risk" : "Standard Dry"}</span>
             </div>
          </div>
          <Switch 
            checked={activeWeather.is_wet === 1}
            onCheckedChange={(checked) => weatherMode === "manual" && setWeather({ is_wet: checked ? 1 : 0 })}
            disabled={weatherMode === "live"}
            className="data-[state=checked]:bg-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
