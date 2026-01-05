import { useState } from "react";
import { MapWeb } from "@/components/MapWeb";
import { VehicleSelect } from "@/components/VehicleSelect";
import { MapStyleSelector } from "@/components/MapStyleSelector";
import { HourSlider } from "@/components/HourSlider";
import { LocationSearch } from "@/components/LocationSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUiStore } from "@/store/useUiStore";
import { riskApi } from "@/lib/api/client";
import { WeatherPanel } from "@/components/WeatherPanel";
import { useRiskStore } from "@/store/useRiskStore";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Navigation, AlertTriangle, Route as RouteIcon, MapPinned, Clock, Menu } from "lucide-react";
import { toast } from "sonner";
import { samplePolyline, samplePolylineByCount } from "@/lib/geo/sampling";
import { Badge } from "@/components/ui/badge";
import { getRoute, reverseGeocode } from "@/lib/api/routingService";
import { SegmentFeature } from "@/types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export default function RouteLookAhead() {
  const { vehicle, mapStyle, setVehicle, setMapStyle, hour, setHour } = useUiStore();
  const { weather: storeWeather, weatherMode, liveWeather, getActiveWeather } = useRiskStore();
  const [fromLocation, setFromLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [toLocation, setToLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [routeSegments, setRouteSegments] = useState<SegmentFeature[]>([]);
  const [routeLine, setRouteLine] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [maxRisk, setMaxRisk] = useState<number | null>(null);
  const [avgRisk, setAvgRisk] = useState<number | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [modelExplain, setModelExplain] = useState<Record<string, number> | null>(null);
  const [topCause, setTopCause] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ 
    lat: config.domain.center.lat, 
    lng: config.domain.center.lng 
  });

  const useCurrentLocation = () => {
    if ("geolocation" in navigator) {
      toast.info("Locating...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const name = await reverseGeocode(latitude, longitude);
          setFromLocation({ lat: latitude, lng: longitude, name });
          setMapCenter({ lat: latitude, lng: longitude });
          toast.success("Departure set to current location");
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  const analyzeRoute = async () => {
    if (!fromLocation || !toLocation) {
      toast.error("Set both endpoints");
      return;
    }

    setIsAnalyzing(true);
    setIsFetchingRoute(true);
    try {
      // Get the route coordinates
      const routeResult = await getRoute(
        { lat: fromLocation.lat, lng: fromLocation.lng },
        { lat: toLocation.lat, lng: toLocation.lng },
        'driving-car'
      );
      
      setRouteDistance(routeResult.distance);
      setRouteDuration(routeResult.duration);
      setIsFetchingRoute(false);
      
      setRouteLine({
        type: "Feature",
        geometry: { type: "LineString", coordinates: routeResult.coordinates },
        properties: {},
      });
      
      // Sample the route for analysis - use fixed count to ensure full coverage
      const sampledPoints = samplePolylineByCount(routeResult.coordinates, 100);
      const pointsToAnalyze = sampledPoints;
      
      // Use the /risk/score endpoint with the full route for model-based analysis
      const coordinates = pointsToAnalyze.map(p => ({ lat: p.lat, lon: p.lon }));
      
      const activeWeather = getActiveWeather();
      const routeRiskData = await riskApi.scoreRoute(
        coordinates,
        vehicle,
        new Date().toISOString(),
        hour,
        activeWeather ? {
          temperature_c: activeWeather.temperature_c,
          humidity_pct: activeWeather.humidity_pct,
          precip_mm: activeWeather.precip_mm,
          wind_kmh: activeWeather.wind_kmh,
          is_wet: activeWeather.is_wet,
        } : undefined
      );
      
      console.log('Route analysis debug:', {
        totalCoordinates: coordinates.length,
        segmentScoresCount: routeRiskData.segmentScores?.length || 0,
        segmentCausesCount: routeRiskData.segmentCauses?.length || 0,
        segmentCoordinatesCount: routeRiskData.segmentCoordinates?.length || 0,
        firstFewScores: routeRiskData.segmentScores?.slice(0, 5),
        lastFewScores: routeRiskData.segmentScores?.slice(-5)
      });
      
      // Create segment features ONLY for Ginigathhena coordinates (filtered by backend)
      // segmentCoordinates is [[lat, lon], ...] format from backend
      const segments = routeRiskData.segmentCoordinates.map((coord, idx) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [coord[1], coord[0]], // [lon, lat] for GeoJSON
        },
        properties: {
          segment_id: `route_${idx}`,
          risk_0_100: Math.round(routeRiskData.segmentScores[idx] * 100),
          hour: hour || new Date().getHours(),
          vehicle,
          top_cause: routeRiskData.segmentCauses?.[idx] || "unknown",
          rate_score: routeRiskData.rateScores?.[idx] || 0,
        },
      }));
      
      setRouteSegments(segments);

      // Calculate risk statistics
      const risks = segments.map((s) => s.properties.risk_0_100);
      setMaxRisk(Math.max(...risks));
      setAvgRisk(Math.round(risks.reduce((sum, r) => sum + r, 0) / risks.length));
      
      // Store model explanation
      setModelExplain(routeRiskData.explain);
      
      // Get most common top cause
      const causeCounts = routeRiskData.segmentCauses.reduce((acc, cause) => {
        acc[cause] = (acc[cause] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topCauseEntry = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0];
      setTopCause(topCauseEntry ? topCauseEntry[0] : null);

      const bbox = routeResult.bbox;
      setMapCenter({ lat: (bbox[1] + bbox[3]) / 2, lng: (bbox[0] + bbox[2]) / 2 });
      
      toast.success(`Route analyzed: ${segments.length} segments with ML models`);
      
    } catch (err) {
      console.error("Route analysis error:", err);
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Route Planner Overlay */}
      <div className="absolute top-20 lg:top-6 left-6 z-10 w-full max-w-[calc(100%-3rem)] lg:w-96 pointer-events-none flex flex-col gap-4">
        <div className="pointer-events-auto glass-panel p-6 rounded-[32px] border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black italic tracking-tighter text-gradient uppercase">Pathfinder</h2>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
               <LocationSearch
                label="Departure"
                placeholder="Where from?"
                onLocationSelect={setFromLocation}
                disabled={isAnalyzing}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={useCurrentLocation}
                className="h-7 text-[10px] uppercase font-bold text-primary hover:bg-primary/10 rounded-full px-3"
              >
                <MapPinned className="mr-1.5 h-3 w-3" />
                Current Location
              </Button>
            </div>

            <LocationSearch
              label="Destination"
              placeholder="Where to?"
              onLocationSelect={setToLocation}
              disabled={isAnalyzing}
            />

            <div className="pt-2">
              <VehicleSelect value={vehicle} onChange={setVehicle} />
            </div>

            <div className="pt-2">
              <div className="flex bg-slate-900/50 p-3 rounded-2xl border border-white/5">
                <HourSlider value={hour} onChange={setHour} />
              </div>
            </div>

            <Button
              onClick={analyzeRoute}
              disabled={isAnalyzing || !fromLocation || !toLocation}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 group"
            >
              {isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                  <span>Analyze Path</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Route Stats Overlay */}
        {(routeDistance || maxRisk) && (
          <div className="pointer-events-auto glass-panel p-5 rounded-[32px] border-white/10 shadow-2xl animate-in fade-in slide-in-from-left duration-500">
             <div className="flex items-center gap-2 mb-4">
               <RouteIcon className="h-4 w-4 text-primary" />
               <h3 className="text-sm font-black uppercase tracking-wider text-gradient">Route Intelligence</h3>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                {routeDistance && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Distance</span>
                    <div className="text-lg font-black italic">{(routeDistance/1000).toFixed(1)} <span className="text-xs uppercase opacity-60">km</span></div>
                  </div>
                )}
                {routeDuration && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">E.T.A</span>
                    <div className="text-lg font-black italic">{Math.round(routeDuration/60)} <span className="text-xs uppercase opacity-60">min</span></div>
                  </div>
                )}
                {routeSegments.length > 0 && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Analyzed Segments</span>
                    <div className="text-lg font-black italic">{routeSegments.length} <span className="text-xs uppercase opacity-60">points</span></div>
                  </div>
                )}
             </div>

             {maxRisk !== null && (
               <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">ML Risk Analysis</span>
                    <Badge variant={maxRisk > 70 ? "destructive" : "secondary"} className="rounded-full px-3">
                      Priority {maxRisk > 70 ? "High" : "Standard"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex-1 space-y-2">
                       <div className="flex justify-between text-xs font-bold uppercase tabular-nums">
                         <span>Peak Risk</span>
                         <span className={cn(maxRisk > 70 ? "text-rose-500" : "text-primary")}>{maxRisk}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", maxRisk > 70 ? "bg-rose-500" : "bg-primary")} 
                            style={{ width: `${maxRisk}%` }} 
                          />
                       </div>
                    </div>
                    
                    {avgRisk !== null && (
                      <div className="flex-1 space-y-2">
                         <div className="flex justify-between text-xs font-bold uppercase tabular-nums">
                           <span>Average Risk</span>
                           <span className="text-muted-foreground">{avgRisk}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary/60 transition-all duration-1000" 
                              style={{ width: `${avgRisk}%` }} 
                            />
                         </div>
                      </div>
                    )}
                  </div>
                  
                  {topCause && (
                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl">
                       <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Primary Risk Factor</div>
                       <div className="text-sm font-bold text-primary capitalize">{topCause.replace(/_/g, ' ')}</div>
                    </div>
                  )}
                  
                  {modelExplain && (
                    <div className="bg-slate-900/50 border border-white/5 p-3 rounded-2xl space-y-2">
                       <div className="text-[10px] font-bold uppercase text-muted-foreground">Model Factors</div>
                       <div className="grid grid-cols-2 gap-2 text-[11px]">
                         {modelExplain.curvature !== undefined && (
                           <div>
                             <div className="text-muted-foreground">Curvature</div>
                             <div className="font-bold">{(modelExplain.curvature * 100).toFixed(1)}%</div>
                           </div>
                         )}
                         {modelExplain.surface_wetness_prob !== undefined && (
                           <div>
                             <div className="text-muted-foreground">Wetness</div>
                             <div className="font-bold">{(modelExplain.surface_wetness_prob * 100).toFixed(0)}%</div>
                           </div>
                         )}
                         {modelExplain.wind_speed !== undefined && (
                           <div>
                             <div className="text-muted-foreground">Wind</div>
                             <div className="font-bold">{modelExplain.wind_speed.toFixed(1)} km/h</div>
                           </div>
                         )}
                         {modelExplain.vehicle_factor !== undefined && (
                           <div>
                             <div className="text-muted-foreground">Vehicle</div>
                             <div className="font-bold">×{modelExplain.vehicle_factor.toFixed(2)}</div>
                           </div>
                         )}
                       </div>
                    </div>
                  )}

                  {maxRisk > 70 && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex gap-3 items-center">
                       <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                       <p className="text-[11px] font-bold uppercase text-rose-500 leading-tight">High incident probability detected on this path.</p>
                    </div>
                  )}
               </div>
             )}
          </div>
        )}
      </div>

      {/* Right Settings Toggle */}
      <div className="absolute top-20 lg:top-6 right-6 z-10 pointer-events-none">
         <div className="pointer-events-auto glass-panel p-4 rounded-[32px] border-white/10 shadow-2xl space-y-4 w-72">
            <WeatherPanel location={mapCenter} />
            <MapStyleSelector value={mapStyle} onChange={setMapStyle} />
         </div>
      </div>

      <main className="h-full w-full relative">
        <MapWeb
          center={mapCenter}
          segments={routeSegments}
          routeLine={routeLine}
          onCenterChange={setMapCenter}
        />
      </main>
    </div>
  );
}
