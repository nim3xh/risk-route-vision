import { useState, useEffect, useRef } from "react";
import { MapWeb } from "@/components/MapWeb";
import { VehicleSelect } from "@/components/VehicleSelect";
import { MapStyleSelector } from "@/components/MapStyleSelector";
import { RiskBanner } from "@/components/RiskBanner";
import { useUiStore } from "@/store/useUiStore";
import { useRiskStore } from "@/store/useRiskStore";
import { riskApi } from "@/lib/api/client";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Play, Pause, Navigation, MapPinned, Radio, Menu } from "lucide-react";
import { toast } from "sonner";
import { reverseGeocode } from "@/lib/api/routingService";
import routeDemoData from "@/fixtures/route_demo.json";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function LiveDrive() {
  const [panelOpen, setPanelOpen] = useState(false);
  const { vehicle, mockMode, mapStyle, setVehicle, setMapStyle } = useUiStore();
  const { currentScore, setCurrentScore, setLoading } = useRiskStore();
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
  }, []); // Only run once on mount

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

  // Start live GPS tracking
  const startLiveTracking = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported by your browser");
      return;
    }

    toast.info("Starting live tracking...");
    setIsLiveTracking(true);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 Initial GPS position: ${latitude}, ${longitude}`);
        
        setCurrentPosition({ lat: latitude, lng: longitude });
        fetchScore(latitude, longitude);
        
        // Get address
        const address = await reverseGeocode(latitude, longitude);
        setCurrentAddress(address);
        
        toast.success("Live tracking started!");
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not get your location");
        setIsLiveTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Watch for position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`🔄 GPS update: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
        
        setCurrentPosition({ lat: latitude, lng: longitude });
        fetchScore(latitude, longitude);
        
        // Update address occasionally (not every time to avoid API rate limits)
        if (Math.random() < 0.2) { // 20% chance
          const address = await reverseGeocode(latitude, longitude);
          setCurrentAddress(address);
        }
      },
      (error) => {
        console.error("GPS tracking error:", error);
        toast.error("GPS tracking error");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Accept cached position up to 5 seconds old
        timeout: 10000,
      }
    );
  };

  // Stop live GPS tracking
  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    toast.info("Live tracking stopped");
  };

  useEffect(() => {
    if (currentPosition && !isSimulating && !isLiveTracking) {
      fetchScore(currentPosition.lat, currentPosition.lng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPosition, vehicle, mockMode]); // fetchScore, isSimulating, isLiveTracking intentionally excluded

  const startSimulation = () => {
    if (isLiveTracking) {
      stopLiveTracking();
    }
    
    setIsSimulating(true);
    setRouteIndex(0);
    toast.info("Starting route simulation");
    
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
    toast.info("Simulation stopped");
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card px-3 py-2 md:px-4 md:py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-4 overflow-y-auto">
                <div className="space-y-4">
                  <VehicleSelect value={vehicle} onChange={setVehicle} />
                  <MapStyleSelector value={mapStyle} onChange={setMapStyle} />

                  {/* Live GPS Tracking */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Live GPS Tracking</span>
                    <Button
                      onClick={isLiveTracking ? stopLiveTracking : startLiveTracking}
                      className="w-full"
                      variant={isLiveTracking ? "destructive" : "default"}
                      disabled={isSimulating}
                    >
                      {isLiveTracking ? (
                        <>
                          <Radio className="mr-2 h-4 w-4 animate-pulse" />
                          Stop Live Tracking
                        </>
                      ) : (
                        <>
                          <MapPinned className="mr-2 h-4 w-4" />
                          Start Live Tracking
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {isLiveTracking
                        ? "📡 Tracking your real-time location..."
                        : "Track your actual GPS location in real-time"}
                    </p>
                    {currentAddress && isLiveTracking && (
                      <div className="rounded-md bg-primary/10 p-2 text-xs text-primary">
                        <p className="font-medium">Current Location:</p>
                        <p className="truncate">{currentAddress}</p>
                      </div>
                    )}
                  </div>

                  {/* Route Simulation */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Route Simulation</span>
                    <Button
                      onClick={isSimulating ? stopSimulation : startSimulation}
                      className="w-full"
                      variant={isSimulating ? "destructive" : "outline"}
                      disabled={isLiveTracking}
                    >
                      {isSimulating ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Stop Simulation
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Simulate Demo Drive
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {isSimulating
                        ? "🚗 Driving along demo route..."
                        : "Simulate a drive along a preset route"}
                    </p>
                  </div>

                  {/* Current Risk Score */}
                  {currentScore && (
                    <div className="pt-4">
                      <RiskBanner score={currentScore} />
                    </div>
                  )}

                  {/* Location Info */}
                  {currentPosition && (
                    <div className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Current Position
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Latitude:</span>
                          <span className="font-mono">{currentPosition.lat.toFixed(6)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Longitude:</span>
                          <span className="font-mono">{currentPosition.lng.toFixed(6)}°</span>
                        </div>
                        {isLiveTracking && (
                          <div className="flex items-center gap-1 pt-1 text-green-600">
                            <Radio className="h-3 w-3 animate-pulse" />
                            <span>Live GPS Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-foreground">Live Drive</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Real-time risk monitoring
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/"} className="text-xs md:text-sm">
            <Navigation className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden xs:inline">Back</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel (Desktop only) */}
        <aside className="hidden lg:block w-80 space-y-4 overflow-y-auto border-r bg-background p-4">
          <VehicleSelect value={vehicle} onChange={setVehicle} />
          <MapStyleSelector value={mapStyle} onChange={setMapStyle} />

          {/* Live GPS Tracking */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Live GPS Tracking</span>
            <Button
              onClick={isLiveTracking ? stopLiveTracking : startLiveTracking}
              className="w-full"
              variant={isLiveTracking ? "destructive" : "default"}
              disabled={isSimulating}
            >
              {isLiveTracking ? (
                <>
                  <Radio className="mr-2 h-4 w-4 animate-pulse" />
                  Stop Live Tracking
                </>
              ) : (
                <>
                  <MapPinned className="mr-2 h-4 w-4" />
                  Start Live Tracking
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {isLiveTracking
                ? "📡 Tracking your real-time location..."
                : "Track your actual GPS location in real-time"}
            </p>
            {currentAddress && isLiveTracking && (
              <div className="rounded-md bg-primary/10 p-2 text-xs text-primary">
                <p className="font-medium">Current Location:</p>
                <p className="truncate">{currentAddress}</p>
              </div>
            )}
          </div>

          {/* Route Simulation */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Route Simulation</span>
            <Button
              onClick={isSimulating ? stopSimulation : startSimulation}
              className="w-full"
              variant={isSimulating ? "destructive" : "outline"}
              disabled={isLiveTracking}
            >
              {isSimulating ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Simulation
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Simulate Demo Drive
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {isSimulating
                ? "🚗 Driving along demo route..."
                : "Simulate a drive along a preset route"}
            </p>
          </div>

          {/* Current Risk Score */}
          {currentScore && (
            <div className="pt-4">
              <RiskBanner score={currentScore} />
            </div>
          )}

          {/* Location Info */}
          {currentPosition && (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Current Position
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Latitude:</span>
                  <span className="font-mono">{currentPosition.lat.toFixed(6)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Longitude:</span>
                  <span className="font-mono">{currentPosition.lng.toFixed(6)}°</span>
                </div>
                {isLiveTracking && (
                  <div className="flex items-center gap-1 pt-1 text-green-600">
                    <Radio className="h-3 w-3 animate-pulse" />
                    <span>Live GPS Active</span>
                  </div>
                )}
              </div>
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
