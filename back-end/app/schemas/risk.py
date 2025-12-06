from typing import List, Dict, Literal
from .common import VehicleType, LatLng
from pydantic import BaseModel

class RiskScoreRequest(BaseModel):
    vehicleType: VehicleType
    coordinates: List[LatLng]
    timestampUtc: str | None = None

class RiskScoreResponse(BaseModel):
    overall: float
    segmentScores: List[float]
    explain: Dict[str, float]

class NearbyRequest(BaseModel):
    vehicleType: VehicleType
    point: LatLng
    radiusMeters: int = 300

class SegmentFeatureProperties(BaseModel):
    segment_id: str
    risk_0_100: int
    hour: int
    vehicle: VehicleType
    top_cause: str | None = None

class SegmentGeometry(BaseModel):
    type: Literal["Point", "LineString"]
    coordinates: List[float] | List[List[float]]

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
    vehicle: VehicleType
    hour: int
    top_cause: str | None = None
