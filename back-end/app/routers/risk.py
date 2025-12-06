from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..schemas.risk import (
    RiskScoreRequest, 
    RiskScoreResponse, 
    NearbyRequest,
    SegmentsTodayResponse,
    TopSpot
)
from ..schemas.common import VehicleType
from ..services.weather_adapter import snapshot_for_polyline
from ..services.feature_engineering import build_features
from ..ml.model import predict_segment_scores, predict_with_cause
from ..services.risk_segments import generate_risk_segments, get_top_risk_spots

router = APIRouter(prefix="/api/v1/risk", tags=["risk"])

@router.post("/score", response_model=RiskScoreResponse)
async def score(req: RiskScoreRequest):
    """
    Calculate risk score for a route using XGBoost model with vehicle-specific thresholds.
    Returns overall risk, per-segment scores, and explanatory features.
    """
    try:
        if len(req.coordinates) < 2:
            raise HTTPException(400, "Need at least 2 coordinates")
        
        # Get weather data
        weather = await snapshot_for_polyline(req.coordinates, req.timestampUtc)
        
        # Build features
        feats = build_features(req.coordinates, weather, req.vehicleType)
        
        # Add timestamp to features if provided
        if req.timestampUtc:
            feats["timestamp"] = req.timestampUtc
        
        # Predict using XGBoost model with vehicle-specific thresholds
        seg = predict_segment_scores(feats, req.coordinates)
        overall = float(sum(seg) / len(seg))
        
        # Prepare explanation with model features
        explain = {
            "curvature": feats["curvature"],
            "surface_wetness_prob": feats.get("surface_wetness_prob", feats.get("is_wet", 0.0)),
            "wind_speed": feats["wind_speed"],
            "temperature": feats.get("temperature", 0.0),
            "vehicle_factor": feats.get("vehicle_factor", 1.0),
        }
        
        return {
            "overall": overall,
            "segmentScores": seg,
            "explain": explain
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR in /score endpoint] {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Internal server error: {str(e)}")

@router.post("/nearby", response_model=RiskScoreResponse)
async def nearby(req: NearbyRequest):
    """
    Calculate risk for nearby area using XGBoost model.
    """
    lat, lon = req.point
    coords = [[lat, lon],[lat+0.0009, lon+0.0009],[lat+0.0018, lon+0.0018]]
    weather = await snapshot_for_polyline(coords, None)
    feats = build_features(coords, weather, req.vehicleType)
    seg = predict_segment_scores(feats, coords)
    overall = float(sum(seg)/len(seg))
    return {
        "overall": overall,
        "segmentScores": seg,
        "explain": {"curvature": feats["curvature"]}
    }

@router.get("/segments/today", response_model=SegmentsTodayResponse)
async def get_segments_today(
    bbox: Optional[str] = Query(None, description="Bounding box as 'minLon,minLat,maxLon,maxLat'"),
    hour: Optional[int] = Query(None, ge=0, le=23, description="Hour of day (0-23)"),
    vehicle: Optional[VehicleType] = Query(None, description="Vehicle type filter")
):
    """
    Get risk segments for today filtered by bounding box, hour, and vehicle type
    """
    # Parse bounding box
    bbox_tuple = None
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(',')]
            if len(parts) != 4:
                raise HTTPException(400, "bbox must have 4 values: minLon,minLat,maxLon,maxLat")
            bbox_tuple = tuple(parts)
        except ValueError:
            raise HTTPException(400, "Invalid bbox format. Use: minLon,minLat,maxLon,maxLat")
    
    # Generate segments
    segments = generate_risk_segments(
        bbox=bbox_tuple,
        hour=hour,
        vehicle_type=vehicle
    )
    
    return SegmentsTodayResponse(
        type="FeatureCollection",
        features=segments
    )

@router.get("/spots/top", response_model=list[TopSpot])
async def get_top_spots(
    vehicle: Optional[VehicleType] = Query(None, description="Vehicle type filter"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of spots to return")
):
    """
    Get top risk spots sorted by risk score
    """
    spots = get_top_risk_spots(
        vehicle_type=vehicle,
        limit=limit
    )
    
    return spots
