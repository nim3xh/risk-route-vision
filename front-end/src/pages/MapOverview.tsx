import { useEffect, useState } from "react";
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
import { MapPin, Clock, Database, Menu, X, AlertTriangle, Activity, Cpu } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MapOverview() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>("labels");
  const [useRealtimeModel, setUseRealtimeModel] = useState(false); // Toggle for realtime ML model
  const { weather: storeWeather, weatherMode, liveWeather, getActiveWeather } = useRiskStore();
  const { hour, vehicle, mockMode, mapCenter, mapStyle, setHour, setVehicle, setMockMode, setMapCenter, setMapStyle, resetToNow } = useUiStore();
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

  const riskStats = getRiskStats();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, vehicle, mockMode, storeWeather, weatherMode, liveWeather, useRealtimeModel]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      riskApi.setMockMode(mockMode);
      const activeWeather = getActiveWeather();
      
      // Choose between historical (fast, cached) and realtime (ML-based) predictions
      const segmentsPromise = useRealtimeModel 
        ? riskApi.getSegmentsRealtime(config.domain.bounds, hour, vehicle, activeWeather)
        : riskApi.getSegmentsToday(config.domain.bounds, hour, vehicle, activeWeather);
      
      const [segments, spots] = await Promise.all([
        segmentsPromise,
        riskApi.getTopSpots(vehicle, 10),
      ]);
      setSegmentsToday(segments.features);
      setTopSpots(spots);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-slate-950">
      {/* Floating Controls Overlay */}
      <div className="absolute top-4 lg:top-6 left-4 lg:left-6 z-10 flex flex-col gap-4 pointer-events-none w-[340px] max-w-[calc(100vw-2rem)]">
        <div className="pointer-events-auto glass-panel p-5 rounded-[28px] space-y-5 shadow-2xl border-white/10 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-1.5 bg-gradient-to-b from-primary via-primary to-primary/50 rounded-full" />
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-primary">Control Center</h3>
                <p className="text-[10px] opacity-60">Risk Analysis Settings</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={useRealtimeModel ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  setUseRealtimeModel(!useRealtimeModel);
                  toast.success(
                    useRealtimeModel 
                      ? "Switched to Historical Mode - Using cached data" 
                      : "Switched to Realtime ML Mode - Independent risk prediction per cell",
                    { duration: 3000 }
                  );
                }}
                className="h-9 w-9 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
                title={useRealtimeModel ? "Using Realtime XGBoost Model - Each cell calculated independently" : "Using Historical Data"}
              >
                <Cpu className="h-4 w-4" />
              </Button>
              <Button
                variant={mockMode ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  setMockMode(!mockMode);
                  toast.info(mockMode ? "Live mode enabled" : "Mock mode enabled");
                }}
                className="h-9 w-9 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <Database className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Controls */}
          <div className="space-y-4">
            {/* Model Mode Indicator */}
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-primary">
                    {useRealtimeModel ? "⚡ Realtime XGBoost Model" : "📊 Historical Data"}
                  </div>
                  <div className="text-[10px] opacity-60">
                    {useRealtimeModel 
                      ? "Independent ML prediction per grid cell" 
                      : "Using cached historical analysis"}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Vehicle Type</label>
              <VehicleSelect value={vehicle} onChange={setVehicle} />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Map Style</label>
              <MapStyleSelector value={mapStyle} onChange={setMapStyle} />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Weather</label>
              <WeatherPanel location={mapCenter} />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2 block">Time of Day</label>
              <HourSlider value={hour} onChange={setHour} />
            </div>
            
            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-3 block">Visualization Mode</label>
              <RiskVisualizationToggle 
                mode={visualizationMode}
                onChange={setVisualizationMode}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <Button
              variant="secondary"
              size="sm"
              onClick={resetToNow}
              className="rounded-2xl font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Clock className="mr-2 h-4 w-4" />
              Now
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMapCenter(config.domain.center)}
              className="rounded-2xl font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="pointer-events-auto glass-panel p-5 rounded-[28px] shadow-2xl border-white/10 backdrop-blur-xl">
          <Legend />
        </div>

        {/* Risk Analysis Stats */}
        {riskStats.totalSegments > 0 && (
          <div className="pointer-events-auto glass-panel p-5 rounded-[32px] border-white/10 shadow-2xl animate-in fade-in duration-500">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <Activity className="h-4 w-4 text-primary" />
                 <h3 className="text-sm font-black uppercase tracking-wider text-gradient">Area Intelligence</h3>
               </div>
               {useRealtimeModel && (
                 <Badge variant="default" className="rounded-full px-2 py-0.5 text-[9px] font-bold animate-pulse">
                   REALTIME ML
                 </Badge>
               )}
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Segments</span>
                  <div className="text-lg font-black italic">{riskStats.totalSegments} <span className="text-xs uppercase opacity-60">analyzed</span></div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Coverage</span>
                  <div className="text-lg font-black italic">{((riskStats.totalSegments * 0.1).toFixed(1))} <span className="text-xs uppercase opacity-60">km</span></div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">ML Risk Analysis</span>
                  <Badge variant={riskStats.maxRisk > 70 ? "destructive" : "secondary"} className="rounded-full px-3">
                    Priority {riskStats.maxRisk > 70 ? "High" : "Standard"}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between text-xs font-bold uppercase tabular-nums">
                       <span>Peak Risk</span>
                       <span className={cn(riskStats.maxRisk > 70 ? "text-rose-500" : "text-primary")}>{riskStats.maxRisk}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", riskStats.maxRisk > 70 ? "bg-rose-500" : "bg-primary")} 
                          style={{ width: `${riskStats.maxRisk}%` }} 
                        />
                     </div>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between text-xs font-bold uppercase tabular-nums">
                       <span>Average Risk</span>
                       <span className="text-muted-foreground">{riskStats.avgRisk}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary/60 transition-all duration-1000" 
                          style={{ width: `${riskStats.avgRisk}%` }} 
                        />
                     </div>
                  </div>
                </div>
                
                {/* Risk Distribution */}
                <div className="bg-slate-900/50 border border-white/5 p-3 rounded-2xl space-y-2">
                   <div className="text-[10px] font-bold uppercase text-muted-foreground">Risk Distribution</div>
                   <div className="grid grid-cols-3 gap-2 text-[11px]">
                     <div>
                       <div className="text-muted-foreground">Low</div>
                       <div className="font-bold text-green-400">{riskStats.lowRiskCount}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground">Medium</div>
                       <div className="font-bold text-amber-400">{riskStats.mediumRiskCount}</div>
                     </div>
                     <div>
                       <div className="text-muted-foreground">High</div>
                       <div className="font-bold text-rose-500">{riskStats.highRiskCount}</div>
                     </div>
                   </div>
                </div>
                
                {riskStats.topCause && (
                  <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl">
                     <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Primary Risk Factor</div>
                     <div className="text-sm font-bold text-primary capitalize">{riskStats.topCause.replace(/_/g, ' ')}</div>
                  </div>
                )}
                
                {riskStats.modelFactors && (
                  <div className="bg-slate-900/50 border border-white/5 p-3 rounded-2xl space-y-2">
                     <div className="text-[10px] font-bold uppercase text-muted-foreground">Model Factors (Avg)</div>
                     <div className="grid grid-cols-2 gap-2 text-[11px]">
                       <div>
                         <div className="text-muted-foreground">Curvature</div>
                         <div className="font-bold">{(riskStats.modelFactors.curvature * 100).toFixed(1)}%</div>
                       </div>
                       <div>
                         <div className="text-muted-foreground">Wetness</div>
                         <div className="font-bold">{(riskStats.modelFactors.surface_wetness_prob * 100).toFixed(0)}%</div>
                       </div>
                       <div>
                         <div className="text-muted-foreground">Wind Speed</div>
                         <div className="font-bold">{riskStats.modelFactors.wind_speed.toFixed(1)} km/h</div>
                       </div>
                       <div>
                         <div className="text-muted-foreground">Vehicle</div>
                         <div className="font-bold">{vehicle.toUpperCase()}</div>
                       </div>
                     </div>
                  </div>
                )}

                {riskStats.maxRisk > 70 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex gap-3 items-center">
                     <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                     <p className="text-[11px] font-bold uppercase text-rose-500 leading-tight">High incident probability detected in this area.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        <div className="pointer-events-auto glass-panel p-5 rounded-[28px] shadow-2xl border-white/10 backdrop-blur-xl max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <TopSpotsPanel
            spots={topSpots}
            onSelectSpot={(spot) => {
              setMapCenter({ lat: spot.lat, lng: spot.lon });
              const segment = segmentsToday.find(
                (s) => s.properties.segment_id === spot.segment_id
              );
              if (segment) setSelectedSegment(segment);
            }}
          />
        </div>
      </div>

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
        <MapWeb
          center={mapCenter}
          segments={segmentsToday}
          visualizationMode={visualizationMode}
          onSegmentClick={setSelectedSegment}
          onCenterChange={setMapCenter}
        />
      </main>

      {/* Dynamic Inspector Overlay */}
      {selectedSegment && (
        <div className="absolute top-4 lg:top-6 right-4 lg:right-6 bottom-4 lg:bottom-6 z-10 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col pointer-events-none animate-in slide-in-from-right duration-500">
          <div className="pointer-events-auto glass-panel p-6 rounded-[32px] border-white/10 shadow-2xl backdrop-blur-xl overflow-y-auto max-h-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <SegmentInfoCard
              segment={selectedSegment}
              onClose={() => setSelectedSegment(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
