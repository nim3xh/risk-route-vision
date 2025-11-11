import { useMemo, useEffect, useState } from "react";
import Map, { Layer, Source, MapLayerMouseEvent, Marker } from "react-map-gl/maplibre";
import type { ViewState } from "react-map-gl/maplibre";
import { SegmentFeature } from "@/types";
import { riskToColor } from "@/lib/utils/colors";
import { getMapStyleUrl } from "@/lib/config";
import { useUiStore } from "@/store/useUiStore";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapWebProps {
  center: { lat: number; lng: number };
  segments: SegmentFeature[];
  routeLine?: GeoJSON.Feature<GeoJSON.LineString> | null;
  onSegmentClick?: (segment: SegmentFeature) => void;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}

export function MapWeb({ center, segments, routeLine, onSegmentClick, onCenterChange }: MapWebProps) {
  const { mapStyle } = useUiStore();
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const currentMapStyle = getMapStyleUrl(mapStyle);

  // Debug: Component is rendering
  console.log("🗺️ MapWeb component rendered", { segmentsCount: segments.length, hasRouteLine: !!routeLine, mapStyle });

  // Get user's current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      console.log("📍 Requesting device location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          console.log("✅ Got user location:", { lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn("⚠️ Could not get location:", error.message);
          console.log("Using default center instead");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.warn("⚠️ Geolocation not supported by browser");
    }
  }, []);

  useEffect(() => {
    console.log("MapWeb - Rendering with:", {
      center,
      segmentsCount: segments.length,
      firstSegment: segments[0],
      currentMapStyle,
      mapStyle,
    });
  }, [center, segments, currentMapStyle, mapStyle]);
  const geojsonData = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: segments.map((segment) => ({
        type: "Feature" as const,
        geometry: segment.geometry,
        properties: {
          ...segment.properties,
          color: riskToColor(segment.properties.risk_0_100),
        },
      })),
    };
  }, [segments]);

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && onSegmentClick) {
      const segment = segments.find(
        (s) => s.properties.segment_id === feature.properties.segment_id
      );
      if (segment) {
        onSegmentClick(segment);
      }
    }
  };

  const handleMapError = (error: { error?: { message?: string }; message?: string }) => {
    console.error("Map error:", error);
    const errorMessage = error.error?.message || error.message || "Failed to load map";
    setMapError(errorMessage);
  };

  const handleMapLoad = () => {
    console.log("Map loaded successfully with style:", currentMapStyle, mapStyle);
    setIsMapLoaded(true);
    setMapError(null);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {mapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95">
          <div className="max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-destructive">Map Loading Failed</h3>
            <p className="mt-2 text-sm text-muted-foreground">{mapError}</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p><strong>Troubleshooting:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Check your internet connection</li>
                <li>Disable any ad blockers or VPN</li>
                <li>Check browser console (F12) for detailed errors</li>
                <li>Try refreshing the page or changing map style</li>
              </ul>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <div className="text-sm text-muted-foreground">
              Loading {mapStyle} map...
            </div>
          </div>
        </div>
      )}
      <Map
        key={`map-${mapStyle}`}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: 13,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={currentMapStyle}
        onLoad={handleMapLoad}
        onError={handleMapError}
        onMove={(evt) => {
          if (onCenterChange) {
            const viewState = evt.viewState as ViewState & { longitude: number; latitude: number };
            onCenterChange({ lat: viewState.latitude, lng: viewState.longitude });
          }
        }}
        onClick={handleClick}
        interactiveLayerIds={["segments-circles"]}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="center"
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                border: "3px solid white",
                boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)",
                cursor: "pointer",
                position: "relative",
              }}
              title={`Your Location: ${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E`}
            >
              <div
                style={{
                  position: "absolute",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(59, 130, 246, 0.3)",
                  animation: "pulse 2s infinite",
                  top: "0",
                  left: "0",
                }}
              />
            </div>
          </Marker>
        )}
        {isMapLoaded && routeLine && (
          <Source id="route-line" type="geojson" data={routeLine as GeoJSON.Feature}>
            <Layer
              id="route-line-casing"
              type="line"
              paint={{
                "line-color": "#1e40af",
                "line-width": 8,
                "line-opacity": 0.4,
              }}
            />
            <Layer
              id="route-line-main"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 4,
                "line-opacity": 0.9,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            <Layer
              id="route-arrows"
              type="symbol"
              layout={{
                "symbol-placement": "line",
                "symbol-spacing": 80,
                "icon-image": "airport-15",
                "icon-size": 0.8,
                "icon-rotate": 90,
                "icon-rotation-alignment": "map",
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              }}
              paint={{
                "icon-opacity": 0.7,
              }}
            />
          </Source>
        )}
        {isMapLoaded && (
          <Source id="segments" type="geojson" data={geojsonData as GeoJSON.FeatureCollection}>
            <Layer
              id="segments-circles"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["get", "risk_0_100"],
                  0, 20,
                  50, 35,
                  100, 50
                ],
                "circle-color": ["get", "color"],
                "circle-opacity": 0.5,
                "circle-stroke-color": ["get", "color"],
                "circle-stroke-width": 3,
                "circle-stroke-opacity": 0.9,
              }}
            />
            <Layer
              id="segments-labels"
              type="symbol"
              layout={{
                "text-field": ["get", "risk_0_100"],
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-size": 12,
                "text-allow-overlap": true,
              }}
              paint={{
                "text-color": "#ffffff",
                "text-halo-color": "#000000",
                "text-halo-width": 2,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
