import { useState } from "react";
import { MapWeb } from "@/components/MapWeb";
import { VehicleSelect } from "@/components/VehicleSelect";
import { useUiStore } from "@/store/useUiStore";
import { riskApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { samplePolyline } from "@/lib/geo/sampling";
import { riskToBand } from "@/lib/utils/colors";
import { Badge } from "@/components/ui/badge";
import routeDemoData from "@/fixtures/route_demo.json";
import { SegmentFeature } from "@/types";

export default function RouteLookAhead() {
  const { vehicle, mockMode, setVehicle } = useUiStore();
  const [destination, setDestination] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routeSegments, setRouteSegments] = useState<SegmentFeature[]>([]);
  const [maxRisk, setMaxRisk] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 7.3167, lng: 80.5333 });

  const analyzeRoute = async () => {
    setIsAnalyzing(true);
    setRouteSegments([]);
    setMaxRisk(null);

    try {
      riskApi.setMockMode(mockMode);
      
      // Use demo route for now
      const coordinates = routeDemoData.geometry.coordinates as number[][];
      const sampledPoints = samplePolyline(coordinates, 100);

      // Fetch risk for each point
      const riskPromises = sampledPoints.slice(0, 10).map((point, idx) =>
        riskApi.score({ lat: point.lat, lon: point.lon, vehicle }).then((score) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [point.lon, point.lat],
          },
          properties: {
            segment_id: `route_${idx}`,
            risk_0_100: score.risk_0_100,
            hour: new Date().getHours(),
            vehicle,
            top_cause: score.top_cause,
          },
        }))
      );

      const segments = await Promise.all(riskPromises);
      setRouteSegments(segments);

      const risks = segments.map((s) => s.properties.risk_0_100);
      const max = Math.max(...risks);
      setMaxRisk(max);

      if (max >= 70) {
        toast.warning("High risk detected ahead!");
      } else {
        toast.success("Route analyzed successfully");
      }

      // Center map on route
      if (segments.length > 0) {
        const coords = segments[0].geometry.coordinates as number[];
        setMapCenter({ lat: coords[1], lng: coords[0] });
      }
    } catch (err) {
      toast.error("Failed to analyze route");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Route Look-Ahead</h1>
            <p className="text-sm text-muted-foreground">
              Analyze risk along your route
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/"}>
            <Navigation className="mr-2 h-4 w-4" />
            Back to Map
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <aside className="w-80 space-y-4 overflow-y-auto border-r bg-background p-4">
          <VehicleSelect value={vehicle} onChange={setVehicle} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Destination</label>
            <Input
              placeholder="Enter destination (demo only)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Using demo route through Ginigathena
            </p>
          </div>

          <Button
            onClick={analyzeRoute}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Route"}
          </Button>

          {maxRisk !== null && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Max Risk</span>
                <Badge
                  variant={maxRisk >= 70 ? "destructive" : maxRisk >= 40 ? "default" : "secondary"}
                >
                  {maxRisk}
                </Badge>
              </div>
              {maxRisk >= 70 && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <span className="text-destructive">
                    High risk detected ahead in the next 1km
                  </span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Analyzed {routeSegments.length} points along route
              </div>
            </div>
          )}
        </aside>

        {/* Map */}
        <main className="relative flex-1">
          <MapWeb
            center={mapCenter}
            segments={routeSegments}
            onCenterChange={setMapCenter}
          />
        </main>
      </div>
    </div>
  );
}
