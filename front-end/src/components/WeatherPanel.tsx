import { useCallback, useEffect, useRef, useState } from "react";
import { useRiskStore } from "@/store/useRiskStore";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Thermometer, Wind, CloudRain, Radio, Settings2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { riskApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { config } from "@/lib/config";

interface WeatherPanelProps {
  location?: { lat: number; lng: number };
}

export function WeatherPanel({ location: _location }: WeatherPanelProps) {
  const { weather, setWeather, weatherMode, setWeatherMode, liveWeather, setLiveWeather } = useRiskStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [tempLocal, setTempLocal] = useState(weather.temperature_c);
  const [humidityLocal, setHumidityLocal] = useState(weather.humidity_pct);
  const [windLocal, setWindLocal] = useState(weather.wind_kmh);
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchedOnceRef = useRef(false); // Prevent duplicate fetches (React strict mode)
  const lastFetchRef = useRef(0); // Simple throttle to avoid rapid repeats
  const syncingRef = useRef(false); // Guard concurrent fetches

  const targetLocation = config.domain.center; // Pin weather to Ginigathhena domain center

  const fetchLiveWeather = useCallback(async (opts?: { force?: boolean }) => {
    if (syncingRef.current && !opts?.force) return;

    const now = Date.now();
    if (!opts?.force && now - lastFetchRef.current < 8000) {
      return; // Throttle duplicate calls (e.g., StrictMode or rapid toggles)
    }

    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const data = await riskApi.getWeather(targetLocation.lat, targetLocation.lng);
      setLiveWeather(data);
      lastFetchRef.current = Date.now();
    } catch (err) {
      toast.error("Failed to fetch live weather");
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [setLiveWeather, targetLocation.lat, targetLocation.lng]);

  useEffect(() => {
    if (weatherMode === "live" && !fetchedOnceRef.current) {
      fetchedOnceRef.current = true;
      fetchLiveWeather();
    }

    if (weatherMode === "manual") {
      fetchedOnceRef.current = false;
    }
  }, [fetchLiveWeather, weatherMode]);

  const activeWeather = weatherMode === "live" ? liveWeather || weather : weather;

  const ensureManual = () => {
    if (weatherMode === "live") {
      setWeatherMode("manual");
    }
  };

  const scheduleCommit = (partial: Partial<typeof weather>) => {
    ensureManual();
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      setWeather(partial);
    }, 350); // trailing commit while dragging
  };

  useEffect(() => {
    setTempLocal(weather.temperature_c);
    setHumidityLocal(weather.humidity_pct);
    setWindLocal(weather.wind_kmh);
  }, [weather.temperature_c, weather.humidity_pct, weather.wind_kmh, weather.is_wet]);

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
            onClick={() => fetchLiveWeather({ force: true })}
            disabled={isSyncing}
          >
            <RefreshCcw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          </Button>
        )}
      </div>

      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Using Ginigathhena live weather
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
              value={[tempLocal]}
              min={10}
              max={45}
              step={1}
              onValueChange={([val]) => {
                setTempLocal(val);
                scheduleCommit({ temperature_c: val });
              }}
              onValueCommit={([val]) => {
                setTempLocal(val);
                setWeather({ temperature_c: val });
              }}
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
                value={[humidityLocal]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]) => {
                  setHumidityLocal(val);
                  scheduleCommit({ humidity_pct: val });
                }}
                onValueCommit={([val]) => {
                  setHumidityLocal(val);
                  setWeather({ humidity_pct: val });
                }}
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
                value={[windLocal]}
                min={0}
                max={80}
                step={2}
                onValueChange={([val]) => {
                  setWindLocal(val);
                  scheduleCommit({ wind_kmh: val });
                }}
                onValueCommit={([val]) => {
                  setWindLocal(val);
                  setWeather({ wind_kmh: val });
                }}
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
            onCheckedChange={(checked) => {
              ensureManual();
              setWeather({ is_wet: checked ? 1 : 0 });
            }}
            className="data-[state=checked]:bg-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
