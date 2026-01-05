"""
Router for detailed analytics and statistics.
Provides endpoints for analytics dashboards, comparisons, and trend analysis.
"""
from fastapi import APIRouter, Query
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from ..schemas.common import VehicleType
from ..services.geometry import per_point_curvature
from ..services.feature_engineering import build_features
from ..services.weather_adapter import snapshot_for_polyline
from ..ml.model import predict_segment_scores, predict_with_cause
import statistics

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.post("/route-comparison")
async def compare_routes(
    routes: List[Dict[str, Any]],
    vehicle: VehicleType = Query("CAR"),
    hour: Optional[int] = Query(None, ge=0, le=23),
):
    """
    Compare risk metrics across multiple routes.
    Each route should have: name, coordinates (list of [lat, lon])
    
    Returns: Risk comparison with statistics for each route
    """
    results = []
    
    for route in routes:
        name = route.get("name", "Route")
        coords = route.get("coordinates", [])
        
        if len(coords) < 2:
            continue
        
        # Get weather
        weather = await snapshot_for_polyline(coords, None)
        
        # Build features and predict
        feats = build_features(coords, weather, vehicle)
        seg, causes, rates = predict_segment_scores(feats, coords)
        
        overall = float(sum(seg) / len(seg)) if seg else 0
        max_risk = max(seg) if seg else 0
        min_risk = min(seg) if seg else 0
        
        # Calculate statistics
        high_risk_count = sum(1 for s in seg if s > 70)
        medium_risk_count = sum(1 for s in seg if 40 <= s <= 70)
        low_risk_count = sum(1 for s in seg if s < 40)
        
        results.append({
            "name": name,
            "overall_risk": overall,
            "max_risk": max_risk,
            "min_risk": min_risk,
            "avg_risk": overall,
            "std_dev": statistics.stdev(seg) if len(seg) > 1 else 0,
            "segment_count": len(seg),
            "high_risk_count": high_risk_count,
            "medium_risk_count": medium_risk_count,
            "low_risk_count": low_risk_count,
            "risk_distribution": {
                "high": high_risk_count,
                "medium": medium_risk_count,
                "low": low_risk_count
            },
            "top_cause": max(set(causes), key=causes.count) if causes else None,
            "weather_factors": {
                "temperature": weather.get("temperature"),
                "humidity": weather.get("humidity"),
                "precipitation": weather.get("precipitation"),
                "wind_speed": weather.get("wind_speed"),
            }
        })
    
    # Sort by overall risk for ranking
    results = sorted(results, key=lambda x: x["overall_risk"])
    
    return {
        "comparison": results,
        "safest_route": results[0]["name"] if results else None,
        "riskiest_route": results[-1]["name"] if results else None,
        "vehicle_type": vehicle,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/risk-distribution")
async def get_risk_distribution(
    bbox: Optional[str] = Query(None),
    vehicle: Optional[VehicleType] = Query(None),
    hour: Optional[int] = Query(None, ge=0, le=23),
):
    """
    Get risk distribution metrics for a region.
    Returns histogram and statistics of risk scores.
    """
    from ..services.risk_segments import generate_risk_segments
    
    bbox_tuple = None
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(',')]
            bbox_tuple = tuple(parts)
        except:
            pass
    
    segments = generate_risk_segments(
        bbox=bbox_tuple,
        hour=hour,
        vehicle_type=vehicle
    )
    
    risks = [seg["properties"]["risk_0_100"] for seg in segments]
    
    if not risks:
        return {
            "distribution": [],
            "statistics": {},
            "segments_count": 0
        }
    
    # Create histogram (10 bins)
    bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    histogram = {}
    for i in range(len(bins) - 1):
        count = sum(1 for r in risks if bins[i] <= r < bins[i+1])
        histogram[f"{bins[i]}-{bins[i+1]}"] = count
    
    return {
        "distribution": histogram,
        "statistics": {
            "mean": statistics.mean(risks),
            "median": statistics.median(risks),
            "stdev": statistics.stdev(risks) if len(risks) > 1 else 0,
            "min": min(risks),
            "max": max(risks),
            "q1": sorted(risks)[len(risks)//4],
            "q3": sorted(risks)[3*len(risks)//4],
        },
        "segments_count": len(risks),
        "high_risk_percent": round(sum(1 for r in risks if r > 70) / len(risks) * 100, 1),
        "medium_risk_percent": round(sum(1 for r in risks if 40 <= r <= 70) / len(risks) * 100, 1),
        "low_risk_percent": round(sum(1 for r in risks if r < 40) / len(risks) * 100, 1),
    }


@router.get("/vehicle-comparison")
async def vehicle_risk_comparison(
    bbox: Optional[str] = Query(None),
    hour: Optional[int] = Query(None, ge=0, le=23),
):
    """
    Compare risk scores across all vehicle types for the same location.
    """
    from ..services.risk_segments import generate_risk_segments
    
    vehicles: List[VehicleType] = ["CAR", "MOTORCYCLE", "THREE_WHEELER", "BUS", "LORRY", "VAN"]
    
    bbox_tuple = None
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(',')]
            bbox_tuple = tuple(parts)
        except:
            pass
    
    results = {}
    for vehicle in vehicles:
        segments = generate_risk_segments(
            bbox=bbox_tuple,
            hour=hour,
            vehicle_type=vehicle
        )
        
        risks = [seg["properties"]["risk_0_100"] for seg in segments]
        if risks:
            results[vehicle] = {
                "avg_risk": round(sum(risks) / len(risks), 2),
                "max_risk": round(max(risks), 2),
                "min_risk": round(min(risks), 2),
                "high_risk_count": sum(1 for r in risks if r > 70),
            }
    
    return {
        "vehicle_comparison": results,
        "safest_vehicle": min(results, key=lambda v: results[v]["avg_risk"]) if results else None,
        "most_risky_vehicle": max(results, key=lambda v: results[v]["avg_risk"]) if results else None,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/hourly-trends")
async def get_hourly_trends(
    bbox: Optional[str] = Query(None),
    vehicle: Optional[VehicleType] = Query("CAR"),
):
    """
    Get risk trends across different hours of the day.
    Useful for planning safe travel times.
    """
    from ..services.risk_segments import generate_risk_segments
    
    bbox_tuple = None
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(',')]
            bbox_tuple = tuple(parts)
        except:
            pass
    
    hourly_data = []
    
    for hour in range(24):
        segments = generate_risk_segments(
            bbox=bbox_tuple,
            hour=hour,
            vehicle_type=vehicle
        )
        
        risks = [seg["properties"]["risk_0_100"] for seg in segments]
        
        if risks:
            hourly_data.append({
                "hour": hour,
                "avg_risk": round(sum(risks) / len(risks), 2),
                "max_risk": round(max(risks), 2),
                "segment_count": len(risks),
                "high_risk_count": sum(1 for r in risks if r > 70),
            })
    
    # Find safest and most dangerous hours
    safest_hour = min(hourly_data, key=lambda x: x["avg_risk"]) if hourly_data else None
    most_dangerous_hour = max(hourly_data, key=lambda x: x["avg_risk"]) if hourly_data else None
    
    return {
        "hourly_trends": hourly_data,
        "safest_hour": safest_hour["hour"] if safest_hour else None,
        "most_dangerous_hour": most_dangerous_hour["hour"] if most_dangerous_hour else None,
        "vehicle_type": vehicle,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/route-details")
async def get_route_details(
    coordinates: List[List[float]],
    vehicle: VehicleType = Query("CAR"),
    hour: Optional[int] = Query(None, ge=0, le=23),
):
    """
    Get detailed analysis for a specific route including segment breakdown.
    Returns per-segment details with causes and factors.
    """
    if len(coordinates) < 2:
        return {"error": "Need at least 2 coordinates"}
    
    weather = await snapshot_for_polyline(coordinates, None)
    feats = build_features(coordinates, weather, vehicle)
    seg, causes, rates = predict_segment_scores(feats, coordinates)
    
    # Get curvature for each segment
    curvatures = per_point_curvature(coordinates)
    
    # Build detailed segment information
    segments_detail = []
    for i in range(len(seg)):
        start_coord = coordinates[i] if i < len(coordinates) else None
        end_coord = coordinates[i + 1] if i + 1 < len(coordinates) else None
        
        segments_detail.append({
            "segment_index": i,
            "start": {"lat": start_coord[0], "lon": start_coord[1]} if start_coord else None,
            "end": {"lat": end_coord[0], "lon": end_coord[1]} if end_coord else None,
            "risk_score": round(seg[i], 2),
            "risk_level": "HIGH" if seg[i] > 70 else ("MEDIUM" if seg[i] >= 40 else "LOW"),
            "top_cause": causes[i] if i < len(causes) else None,
            "accident_severity_rate": round(rates[i], 2) if i < len(rates) else None,
            "curvature": round(curvatures[i], 3) if i < len(curvatures) else None,
            "weather_influence": {
                "temperature": weather.get("temperature"),
                "humidity": weather.get("humidity"),
                "precipitation": weather.get("precipitation"),
                "wind_speed": weather.get("wind_speed"),
            }
        })
    
    overall_risk = sum(seg) / len(seg) if seg else 0
    
    return {
        "overall_risk": round(overall_risk, 2),
        "segment_count": len(seg),
        "segments": segments_detail,
        "high_risk_segments": sum(1 for s in seg if s > 70),
        "medium_risk_segments": sum(1 for s in seg if 40 <= s <= 70),
        "low_risk_segments": sum(1 for s in seg if s < 40),
        "vehicle_type": vehicle,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/risk-factors")
async def get_risk_factors(
    lat: float = Query(...),
    lon: float = Query(...),
    vehicle: VehicleType = Query("CAR"),
    hour: Optional[int] = Query(None, ge=0, le=23),
):
    """
    Get detailed breakdown of risk factors for a specific location.
    Shows which factors contribute most to the risk score.
    """
    coords = [[lat, lon], [lat + 0.0009, lon + 0.0009]]
    
    weather = await snapshot_for_polyline(coords, None)
    feats = build_features(coords, weather, vehicle)
    seg, _, _ = predict_segment_scores(feats, coords)
    
    # Normalize risk factors to 0-100
    curvature = feats.get("curvature", 0)
    if isinstance(curvature, list):
        curvature = sum(curvature) / len(curvature) if curvature else 0
    
    # Calculate factor importance (simplified)
    base_risk = 20  # baseline
    
    # These are rough estimates - should be based on actual model coefficients
    curvature_impact = min(curvature * 50, 30)  # max 30% impact
    weather_impact = 0
    
    if weather.get("is_rain"):
        weather_impact += 20
    if weather.get("wind_speed", 0) > 20:
        weather_impact += 15
    if weather.get("temperature", 20) < 5 or weather.get("temperature", 20) > 35:
        weather_impact += 10
    
    weather_impact = min(weather_impact, 40)  # max 40% impact
    
    vehicle_impact = 10  # vehicle type impact
    
    return {
        "location": {"lat": lat, "lon": lon},
        "overall_risk": round(seg[0] if seg else 0, 2),
        "factors": {
            "base_risk": base_risk,
            "curvature": {
                "value": round(curvature, 3),
                "impact_percent": round(curvature_impact, 1),
                "description": "Road curvature and bends"
            },
            "weather": {
                "temperature": weather.get("temperature"),
                "humidity": weather.get("humidity"),
                "precipitation": weather.get("precipitation"),
                "wind_speed": weather.get("wind_speed"),
                "impact_percent": round(weather_impact, 1),
                "description": "Weather conditions"
            },
            "vehicle_type": {
                "type": vehicle,
                "impact_percent": round(vehicle_impact, 1),
                "description": "Vehicle-specific risk thresholds"
            }
        },
        "timestamp": datetime.utcnow().isoformat()
    }
