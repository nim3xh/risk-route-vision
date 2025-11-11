import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { SegmentFeature } from "@/types";
import { riskToColor } from "@/lib/utils/colors";
import { getMapStyleUrl } from "@/lib/config";
import { useUiStore, MapStyle } from "@/store/useUiStore";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapWebProps {
  center: { lat: number; lng: number };
  segments: SegmentFeature[];
  onSegmentClick?: (segment: SegmentFeature) => void;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}

export function MapWebNative({ center, segments, onSegmentClick, onCenterChange }: MapWebProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userLocationMarker = useRef<maplibregl.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { mapStyle } = useUiStore();
  const currentMapStyle = getMapStyleUrl(mapStyle);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [lastAppliedStyle, setLastAppliedStyle] = useState<MapStyle | null>(null);

  const geojsonData = useMemo(() => {
    console.log("📊 Creating GeoJSON data with segments:", segments.length);
    if (segments.length === 0) {
      console.log("⚠️ No segments available - returning empty FeatureCollection");
    }
    const data = {
      type: "FeatureCollection" as const,
      features: segments.map((segment) => {
        const color = riskToColor(segment.properties.risk_0_100);
        console.log(`  - Segment ${segment.properties.segment_id}: risk=${segment.properties.risk_0_100}, color=${color}, vehicle=${segment.properties.vehicle}`);
        return {
          type: "Feature" as const,
          geometry: segment.geometry,
          properties: {
            ...segment.properties,
            color,
          },
        };
      }),
    };
    console.log("✅ GeoJSON data created with", data.features.length, "features");
    return data;
  }, [segments]);

  // Helper function to add/update layers and event handlers
  const setupMapLayers = useCallback((mapInstance: maplibregl.Map) => {
    if (!mapInstance) {
      console.warn("⚠️ Map instance is null, cannot setup layers");
      return;
    }

    // Make sure style is loaded before adding layers
    if (!mapInstance.isStyleLoaded()) {
      console.warn("⚠️ Map style not loaded yet, waiting...");
      mapInstance.once('style.load', () => {
        console.log("✅ Style loaded, retrying layer setup");
        setupMapLayers(mapInstance);
      });
      return;
    }

    if (segments.length === 0) {
      console.warn("⚠️ No segments to display! Segments array is empty.");
      return;
    }

    if (geojsonData.features.length === 0) {
      console.warn("⚠️ No GeoJSON features to display! Features array is empty.");
      return;
    }

    console.log("🔧 Setting up map layers with", segments.length, "segments");
    console.log("📊 GeoJSON features:", geojsonData.features.length);
    console.log("📦 First feature:", geojsonData.features[0]);

    // Remove existing layers and source if they exist
    if (mapInstance.getLayer("segments-labels")) {
      console.log("🗑️ Removing existing labels layer");
      mapInstance.removeLayer("segments-labels");
    }
    if (mapInstance.getLayer("segments-circles")) {
      console.log("🗑️ Removing existing circles layer");
      mapInstance.removeLayer("segments-circles");
    }
    if (mapInstance.getSource("segments")) {
      console.log("🗑️ Removing existing segments source");
      mapInstance.removeSource("segments");
    }

    // Add source
    console.log("➕ Adding segments source with", geojsonData.features.length, "features");
    mapInstance.addSource("segments", {
      type: "geojson",
      data: geojsonData as GeoJSON.FeatureCollection,
    });

    // Add circle layer
    console.log("🎨 Adding circles layer");
    mapInstance.addLayer({
      id: "segments-circles",
      type: "circle",
      source: "segments",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "risk_0_100"],
          0, 30,
          50, 50,
          100, 80
        ],
        "circle-color": ["get", "color"],
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["get", "risk_0_100"],
          0, 0.3,
          50, 0.5,
          100, 0.7
        ],
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-width": 3,
        "circle-stroke-opacity": 0.9,
      },
    });

    // Add labels layer
    console.log("🏷️ Adding labels layer");
    mapInstance.addLayer({
      id: "segments-labels",
      type: "symbol",
      source: "segments",
      layout: {
        "text-field": ["to-string", ["get", "risk_0_100"]],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 14,
        "text-offset": [0, 0],
        "text-anchor": "center",
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 2,
      },
    });

    // Add click handlers
    mapInstance.on("click", "segments-circles", (e) => {
      if (!e.features || !e.features[0] || !onSegmentClick) return;
      
      const feature = e.features[0];
      const segment = segments.find(
        (s) => s.properties.segment_id === feature.properties.segment_id
      );
      
      if (segment) {
        onSegmentClick(segment);
      }
    });

    // Cursor change on hover
    mapInstance.on("mouseenter", "segments-circles", () => {
      mapInstance.getCanvas().style.cursor = "pointer";
    });

    mapInstance.on("mouseleave", "segments-circles", () => {
      mapInstance.getCanvas().style.cursor = "";
    });

    // Add popup on hover
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    mapInstance.on("mouseenter", "segments-circles", (e) => {
      if (!e.features || !e.features[0]) return;
      
      const feature = e.features[0];
      const risk = feature.properties.risk_0_100;
      const cause = feature.properties.top_cause || "Unknown";
      
      popup
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="padding: 8px; min-width: 200px;">
            <strong style="font-size: 16px; color: ${feature.properties.color}">
              Risk: ${risk}/100
            </strong>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
              ${cause}
            </p>
          </div>
        `)
        .addTo(mapInstance);
    });

    mapInstance.on("mouseleave", "segments-circles", () => {
      popup.remove();
    });

    console.log("✅ Map layers and handlers setup complete");
    console.log("🗺️ Layers on map:", mapInstance.getStyle()?.layers?.map(l => l.id).join(", "));
    
    // Debug: Check if source has data
    setTimeout(() => {
      const source = mapInstance.getSource("segments") as maplibregl.GeoJSONSource;
      if (source) {
        console.log("🔍 Segments source exists");
        // Query rendered features
        const features = mapInstance.querySourceFeatures("segments");
        console.log("🎯 Rendered features:", features.length);
        if (features.length > 0) {
          console.log("📍 First rendered feature:", features[0]);
        }
      }
    }, 1000);
  }, [geojsonData, segments, onSegmentClick]);

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
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    console.log("🗺️ Initializing native MapLibre map with style:", mapStyle);

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: currentMapStyle,
        center: [center.lng, center.lat],
        zoom: 14, // Increased zoom for better detail view
      });

      map.current.on("load", () => {
        console.log("✅ Map loaded successfully!");
        console.log("📍 Map center:", map.current?.getCenter());
        console.log("🔍 Map zoom:", map.current?.getZoom());
        console.log("🎨 Map style loaded:", map.current?.isStyleLoaded());
        
        if (!map.current) return;

        // Setup layers using helper function
        console.log("🚀 Calling setupMapLayers from initial load");
        setupMapLayers(map.current);
        setIsMapLoaded(true);
        setLastAppliedStyle(mapStyle);
      });

      map.current.on("error", (e) => {
        console.error("❌ Map error:", e);
      });

      // Handle center change
      if (onCenterChange) {
        map.current.on("move", () => {
          if (!map.current) return;
          const center = map.current.getCenter();
          onCenterChange({ lat: center.lat, lng: center.lng });
        });
      }
    } catch (err) {
      console.error("Failed to create map:", err);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps intentional - initialize map only once

  // Update layers when segments change (handles data loading after map initialization)
  useEffect(() => {
    if (!map.current || !isMapLoaded) {
      console.log("⏭️ Skipping segments update - map not ready");
      return;
    }
    
    if (segments.length === 0) {
      console.log("⏭️ No segments to update yet, waiting for data...");
      return;
    }
    
    console.log("🔄 Segments data changed, updating layers with", segments.length, "segments");
    
    // Re-setup all layers with new data
    setupMapLayers(map.current);
  }, [segments, isMapLoaded, setupMapLayers]);

  // Update center when it changes
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({ center: [center.lng, center.lat], duration: 1000 });
  }, [center]);

  // Update map style when it changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) {
      console.log("⏭️ Skipping style change - map not ready. isMapLoaded:", isMapLoaded);
      return;
    }
    
    // Check if style actually changed
    if (lastAppliedStyle === mapStyle) {
      console.log("⏭️ Style hasn't changed, skipping reload. Current:", mapStyle);
      return;
    }
    
    console.log("🎨 Changing map style from", lastAppliedStyle, "to:", mapStyle);
    
    // Store current center and zoom before style change
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    
    console.log("💾 Saving current view - center:", currentCenter, "zoom:", currentZoom);
    
    // Change the map style
    map.current.setStyle(currentMapStyle);
    
    // Wait for style to load and restore data
    const handleStyleLoad = () => {
      console.log("✅ New map style loaded:", currentMapStyle);
      console.log("🎨 Style is loaded:", map.current?.isStyleLoaded());
      
      if (!map.current) return;
      
      // Restore center and zoom
      map.current.jumpTo({
        center: currentCenter,
        zoom: currentZoom
      });
      
      console.log("📍 Restored view - center:", map.current.getCenter(), "zoom:", map.current.getZoom());
      
      // Wait a bit for style to fully settle before adding layers
      setTimeout(() => {
        if (!map.current) return;
        console.log("🚀 Calling setupMapLayers from style change");
        setupMapLayers(map.current);
        setLastAppliedStyle(mapStyle);
      }, 100);
    };
    
    map.current.once('styledata', handleStyleLoad);
    
    // Cleanup
    return () => {
      if (map.current) {
        map.current.off('styledata', handleStyleLoad);
      }
    };
  }, [mapStyle, currentMapStyle, isMapLoaded, setupMapLayers, lastAppliedStyle]);

  // Add/update user location marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // Remove old marker if exists
    if (userLocationMarker.current) {
      userLocationMarker.current.remove();
    }

    // Create custom blue marker for user location
    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#3b82f6';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
    el.style.cursor = 'pointer';

    // Add pulsing animation
    const pulse = document.createElement('div');
    pulse.style.position = 'absolute';
    pulse.style.width = '20px';
    pulse.style.height = '20px';
    pulse.style.borderRadius = '50%';
    pulse.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
    pulse.style.animation = 'pulse 2s infinite';
    el.appendChild(pulse);

    // Add CSS animation
    if (!document.getElementById('user-location-animation')) {
      const style = document.createElement('style');
      style.id = 'user-location-animation';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    userLocationMarker.current = new maplibregl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 8px;">
            <strong>📍 Your Location</strong><br/>
            <small>${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E</small>
          </div>`
        )
      )
      .addTo(map.current);

    // Fly to user location
    map.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 15,
      duration: 2000,
    });

    console.log("🎯 User location marker added at:", userLocation);
  }, [userLocation]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
