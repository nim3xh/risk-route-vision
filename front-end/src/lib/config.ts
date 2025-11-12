import { MapStyle } from "@/store/useUiStore";
import type { StyleSpecification } from "maplibre-gl";

export const config = {
  apiBase: import.meta.env.VITE_API_BASE || "",
  timezone: import.meta.env.VITE_TIMEZONE || "Asia/Colombo",
  useMockApi: import.meta.env.VITE_USE_MOCK_API === "true" || !import.meta.env.VITE_API_BASE,
  
  // Default map center: 6.9893° N, 80.4927° E
  domain: {
    center: { lat: 6.9893, lng: 80.4927 },
    bounds: {
      minLon: 80.43,
      minLat: 6.94,
      maxLon: 80.55,
      maxLat: 7.03,
    },
  },
} as const;

/**
 * Get MapLibre style URL based on map style selection
 */
export function getMapStyleUrl(style: MapStyle): string | StyleSpecification {
  const mapStyleUrls: Record<MapStyle, string | StyleSpecification> = {
    streets: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    satellite: getSatelliteStyle(),
    outdoors: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json", // Changed from nolabels to include labels
  };
  
  return mapStyleUrls[style];
}

/**
 * Create a custom satellite style using free satellite imagery with place name labels
 */
function getSatelliteStyle(): StyleSpecification {
  return {
    version: 8,
    name: "Satellite",
    center: [0, 0],
    zoom: 1,
    sources: {
      "satellite-source": {
        type: "raster",
        tiles: [
          "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        ],
        tileSize: 256,
        attribution: "© Google"
      },
      "labels-source": {
        type: "raster",
        tiles: [
          "https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
        ],
        tileSize: 256,
        attribution: "© Google"
      }
    },
    layers: [
      {
        id: "satellite-layer",
        type: "raster",
        source: "satellite-source"
      },
      {
        id: "labels-layer",
        type: "raster",
        source: "labels-source"
      }
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  };
}

