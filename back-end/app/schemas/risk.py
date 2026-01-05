from typing import List, Dict, Literal
from .common import VehicleType, LatLng
from pydantic import BaseModel

class WeatherInput(BaseModel):
    temperature: float | None = None
    humidity: float | None = None
    precipitation: float | None = None
    wind_speed: float | None = None
    is_wet: int | None = None

class RiskScoreRequest(BaseModel):
    vehicleType: VehicleType
    coordinates: List[LatLng]
    timestampUtc: str | None = None
    hour: int | None = None
    weather: WeatherInput | None = None

class SegmentDetail(BaseModel):
    """Detailed information for each route segment"""
    index: int
    coordinate: LatLng
    risk_score: float  # 0-1 normalized risk score
    risk_0_100: int  # 0-100 risk score
    cause: str  # Predicted cause/reason for risk
    incident_rate: float  # Predicted incident rate
    curvature: float  # Road curvature at this point
    surface_wetness_prob: float  # Probability of wet surface
    temperature: float
    wind_speed: float
    humidity: float
    precipitation: float
    vehicle_factor: float
    is_high_risk: bool  # Whether this segment exceeds risk threshold

class RiskScoreResponse(BaseModel):
    overall: float
    overall_0_100: int  # Overall risk in 0-100 scale
    segmentScores: List[float]  # Kept for backward compatibility
    segmentCoordinates: List[LatLng]  # Kept for backward compatibility
    segmentCauses: List[str] | None = None  # Kept for backward compatibility
    rateScores: List[float] | None = None  # Kept for backward compatibility
    segments: List[SegmentDetail]  # NEW: Detailed per-segment information
    explain: Dict[str, float]
    confidence: Dict[str, float] | None = None
    weather: WeatherInput | None = None
    route_statistics: Dict[str, float] | None = None  # NEW: Overall route stats

class NearbyRequest(BaseModel):
    vehicleType: VehicleType
    point: LatLng
    radiusMeters: int = 300
    hour: int | None = None
    weather: WeatherInput | None = None

class SegmentFeatureProperties(BaseModel):
    segment_id: str
    risk_0_100: int
    rate_pred: float | None = None
    hour: int
    vehicle: VehicleType
    top_cause: str | None = None
    # Optional ML model features (for realtime predictions)
    curvature: float | None = None
    surface_wetness_prob: float | None = None
    wind_speed: float | None = None
    temperature: float | None = None
    is_realtime: bool | None = None

class SegmentGeometry(BaseModel):
    type: Literal["Point", "LineString", "Polygon"]
    coordinates: List[float] | List[List[float]] | List[List[List[float]]]

class SegmentFeature(BaseModel):
    type: Literal["Feature"]
    geometry: SegmentGeometry
    properties: SegmentFeatureProperties

class SegmentsTodayResponse(BaseModel):
    type: Literal["FeatureCollection"]
    features: List[SegmentFeature]

class TopSpot(BaseModel):
    segment_id: str
    lat: float
    lon: float
    risk_0_100: int
    rate_pred: float | None = None
    vehicle: VehicleType
    hour: int
    top_cause: str | None = None
