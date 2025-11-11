import { useEffect } from "react";
import { MapWebNative as MapWeb } from "@/components/MapWebNative";
import { HourSlider } from "@/components/HourSlider";
import { VehicleSelect } from "@/components/VehicleSelect";
import { MapStyleSelector } from "@/components/MapStyleSelector";
import { Legend } from "@/components/Legend";
import { SegmentInfoCard } from "@/components/SegmentInfoCard";
import { TopSpotsPanel } from "@/components/TopSpotsPanel";
import { useUiStore } from "@/store/useUiStore";
import { useRiskStore } from "@/store/useRiskStore";
import { riskApi } from "@/lib/api/client";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Database } from "lucide-react";
import { toast } from "sonner";

export default function MapOverview() {
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, vehicle, mockMode]);

  const loadData = async () => {
    console.log("🔄 Loading data... hour:", hour, "vehicle:", vehicle, "mockMode:", mockMode);
    setLoading(true);
    setError(null);
    try {
      riskApi.setMockMode(mockMode);
      
      const [segments, spots] = await Promise.all([
        riskApi.getSegmentsToday(config.domain.bounds, hour, vehicle),
        riskApi.getTopSpots(vehicle, 10),
      ]);

      console.log("✅ Data loaded! Segments:", segments.features.length, "Spots:", spots.length);
      console.log("📦 First segment:", segments.features[0]);
      setSegmentsToday(segments.features);
      setTopSpots(spots);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      console.error("❌ Failed to load data:", message, err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">DriverAlert</h1>
            <p className="text-sm text-muted-foreground">
              Vehicle-Specific Accident Risk Viewer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={mockMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newMode = !mockMode;
                setMockMode(newMode);
                toast.info(newMode ? "Mock mode enabled" : "Live mode enabled");
              }}
            >
              <Database className="mr-2 h-4 w-4" />
              {mockMode ? "Mock" : "Live"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Controls */}
        <aside className="w-80 space-y-4 overflow-y-auto border-r bg-background p-4">
          <VehicleSelect value={vehicle} onChange={setVehicle} />
          <MapStyleSelector value={mapStyle} onChange={setMapStyle} />
          <HourSlider value={hour} onChange={setHour} />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToNow}
              className="flex-1"
            >
              <Clock className="mr-2 h-4 w-4" />
              Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapCenter(config.domain.center)}
              className="flex-1"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          <Legend />

          <div className="pt-2">
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
        </aside>

        {/* Map */}
        <main className="relative flex-1">
          {isLoading && (
            <div className="absolute left-4 top-4 z-10 rounded-lg bg-card px-3 py-2 text-sm shadow-lg">
              Loading...
            </div>
          )}
          <MapWeb
            center={mapCenter}
            segments={segmentsToday}
            onSegmentClick={setSelectedSegment}
            onCenterChange={setMapCenter}
          />
        </main>

        {/* Right Panel - Segment Details */}
        {selectedSegment && (
          <aside className="w-80 overflow-y-auto border-l bg-background p-4">
            <SegmentInfoCard
              segment={selectedSegment}
              onClose={() => setSelectedSegment(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
