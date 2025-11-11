import { useState } from "react";
import { MapWeb } from "@/components/MapWeb";
import { VehicleSelect } from "@/components/VehicleSelect";
import { MapStyleSelector } from "@/components/MapStyleSelector";
import { LocationSearch } from "@/components/LocationSearch";
import { useUiStore } from "@/store/useUiStore";
import { riskApi } from "@/lib/api/client";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Navigation, AlertTriangle, Route as RouteIcon, MapPinned, Clock } from "lucide-react";
import { toast } from "sonner";
import { samplePolyline } from "@/lib/geo/sampling";
import { Badge } from "@/components/ui/badge";
import { getRoute, reverseGeocode } from "@/lib/api/routingService";
import { SegmentFeature } from "@/types";

export default function RouteLookAhead() {
  const { vehicle, mockMode, mapStyle, setVehicle, setMapStyle } = useUiStore();
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
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ 
    lat: config.domain.center.lat, 
    lng: config.domain.center.lng 
  });

  // Get current location and set as "from"
  const useCurrentLocation = () => {
    if ("geolocation" in navigator) {
      toast.info("Getting your location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const name = await reverseGeocode(latitude, longitude);
          setFromLocation({ lat: latitude, lng: longitude, name });
          setMapCenter({ lat: latitude, lng: longitude });
          toast.success("Current location set");
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Could not get your location");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error("Geolocation not supported");
    }
  };

  const analyzeRoute = async () => {
    if (!fromLocation || !toLocation) {
      toast.error("Please select both from and to locations");
      return;
    }

    setIsAnalyzing(true);
    setIsFetchingRoute(true);
    setRouteSegments([]);
    setRouteLine(null);
    setMaxRisk(null);
    setAvgRisk(null);
    setRouteDistance(null);
    setRouteDuration(null);

    try {
      riskApi.setMockMode(mockMode);
      
      console.log("🗺️ Fetching route from", fromLocation.name, "to", toLocation.name);
      
      // Get route from routing service
      const routeResult = await getRoute(
        { lat: fromLocation.lat, lng: fromLocation.lng },
        { lat: toLocation.lat, lng: toLocation.lng },
        'driving-car'
      );
      
      console.log(`📏 Route found: ${(routeResult.distance / 1000).toFixed(2)} km, ${Math.round(routeResult.duration / 60)} min`);
      
      setRouteDistance(routeResult.distance);
      setRouteDuration(routeResult.duration);
      setIsFetchingRoute(false);
      
      // Store the route line for visualization
      setRouteLine({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: routeResult.coordinates,
        },
        properties: {},
      });
      
      // Sample points along the route (every 100 meters)
      const sampledPoints = samplePolyline(routeResult.coordinates, 100);
      
      console.log(`📍 Analyzing route with ${sampledPoints.length} sampled points`);

      // Fetch risk for sampled points (limit to 20 for performance)
      const pointsToAnalyze = sampledPoints.slice(0, Math.min(20, sampledPoints.length));
      const riskPromises = pointsToAnalyze.map((point, idx) =>
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

      // Calculate risk statistics
      const risks = segments.map((s) => s.properties.risk_0_100);
      const max = Math.max(...risks);
      const avg = Math.round(risks.reduce((sum, r) => sum + r, 0) / risks.length);
      
      setMaxRisk(max);
      setAvgRisk(avg);

      console.log(`📊 Route analysis complete: Max risk ${max}, Avg risk ${avg}`);

      if (max >= 70) {
        toast.warning("High risk detected ahead!");
      } else if (max >= 40) {
        toast.info("Moderate risk detected on route");
      } else {
        toast.success("Route analyzed - Low risk");
      }

      // Center map on route
      const bbox = routeResult.bbox;
      const centerLat = (bbox[1] + bbox[3]) / 2;
      const centerLng = (bbox[0] + bbox[2]) / 2;
      setMapCenter({ lat: centerLat, lng: centerLng });
      
    } catch (err) {
      console.error("Route analysis error:", err);
      toast.error("Failed to analyze route");
      setIsFetchingRoute(false);
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
          <MapStyleSelector value={mapStyle} onChange={setMapStyle} />

          {/* From Location */}
          <LocationSearch
            label="From"
            placeholder="Search starting location..."
            onLocationSelect={setFromLocation}
            disabled={isAnalyzing}
          />

          {/* Use Current Location Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={useCurrentLocation}
            disabled={isAnalyzing}
            className="w-full"
          >
            <MapPinned className="mr-2 h-4 w-4" />
            Use Current Location
          </Button>

          {/* To Location */}
          <LocationSearch
            label="To"
            placeholder="Search destination..."
            onLocationSelect={setToLocation}
            disabled={isAnalyzing}
          />

          {/* Analyze Route Button */}
          <Button
            onClick={analyzeRoute}
            disabled={isAnalyzing || !fromLocation || !toLocation}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <RouteIcon className="mr-2 h-4 w-4 animate-spin" />
                {isFetchingRoute ? "Finding route..." : "Analyzing risk..."}
              </>
            ) : (
              <>
                <RouteIcon className="mr-2 h-4 w-4" />
                Analyze Route
              </>
            )}
          </Button>

          {/* Route Info */}
          {routeDistance !== null && routeDuration !== null && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Distance</span>
                <span className="font-medium">
                  {(routeDistance / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.round(routeDuration / 60)} min
                </span>
              </div>
            </div>
          )}

          {/* Risk Analysis Results */}
          {maxRisk !== null && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Route Risk Analysis</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Max Risk</span>
                  <Badge
                    variant={maxRisk >= 70 ? "destructive" : maxRisk >= 40 ? "default" : "secondary"}
                  >
                    {maxRisk}/100
                  </Badge>
                </div>
                
                {avgRisk !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Risk</span>
                    <Badge
                      variant={avgRisk >= 70 ? "destructive" : avgRisk >= 40 ? "default" : "secondary"}
                    >
                      {avgRisk}/100
                    </Badge>
                  </div>
                )}
              </div>

              {maxRisk >= 70 && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <span className="text-destructive">
                    High risk area detected ahead. Consider alternative route.
                  </span>
                </div>
              )}
              
              {maxRisk < 70 && maxRisk >= 40 && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                  <span className="text-yellow-600">
                    Moderate risk. Drive with caution.
                  </span>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                📍 Analyzed {routeSegments.length} points along route
              </div>
            </div>
          )}
        </aside>

        {/* Map */}
        <main className="relative flex-1">
          <MapWeb
            center={mapCenter}
            segments={routeSegments}
            routeLine={routeLine}
            onCenterChange={setMapCenter}
          />
        </main>
      </div>
    </div>
  );
}
