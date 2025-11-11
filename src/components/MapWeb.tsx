import { useEffect, useState, useCallback } from "react";
import { GoogleMap, useLoadScript, Marker, Circle } from "@react-google-maps/api";
import { config } from "@/lib/config";
import { SegmentFeature } from "@/types";
import { riskToColor } from "@/lib/utils/colors";
import { Skeleton } from "@/components/ui/skeleton";

interface MapWebProps {
  center: { lat: number; lng: number };
  segments: SegmentFeature[];
  onSegmentClick?: (segment: SegmentFeature) => void;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

export function MapWeb({ center, segments, onSegmentClick, onCenterChange }: MapWebProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: config.googleMapsApiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-sm text-destructive">Error loading maps</p>
          <p className="text-xs text-muted-foreground">
            {loadError.message}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={13}
      options={defaultMapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onCenterChanged={() => {
        if (map && onCenterChange) {
          const newCenter = map.getCenter();
          if (newCenter) {
            onCenterChange({
              lat: newCenter.lat(),
              lng: newCenter.lng(),
            });
          }
        }
      }}
    >
      {segments.map((segment) => {
        const coords = segment.geometry.coordinates as number[];
        const position = { lat: coords[1], lng: coords[0] };
        const color = riskToColor(segment.properties.risk_0_100);

        return (
          <Circle
            key={segment.properties.segment_id}
            center={position}
            radius={150}
            options={{
              fillColor: color,
              fillOpacity: 0.4,
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 2,
              clickable: true,
            }}
            onClick={() => onSegmentClick?.(segment)}
          />
        );
      })}
    </GoogleMap>
  );
}
