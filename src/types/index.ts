export type Vehicle = "Car" | "Bus" | "Motor Cycle" | "Three Wheeler" | "Van" | "Lorry";

export interface ScoreRequest {
  lat: number;
  lon: number;
  vehicle: Vehicle;
  timestamp?: string;
  is_wet?: 0 | 1;
  temperature_c?: number;
  humidity_pct?: number;
  precip_mm?: number;
  wind_kmh?: number;
}

export interface ScoreResponse {
  risk_0_100: number;
  top_cause: string;
  p_top_cause: number;
  rate_pred: number;
  components: {
    cause_component: number;
    rate_component: number;
    S_vehicle: number;
    W_weather: number;
  };
}

export interface SegmentFeatureProps {
  segment_id: string;
  risk_0_100: number;
  hour: number;
  vehicle: Vehicle;
  top_cause?: string;
}

export type SegmentFeature = {
  type: "Feature";
  geometry: { 
    type: "Point" | "LineString"; 
    coordinates: number[] | number[][];
  };
  properties: SegmentFeatureProps;
};

export interface SegmentsTodayResponse {
  type: "FeatureCollection";
  features: SegmentFeature[];
}

export interface TopSpot {
  segment_id: string;
  lat: number;
  lon: number;
  risk_0_100: number;
  vehicle: Vehicle;
  hour: number;
  top_cause?: string;
}

export type RiskBand = "safe" | "warning" | "danger";

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}
