import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { SegmentFeature } from "@/types";
import { riskToColor } from "@/lib/utils/colors";
import { getMapStyleUrl } from "@/lib/config";
import { useUiStore, MapStyle } from "@/store/useUiStore";
import { LocationButton } from "@/components/LocationButton";
import { MapAttribution } from "@/components/MapAttribution";
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
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFlownToUserLocation = useRef(false); // Track if we've already flown to user location
  const isUserDragging = useRef(false); // Track if user is actively dragging
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { mapStyle } = useUiStore();
  const currentMapStyle = getMapStyleUrl(mapStyle);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [lastAppliedStyle, setLastAppliedStyle] = useState<MapStyle | null>(null);

  const geojsonData = useMemo(() => {
    if (segments.length === 0) {
      return {
        type: "FeatureCollection" as const,
        features: []
      };
    }
    const data = {
      type: "FeatureCollection" as const,
      features: segments.map((segment) => {
        const color = riskToColor(segment.properties.risk_0_100);
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
    return data;
  }, [segments]);

  // Helper function to add/update layers and event handlers
  const setupMapLayers = useCallback((mapInstance: maplibregl.Map) => {
    if (!mapInstance) {
      return;
    }

    // Make sure style is loaded before adding layers
    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once('style.load', () => {
        setupMapLayers(mapInstance);
      });
      return;
    }

    if (segments.length === 0) {
      return;
    }

    if (geojsonData.features.length === 0) {
      return;
    }

    // Remove existing layers and source if they exist
    if (mapInstance.getLayer("segments-labels")) {
      mapInstance.removeLayer("segments-labels");
    }
    if (mapInstance.getLayer("segments-circles")) {
      mapInstance.removeLayer("segments-circles");
    }
    if (mapInstance.getSource("segments")) {
      mapInstance.removeSource("segments");
    }

    // Add source
    mapInstance.addSource("segments", {
      type: "geojson",
      data: geojsonData as GeoJSON.FeatureCollection,
    });

    // Add circle layer
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
  }, [geojsonData, segments, onSegmentClick]);

  // Note: User location is only fetched when clicking the location button
  // No auto-location detection on load to keep focus on default area

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: currentMapStyle,
        center: [center.lng, center.lat],
        zoom: 14,
        // Performance optimizations
        attributionControl: false,
        refreshExpiredTiles: false,
      });

      map.current.on("load", () => {
        if (!map.current) return;

        // Setup layers using helper function
        setupMapLayers(map.current);
        setIsMapLoaded(true);
        setLastAppliedStyle(mapStyle);
      });

      map.current.on("error", (e) => {
        console.error("Map error:", e);
      });

      // Track when user starts and stops dragging
      map.current.on("dragstart", () => {
        isUserDragging.current = true;
      });

      map.current.on("dragend", () => {
        isUserDragging.current = false;
      });

      // Throttled center change handler to prevent excessive updates
      if (onCenterChange) {
        map.current.on("move", () => {
          if (!map.current) return;
          
          // Clear existing timeout
          if (moveTimeoutRef.current) {
            clearTimeout(moveTimeoutRef.current);
          }
          
          // Throttle the callback - only fire every 150ms
          moveTimeoutRef.current = setTimeout(() => {
            if (!map.current) return;
            const center = map.current.getCenter();
            onCenterChange({ lat: center.lat, lng: center.lng });
          }, 150);
        });
      }
    } catch (err) {
      console.error("Failed to create map:", err);
    }

    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
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
      return;
    }
    
    if (segments.length === 0) {
      return;
    }
    
    // Re-setup all layers with new data
    setupMapLayers(map.current);
  }, [segments, isMapLoaded, setupMapLayers]);

  // Update center when it changes (but not while user is dragging)
  useEffect(() => {
    if (!map.current || isUserDragging.current) return;
    
    const currentCenter = map.current.getCenter();
    const distance = Math.sqrt(
      Math.pow(currentCenter.lng - center.lng, 2) + 
      Math.pow(currentCenter.lat - center.lat, 2)
    );
    
    // Only update if the change is significant (more than ~100 meters)
    if (distance > 0.001) {
      map.current.flyTo({ center: [center.lng, center.lat], duration: 1000 });
    }
  }, [center]);

  // Update map style when it changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) {
      return;
    }
    
    // Check if style actually changed
    if (lastAppliedStyle === mapStyle) {
      return;
    }
    
    // Store current center and zoom before style change
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();
    
    // Change the map style
    map.current.setStyle(currentMapStyle);
    
    // Wait for style to load and restore data
    const handleStyleLoad = () => {
      if (!map.current) return;
      
      // Restore center and zoom
      map.current.jumpTo({
        center: currentCenter,
        zoom: currentZoom
      });
      
      // Wait a bit for style to fully settle before adding layers
      setTimeout(() => {
        if (!map.current) return;
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

    // Note: No auto-fly to location. User location marker is added but
    // map only flies to location when user clicks the location button
  }, [userLocation]);

  const handleLocationButtonClick = useCallback((location: { lat: number; lng: number }) => {
    setUserLocation(location);
    if (map.current) {
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
        duration: 2000,
      });
      hasFlownToUserLocation.current = true;
    }
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      
      {/* Map provider attribution */}
      <MapAttribution />
      
      {/* Location button */}
      <LocationButton onLocationFound={handleLocationButtonClick} />
    </div>
  );
}
