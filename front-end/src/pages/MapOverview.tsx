import { useEffect, useMemo, useRef, useState } from "react";
import { MapWebNative as MapWeb } from "@/components/MapWebNative";
import { HourSlider } from "@/components/HourSlider";
import { VehicleSelect } from "@/components/VehicleSelect";
import { MapStyleSelector } from "@/components/MapStyleSelector";
import { Legend } from "@/components/Legend";
import { SegmentInfoCard } from "@/components/SegmentInfoCard";
import { TopSpotsPanel } from "@/components/TopSpotsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RiskVisualizationToggle, VisualizationMode } from "@/components/RiskVisualizationToggle";
import { useUiStore } from "@/store/useUiStore";
import { useRiskStore } from "@/store/useRiskStore";
import { riskApi } from "@/lib/api/client";
import { WeatherPanel } from "@/components/WeatherPanel";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Database, AlertTriangle, Activity, Cpu, SlidersHorizontal, Navigation, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SegmentFeature } from "@/types";

export default function MapOverview() {
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>("labels");
  const { hour, vehicle, mockMode, mapCenter, mapStyle, setHour, setVehicle, setMockMode, setMapCenter, setMapStyle, resetToNow } = useUiStore();
  const [hourLocal, setHourLocal] = useState(hour); // Smooth hour slider state
  const { weather: storeWeather, weatherMode, liveWeather, getActiveWeather } = useRiskStore();
  const {
    segmentsToday,
    selectedSegment,
    topSpots,
    isLoading,
    setSegmentsToday,
    setSelectedSegment,
    setTopSpots,
    setLoading,
    setError,
  } = useRiskStore();

  const requestIdRef = useRef(0); // Guards against stale in-flight requests
  const hourCommitRef = useRef<NodeJS.Timeout | null>(null);

  // Risk statistics
  const getRiskStats = () => {
    if (!segmentsToday || segmentsToday.length === 0) {
      return { 
        maxRisk: 0, 
        avgRisk: 0, 
        highRiskCount: 0, 
        mediumRiskCount: 0, 
        lowRiskCount: 0,
        totalSegments: 0, 
        topCause: null,
        modelFactors: null
      };
    }
    
    const risks = segmentsToday.map((s) => s.properties.risk_0_100);
    const maxRisk = Math.max(...risks);
    const avgRisk = Math.round(risks.reduce((sum, r) => sum + r, 0) / risks.length);
    const highRiskCount = risks.filter(r => r > 70).length;
    const mediumRiskCount = risks.filter(r => r >= 40 && r <= 70).length;
    const lowRiskCount = risks.filter(r => r < 40).length;
    
    // Get most common top cause
    const causeCounts = segmentsToday.reduce((acc, seg) => {
      const cause = seg.properties.top_cause || "unknown";
      acc[cause] = (acc[cause] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topCauseEntry = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0];
    
    // Calculate average model factors if available
    const segmentsWithFactors = segmentsToday.filter(s => s.properties.curvature !== undefined);
    const modelFactors = segmentsWithFactors.length > 0 ? {
      curvature: segmentsWithFactors.reduce((sum, s) => sum + (s.properties.curvature || 0), 0) / segmentsWithFactors.length,
      surface_wetness_prob: segmentsWithFactors.reduce((sum, s) => sum + (s.properties.surface_wetness_prob || 0), 0) / segmentsWithFactors.length,
      wind_speed: segmentsWithFactors.reduce((sum, s) => sum + (s.properties.wind_speed || 0), 0) / segmentsWithFactors.length,
    } : null;
    
    return { 
      maxRisk, 
      avgRisk, 
      highRiskCount,
      mediumRiskCount,
      lowRiskCount, 
      totalSegments: segmentsToday.length,
      topCause: topCauseEntry ? topCauseEntry[0] : null,
      modelFactors
    };
  };

  // Derive a local leaderboard from the currently visible segments so it always matches the latest risk fetch (weather/time/vehicle aware).
  const deriveTopSpots = (features: typeof segmentsToday, limit: number = 10) => {
    return [...features]
      .filter((f) => typeof f?.properties?.risk_0_100 === "number")
      .sort((a, b) => b.properties.risk_0_100 - a.properties.risk_0_100)
      .slice(0, limit)
      .map((feature) => {
        const coords = feature.geometry.type === "LineString"
          ? (feature.geometry.coordinates[0] as number[])
          : (feature.geometry.coordinates as number[]);
        const [lon, lat] = coords || [config.domain.center.lng, config.domain.center.lat];
        return {
          segment_id: feature.properties.segment_id,
          lat,
          lon,
          risk_0_100: feature.properties.risk_0_100,
          rate_pred: feature.properties.rate_pred,
          vehicle: feature.properties.vehicle,
          hour: feature.properties.hour,
          top_cause: feature.properties.top_cause,
        };
      });
  };

  const mergeSegments = (historical: SegmentFeature[], realtime: SegmentFeature[]) => {
    const merged = new Map<string, SegmentFeature>();

    historical.forEach((segment) => {
      merged.set(segment.properties.segment_id, {
        ...segment,
        properties: {
          ...segment.properties,
          risk_historical: segment.properties.risk_0_100,
          model_source: "historical",
        },
      });
    });

    realtime.forEach((segment) => {
      const existing = merged.get(segment.properties.segment_id);
      if (existing) {
        const riskHistorical = existing.properties.risk_historical ?? existing.properties.risk_0_100;
        const riskRealtime = segment.properties.risk_0_100;
        const mergedRisk = (riskHistorical + riskRealtime) / 2; // consider both model outputs equally

        merged.set(segment.properties.segment_id, {
          ...existing,
          geometry: existing.geometry || segment.geometry,
          properties: {
            ...existing.properties,
            ...segment.properties,
            risk_historical: riskHistorical,
            risk_realtime: riskRealtime,
            risk_0_100: mergedRisk,
            model_source: "blended",
          },
        });
      } else {
        merged.set(segment.properties.segment_id, {
          ...segment,
          properties: {
            ...segment.properties,
            risk_historical: undefined,
            risk_realtime: segment.properties.risk_0_100,
            risk_0_100: segment.properties.risk_0_100,
            model_source: "realtime",
          },
        });
      }
    });

    return Array.from(merged.values());
  };

  const riskStats = useMemo(() => getRiskStats(), [segmentsToday]);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadData();
    }, 400); // Slightly quicker to reflect weather changes while still avoiding spam during drags

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, vehicle, mockMode, storeWeather, weatherMode, liveWeather]);

  useEffect(() => {
    setHourLocal(hour);
  }, [hour]);

  const handleHourChange = (val: number) => {
    setHourLocal(val);
    if (hourCommitRef.current) clearTimeout(hourCommitRef.current);
    hourCommitRef.current = setTimeout(() => setHour(val), 250);
  };

  const handleHourCommit = (val: number) => {
    if (hourCommitRef.current) clearTimeout(hourCommitRef.current);
    setHourLocal(val);
    setHour(val);
  };

  const loadData = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      console.log('Loading data with params:', { hour, vehicle, mockMode });
      riskApi.setMockMode(mockMode);
      const activeWeather = getActiveWeather();
      console.log('Active weather:', activeWeather);
      
      const [historicalResult, realtimeResult, spotsResult] = await Promise.allSettled([
        riskApi.getSegmentsToday(config.domain.bounds, hour, vehicle, activeWeather),
        riskApi.getSegmentsRealtime(config.domain.bounds, hour, vehicle, activeWeather),
        riskApi.getTopSpots(vehicle, 10),
      ]);

      if (requestId !== requestIdRef.current) return; // Drop stale responses

      const historicalSegments = historicalResult.status === "fulfilled" ? historicalResult.value.features : [];
      const realtimeSegments = realtimeResult.status === "fulfilled" ? realtimeResult.value.features : [];
      const spots = spotsResult.status === "fulfilled" ? spotsResult.value : [];

      if (historicalResult.status === "rejected") {
        console.warn('Historical risk load failed:', historicalResult.reason);
      }
      if (realtimeResult.status === "rejected") {
        console.warn('Realtime risk load failed:', realtimeResult.reason);
      }

      if (historicalSegments.length === 0 && realtimeSegments.length === 0) {
        throw new Error("No risk data available from realtime or historical models");
      }

      console.log('Loaded historical segments:', historicalSegments.length);
      console.log('Loaded realtime segments:', realtimeSegments.length);
      console.log('Loaded spots:', spots?.length || 0);

      const blendedSegments = mergeSegments(historicalSegments, realtimeSegments);
      setSegmentsToday(blendedSegments);

      // Prefer derived leaderboard so it always matches current weather/time; fall back to API if empty
      const derived = deriveTopSpots(blendedSegments, 10);
      setTopSpots(derived.length > 0 ? derived : spots);
      
      if (blendedSegments.length === 0) {
        toast.info("No risk data available for this area. Try adjusting the map view.", { duration: 3000 });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      const message = err instanceof Error ? err.message : "Failed to load data";
      if (requestId === requestIdRef.current) {
        setError(message);
        toast.error(message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const ControlsPanel = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Control Rail</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            <Cpu className="h-4 w-4" />
            <span>Risk Display</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant={mockMode ? "default" : "outline"}
            className="rounded-2xl"
            onClick={() => {
              setMockMode(!mockMode);
              toast.info(mockMode ? "Live mode enabled" : "Mock mode enabled");
            }}
          >
            <Database className="mr-2 h-4 w-4" />
            {mockMode ? "Mock" : "Live"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
            <Navigation className="h-3 w-3" />
            <span>Vehicle & Weather</span>
          </div>
          <div className="space-y-3">
            <VehicleSelect value={vehicle} onChange={setVehicle} />
            <WeatherPanel location={mapCenter} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
            <Clock className="h-3 w-3" />
            <span>Time & Style</span>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-3">
            <HourSlider
              value={hourLocal}
              onChange={handleHourChange}
              onCommit={handleHourCommit}
            />
            <MapStyleSelector value={mapStyle} onChange={setMapStyle} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Visualization</span>
          </div>
          <RiskVisualizationToggle mode={visualizationMode} onChange={setVisualizationMode} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Utilities</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={resetToNow}>
            <Clock className="mr-2 h-4 w-4" />
            Now
          </Button>
          <Button variant="secondary" className="rounded-2xl" onClick={() => setMapCenter(config.domain.center)}>
            <MapPin className="mr-2 h-4 w-4" />
            Recenter
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
        <Legend />
      </div>
    </div>
  );

  const AreaPulse = () => (
    <div className="pointer-events-auto glass-panel p-5 rounded-[28px] border-white/10 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gradient">Area Pulse</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Peak</span>
          <div className={cn("text-xl font-black", riskStats.maxRisk > 70 ? "text-rose-500" : "text-primary")}>{riskStats.maxRisk}%</div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Average</span>
          <div className="text-xl font-black">{riskStats.avgRisk}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-2">
          <div className="text-muted-foreground">Low</div>
          <div className="font-bold text-emerald-400">{riskStats.lowRiskCount}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-2">
          <div className="text-muted-foreground">Medium</div>
          <div className="font-bold text-amber-400">{riskStats.mediumRiskCount}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-900/50 p-2">
          <div className="text-muted-foreground">High</div>
          <div className="font-bold text-rose-500">{riskStats.highRiskCount}</div>
        </div>
      </div>

      {riskStats.topCause && (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">Top Cause</div>
          <div className="text-sm font-bold capitalize text-primary">{riskStats.topCause.replace(/_/g, " ")}</div>
        </div>
      )}

      {riskStats.maxRisk > 70 && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <p className="text-[11px] font-semibold uppercase text-rose-500">High incident probability detected</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-slate-950">
      {/* Quick bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pointer-events-none">
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          <Button
            variant={mockMode ? "default" : "outline"}
            size="sm"
            className="rounded-full px-4"
            onClick={() => {
              setMockMode(!mockMode);
              toast.info(mockMode ? "Live mode" : "Mock mode");
            }}
          >
            <Database className="mr-2 h-4 w-4" />
            {mockMode ? "Mock" : "Live"}
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={resetToNow}>
            <Clock className="mr-2 h-4 w-4" />
            Now
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setMapCenter(config.domain.center)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recenter
          </Button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]">
            {riskStats.totalSegments} segments
          </Badge>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Controls
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
              <div className="py-4">
                <ControlsPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Right rail for desktop */}
      <aside className="hidden xl:block absolute top-4 right-4 bottom-4 z-10 w-96 pointer-events-none">
        <div className="pointer-events-auto glass-panel h-full rounded-[32px] border-white/10 shadow-2xl overflow-y-auto p-5">
          <ControlsPanel />
        </div>
      </aside>

      {/* Map Main */}
      <main className="flex-1 relative">
        {isLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-in fade-in duration-300">
            <div className="glass-panel px-8 py-4 rounded-[24px] flex items-center gap-4 shadow-2xl border-white/10 backdrop-blur-xl">
              <div className="relative">
                <div className="h-3 w-3 bg-primary rounded-full animate-ping" />
                <div className="absolute inset-0 h-3 w-3 bg-primary rounded-full" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight uppercase bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Analyzing Risk Data
                </div>
                <div className="text-[10px] opacity-60 mt-0.5">Please wait...</div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && riskStats.totalSegments === 0 && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10">
            <div className="glass-panel px-6 py-4 rounded-2xl border-dashed border-white/20 text-center max-w-sm">
              <div className="text-sm font-semibold">No risk data visible for this view.</div>
              <p className="text-xs text-muted-foreground mt-1">Move the map to load more coverage.</p>
            </div>
          </div>
        )}

        <MapWeb
          center={mapCenter}
          segments={segmentsToday}
          visualizationMode={visualizationMode}
          onSegmentClick={setSelectedSegment}
          onCenterChange={setMapCenter}
        />

        {/* Area pulse + spots (desktop) */}
        <div className="hidden lg:flex flex-col gap-3 absolute bottom-4 left-4 z-10 w-[360px] pointer-events-none">
          {riskStats.totalSegments > 0 && <AreaPulse />}
          <div className="pointer-events-auto glass-panel p-4 rounded-[28px] border-white/10 shadow-2xl max-h-[32vh] overflow-y-auto">
            <TopSpotsPanel
              spots={topSpots}
              onSelectSpot={(spot) => {
                setMapCenter({ lat: spot.lat, lng: spot.lon });
                const segment = segmentsToday.find((s) => s.properties.segment_id === spot.segment_id);
                if (segment) setSelectedSegment(segment);
              }}
            />
          </div>
        </div>
      </main>

      {/* Dynamic Inspector Overlay */}
      {selectedSegment && (
        <div className="absolute top-4 lg:top-6 right-4 lg:right-6 bottom-4 lg:bottom-6 z-20 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col pointer-events-none animate-in slide-in-from-right duration-500">
          <div className="pointer-events-auto glass-panel p-6 rounded-[32px] border-white/10 shadow-2xl backdrop-blur-xl overflow-y-auto max-h-full">
            <SegmentInfoCard segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
