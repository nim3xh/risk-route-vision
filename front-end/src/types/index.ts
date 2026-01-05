export type Vehicle = "Car" | "Bus" | "Motor Cycle" | "Three Wheeler" | "Van" | "Lorry";

export interface ScoreRequest {
  lat: number;
  lon: number;
  vehicle: Vehicle;
  timestamp?: string;
  hour?: number;
  is_wet?: 0 | 1;
  temperature_c?: number;
  humidity_pct?: number;
  precip_mm?: number;
  wind_kmh?: number;
}

export interface Weather {
  temperature_c: number;
  humidity_pct: number;
  precip_mm: number;
  wind_kmh: number;
  is_wet: 0 | 1;
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
  weather?: Weather;
  confidence?: {
    confidence: number;
    certainty: "low" | "medium" | "high";
    distance_from_threshold: number;
    consistency: number;
    avg_prediction: number;
    threshold: number;
  };
  explain?: Record<string, number>;
}

export interface SegmentFeatureProps {
  segment_id: string;
  risk_0_100: number;
  rate_pred?: number;
  hour: number;
  vehicle: Vehicle;
  top_cause?: string;
  // Optional ML model features (present when using realtime model)
  curvature?: number;
  surface_wetness_prob?: number;
  wind_speed?: number;
  temperature?: number;
  is_realtime?: boolean;
  // Blended model support
  risk_historical?: number;
  risk_realtime?: number;
  model_source?: "historical" | "realtime" | "max" | "blended";
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
  rate_pred?: number;
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
