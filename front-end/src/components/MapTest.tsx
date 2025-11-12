import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Simple test component to verify MapLibre GL is working
 * Use this to debug map loading issues
 */
export function MapTest() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    console.log("Initializing test map...");

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://demotiles.maplibre.org/style.json", // Simple demo style
        center: [80.5333, 7.3167], // Sri Lanka
        zoom: 13,
      });

      map.current.on("load", () => {
        console.log("Test map loaded successfully!");
        setLoaded(true);
        setError(null);
      });

      map.current.on("error", (e) => {
        console.error("Test map error:", e);
        setError(e.error?.message || "Map failed to load");
      });
    } catch (err) {
      console.error("Failed to create map:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize map");
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            zIndex: 1000,
          }}
        >
          <h3 style={{ color: "red", margin: 0 }}>Map Error</h3>
          <p style={{ margin: "10px 0 0 0" }}>{error}</p>
        </div>
      )}
      {!loaded && !error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 999,
          }}
        >
          Loading test map...
        </div>
      )}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
