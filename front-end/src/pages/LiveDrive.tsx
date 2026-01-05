import { useState, useEffect, useRef } from "react";
import { MapWeb } from "@/components/MapWeb";
import { VehicleSelect } from "@/components/VehicleSelect";
import { MapStyleSelector } from "@/components/MapStyleSelector";
import { HourSlider } from "@/components/HourSlider";
import { RiskBanner } from "@/components/RiskBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUiStore } from "@/store/useUiStore";
import { useRiskStore } from "@/store/useRiskStore";
import { riskApi } from "@/lib/api/client";
import { WeatherPanel } from "@/components/WeatherPanel";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Play, Pause, Navigation, MapPinned, Radio, Menu, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { reverseGeocode } from "@/lib/api/routingService";
import routeDemoData from "@/fixtures/route_demo.json";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export default function LiveDrive() {
  const { vehicle, mapStyle, setVehicle, setMapStyle, hour, setHour } = useUiStore();
  const { currentScore, setCurrentScore, setLoading, weather: storeWeather, weatherMode, liveWeather, getActiveWeather } = useRiskStore();
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [routeIndex, setRouteIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const demoRoute = (routeDemoData.geometry.coordinates as number[][]).map(
    ([lng, lat]) => ({ lat, lng })
  );

  useEffect(() => {
    if (!currentPosition) {
      setCurrentPosition(config.domain.center);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchScore = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const activeWeather = getActiveWeather();
      const score = await riskApi.score({ 
        lat, 
        lon: lng, 
        vehicle,
        hour,
        ...activeWeather
      });
      setCurrentScore(score);
    } catch (err) {
      console.error("Failed to fetch risk score:", err);
      toast.error("Failed to fetch risk score");
    } finally {
      setLoading(false);
    }
  };

  const startLiveTracking = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported");
      return;
    }
    setIsLiveTracking(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition({ lat: latitude, lng: longitude });
        fetchScore(latitude, longitude);
        const address = await reverseGeocode(latitude, longitude);
        setCurrentAddress(address);
        toast.success("Live tracking active");
      },
      (error) => {
        toast.error("Location access denied");
        setIsLiveTracking(false);
      },
      { enableHighAccuracy: true }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition({ lat: latitude, lng: longitude });
        fetchScore(latitude, longitude);
        if (Math.random() < 0.1) {
          const address = await reverseGeocode(latitude, longitude);
          setCurrentAddress(address);
        }
      },
      null,
      { enableHighAccuracy: true }
    );
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    toast.info("Tracking stopped");
  };

  useEffect(() => {
    if (currentPosition && !isSimulating && !isLiveTracking) {
      fetchScore(currentPosition.lat, currentPosition.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPosition, vehicle, storeWeather, weatherMode, liveWeather, hour]);

  const startSimulation = () => {
    if (isLiveTracking) stopLiveTracking();
    setIsSimulating(true);
    setRouteIndex(0);
    intervalRef.current = setInterval(() => {
      setRouteIndex((prev) => {
        const next = (prev + 1) % demoRoute.length;
        const pos = demoRoute[next];
        setCurrentPosition(pos);
        fetchScore(pos.lat, pos.lng);
        return next;
      });
    }, 2000);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Top HUD */}
      <div className="absolute top-20 lg:top-6 left-6 right-6 z-10 flex flex-col lg:flex-row gap-4 pointer-events-none">
        {/* Left Stats */}
        <div className="pointer-events-auto flex flex-col gap-4 w-full lg:w-80">
          <div className="glass-panel p-5 rounded-[32px] border-white/10 shadow-2xl space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Telemetry</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn("h-1.5 w-1.5 rounded-full", isLiveTracking || isSimulating ? "bg-emerald-500 animate-pulse" : "bg-slate-500")} />
                  <span className="text-[10px] font-medium uppercase">{isLiveTracking ? "Live" : isSimulating ? "Sim" : "Idle"}</span>
                </div>
             </div>
             
             <VehicleSelect value={vehicle} onChange={setVehicle} />
             <WeatherPanel location={currentPosition || undefined} />
             
             <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5">
                <HourSlider value={hour} onChange={setHour} />
             </div>

             <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={isLiveTracking ? stopLiveTracking : startLiveTracking}
                  className={cn("rounded-2xl h-12 shadow-lg", isLiveTracking ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 border-rose-500/30" : "")}
                  variant={isLiveTracking ? "outline" : "default"}
                  disabled={isSimulating}
                >
                  <MapPinned className={cn("mr-2 h-4 w-4", isLiveTracking && "animate-pulse")} />
                  {isLiveTracking ? "Stop" : "Live"}
                </Button>
                <Button
                  onClick={isSimulating ? stopSimulation : startSimulation}
                  className={cn("rounded-2xl h-12 shadow-lg", isSimulating ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 border-rose-500/30" : "")}
                  variant={isSimulating ? "outline" : "secondary"}
                  disabled={isLiveTracking}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isSimulating ? "Stop" : "Demo"}
                </Button>
             </div>
          </div>
        </div>

        {/* Center Risk Meter */}
        <div className="flex-1 flex justify-center items-start lg:pt-4">
           {currentScore && (
             <div className="pointer-events-auto animate-in fade-in zoom-in duration-500">
               <div className="glass-panel px-8 py-4 rounded-full border-white/10 shadow-2xl flex items-center gap-6">
                 <div className="flex flex-col items-center">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risk Index</span>
                   <span className={cn(
                     "text-3xl font-black tabular-nums",
                     currentScore.risk_0_100 > 70 ? "text-rose-500" : currentScore.risk_0_100 > 40 ? "text-amber-500" : "text-emerald-500"
                   )}>
                     {currentScore.risk_0_100}
                   </span>
                 </div>
                 <div className="h-10 w-px bg-white/10" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Hazard</span>
                    <span className="text-sm font-semibold capitalize">{currentScore.top_cause.replace(/_/g, ' ')}</span>
                 </div>
               </div>
             </div>
           )}
        </div>

        {/* Right Info */}
        <div className="pointer-events-auto w-full lg:w-80 flex flex-col gap-4">
          <div className="glass-panel p-5 rounded-[32px] border-white/10 shadow-2xl space-y-4">
            <MapStyleSelector value={mapStyle} onChange={setMapStyle} />
            
            {currentPosition && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Navigation className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Location Coordinates</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                    <div className="text-[8px] uppercase text-muted-foreground">Lat</div>
                    <div className="text-xs font-mono">{currentPosition.lat.toFixed(5)}</div>
                  </div>
                  <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                    <div className="text-[8px] uppercase text-muted-foreground">Lng</div>
                    <div className="text-xs font-mono">{currentPosition.lng.toFixed(5)}</div>
                  </div>
                </div>
                {currentAddress && (
                  <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 text-[11px] font-medium leading-relaxed">
                    {currentAddress}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="h-full w-full relative">
        {currentPosition && (
          <MapWeb
            center={currentPosition}
            segments={[]}
            onCenterChange={() => {}}
          />
        )}
        
        {/* User Marker Overlay (Always Center in Live) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-primary/20 animate-ping absolute inset-0" />
            <div className="h-4 w-4 rounded-full bg-primary border-2 border-white shadow-[0_0_20px_rgba(59,130,246,0.5)] relative z-10" />
          </div>
        </div>

        {/* Alert Zone (Fullscreen Flash) */}
        {currentScore && currentScore.risk_0_100 > 80 && (
          <div className="absolute inset-0 pointer-events-none ring-[20px] ring-rose-500/20 animate-pulse bg-rose-500/5" />
        )}
      </main>

      {/* Warning Overlay */}
      {currentScore && currentScore.risk_0_100 > 70 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-rose-600 text-white px-8 py-4 rounded-full shadow-[0_0_50px_rgba(225,29,72,0.4)] flex items-center gap-4 animate-bounce">
            <ShieldAlert className="h-6 w-6" />
            <div className="flex flex-col">
              <span className="font-black uppercase tracking-tighter italic">Danger Detected</span>
              <span className="text-[10px] font-bold opacity-80 uppercase">Immediate Caution Required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
