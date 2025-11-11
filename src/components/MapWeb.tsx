import { useMemo } from "react";
import Map, { Layer, Source, MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { ViewState } from "react-map-gl/maplibre";
import { SegmentFeature } from "@/types";
import { riskToColor } from "@/lib/utils/colors";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapWebProps {
  center: { lat: number; lng: number };
  segments: SegmentFeature[];
  onSegmentClick?: (segment: SegmentFeature) => void;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}

export function MapWeb({ center, segments, onSegmentClick, onCenterChange }: MapWebProps) {
  const geojsonData = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: segments.map((segment) => ({
        type: "Feature" as const,
        geometry: segment.geometry as any,
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

  return (
    <Map
      initialViewState={{
        longitude: center.lng,
        latitude: center.lat,
        zoom: 13,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      onMove={(evt) => {
        if (onCenterChange) {
          const viewState = evt.viewState as ViewState & { longitude: number; latitude: number };
          onCenterChange({ lat: viewState.latitude, lng: viewState.longitude });
        }
      }}
      onClick={handleClick}
      interactiveLayerIds={["segments-circles"]}
    >
      <Source id="segments" type="geojson" data={geojsonData as any}>
        <Layer
          id="segments-circles"
          type="circle"
          paint={{
            "circle-radius": 50,
            "circle-color": ["get", "color"],
            "circle-opacity": 0.4,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.8,
          }}
        />
      </Source>
    </Map>
  );
}
