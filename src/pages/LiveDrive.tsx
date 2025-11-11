import { useState, useEffect, useRef } from "react";
import { MapWeb } from "@/components/MapWeb";
import { VehicleSelect } from "@/components/VehicleSelect";
import { RiskBanner } from "@/components/RiskBanner";
import { useUiStore } from "@/store/useUiStore";
import { useRiskStore } from "@/store/useRiskStore";
import { riskApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Play, Pause, Navigation } from "lucide-react";
import { toast } from "sonner";
import routeDemoData from "@/fixtures/route_demo.json";

export default function LiveDrive() {
  const { vehicle, mockMode, setVehicle } = useUiStore();
  const { currentScore, setCurrentScore, setLoading } = useRiskStore();
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const demoRoute = (routeDemoData.geometry.coordinates as number[][]).map(
    ([lng, lat]) => ({ lat, lng })
  );

  useEffect(() => {
    if (!currentPosition) {
      setCurrentPosition(demoRoute[0]);
    }
  }, []);

  useEffect(() => {
    if (currentPosition && !isSimulating) {
      fetchScore(currentPosition.lat, currentPosition.lng);
    }
  }, [currentPosition, vehicle, mockMode]);

  const fetchScore = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      riskApi.setMockMode(mockMode);
      const score = await riskApi.score({ lat, lon: lng, vehicle });
      setCurrentScore(score);
    } catch (err) {
      toast.error("Failed to fetch risk score");
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = () => {
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Live Drive</h1>
            <p className="text-sm text-muted-foreground">
              Real-time risk monitoring
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
            <span className="text-sm font-medium">Simulation</span>
            <Button
              onClick={isSimulating ? stopSimulation : startSimulation}
              className="w-full"
              variant={isSimulating ? "destructive" : "default"}
            >
              {isSimulating ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Drive
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Simulate Drive
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {isSimulating
                ? "Driving along demo route..."
                : "Click to start a simulated drive"}
            </p>
          </div>

          {currentScore && (
            <div className="pt-4">
              <RiskBanner score={currentScore} />
            </div>
          )}
        </aside>

        {/* Map */}
        <main className="relative flex-1">
          {currentPosition && (
            <MapWeb
              center={currentPosition}
              segments={[]}
              onCenterChange={() => {}}
            />
          )}
          {currentPosition && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-4 w-4 rounded-full bg-primary border-2 border-white shadow-lg" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
