from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from ..schemas.risk import (
    RiskScoreRequest, 
    RiskScoreResponse, 
    NearbyRequest,
    SegmentsTodayResponse,
    TopSpot,
    SegmentFeature,
    SegmentGeometry,
    SegmentFeatureProperties
)
from ..schemas.common import VehicleType
from ..services.weather_adapter import snapshot_for_polyline
from ..services.feature_engineering import build_features
from ..services.geometry import per_point_curvature
from ..services.geo_utils import route_intersects_ginigathena, filter_coordinates_in_ginigathena, is_within_ginigathena
from ..ml.model import predict_segment_scores, predict_with_cause, calculate_prediction_confidence, get_feature_importance
from ..services.risk_segments import generate_risk_segments, get_top_risk_spots, generate_segment_id, hash_coords, seeded_random

router = APIRouter(prefix="/api/v1/risk", tags=["risk"])

@router.post("/score", response_model=RiskScoreResponse)
async def score(req: RiskScoreRequest):
    """
    Calculate risk score for a route using XGBoost model with vehicle-specific thresholds.
    
    This endpoint supports BOTH live data and manual data:
    - LIVE DATA: If 'weather' is not provided, fetches real-time weather from APIs
    - MANUAL DATA: If 'weather' is provided, uses your specified values
    - TIME DATA: Uses 'timestampUtc' or 'hour' for time-based risk patterns
    
    Returns overall risk, per-segment scores, and explanatory features.
    Only processes coordinates within Ginigathena area.
    """
    try:
        if len(req.coordinates) < 2:
            raise HTTPException(400, "Need at least 2 coordinates")
        
        # Filter coordinates to only include those within Ginigathena area
        ginigathena_coords = filter_coordinates_in_ginigathena(req.coordinates)
        
        if len(ginigathena_coords) < 2:
            raise HTTPException(
                400, 
                "Route is outside Ginigathena service area. Risk analysis is only available for routes within Ginigathena."
            )
        
        # Create a mapping of original indices to filtered indices
        coord_indices = []
        for i, coord in enumerate(req.coordinates):
            if is_within_ginigathena(coord[0], coord[1]):
                coord_indices.append(i)
        
        # Get weather data - MANUAL (from request) or LIVE (from API)
        if req.weather:
            # MANUAL MODE: Use user-provided weather data
            weather = {
                "temperature": req.weather.temperature,
                "humidity": req.weather.humidity,
                "precipitation": req.weather.precipitation,
                "wind_speed": req.weather.wind_speed,
                "is_rain": (req.weather.precipitation or 0.0) > 0.1 or (req.weather.is_wet == 1)
            }
            print(f"[Info] Using MANUAL weather data: {weather}")
        else:
            # LIVE MODE: Fetch real-time weather from API
            weather = await snapshot_for_polyline(ginigathena_coords, req.timestampUtc)
            print(f"[Info] Using LIVE weather data: {weather}")
        
        # Calculate curvature only for Ginigathena coordinates
        curvatures = per_point_curvature(ginigathena_coords)
        weather["curvature"] = curvatures
        
        # Build features for Ginigathena coordinates only
        feats = build_features(ginigathena_coords, weather, req.vehicleType)
        if req.timestampUtc:
            feats["timestamp"] = req.timestampUtc
        
        # TIME DATA: Use manual hour override if provided, otherwise use timestamp
        hour_for_prediction = req.hour
        
        # Predict using ML models for Ginigathena coordinates only
        seg, causes, rates = predict_with_cause(
            ginigathena_coords, 
            weather, 
            req.vehicleType, 
            timestamp=req.timestampUtc,
            hour=hour_for_prediction  # Pass hour override for time-based patterns
        )
        overall = float(sum(seg) / len(seg))
        
        # Calculate confidence metrics
        # We need raw predictions for confidence calculation
        _, raw_spi, _ = predict_segment_scores(feats, ginigathena_coords)
        confidence_metrics = calculate_prediction_confidence(raw_spi, req.vehicleType)
        
        # Prepare explanation with model features
        # Convert curvature list to average value for response
        curvature_val = feats["curvature"]
        if isinstance(curvature_val, list):
            curvature_val = float(sum(curvature_val) / len(curvature_val)) if curvature_val else 0.0
        
        explain = {
            "curvature": float(curvature_val),
            "surface_wetness_prob": float(feats.get("surface_wetness_prob", feats.get("is_wet", 0.0))),
            "wind_speed": float(feats["wind_speed"]),
            "temperature": float(feats.get("temperature", 0.0)),
            "vehicle_factor": float(feats.get("vehicle_factor", 1.0)),
        }
        
        # Build detailed segment information
        curvatures = feats["curvature"] if isinstance(feats["curvature"], list) else [feats["curvature"]] * len(ginigathena_coords)
        surface_wetness = feats.get("surface_wetness_prob", feats.get("is_wet", 0.0))
        
        # Load vehicle thresholds for high-risk determination
        from ..ml.model import load_vehicle_thresholds
        thresholds = load_vehicle_thresholds()
        threshold = thresholds.get(req.vehicleType, thresholds.get("__GLOBAL__", 0.5))
        
        segments = []
        for i in range(len(ginigathena_coords)):
            segment_risk = seg[i]
            segments.append({
                "index": i,
                "coordinate": ginigathena_coords[i],
                "risk_score": float(segment_risk),
                "risk_0_100": int(segment_risk * 100),
                "cause": causes[i] if i < len(causes) else "Unknown",
                "incident_rate": float(rates[i]) if i < len(rates) else 0.0,
                "curvature": float(curvatures[i]) if i < len(curvatures) else 0.0,
                "surface_wetness_prob": float(surface_wetness),
                "temperature": float(feats.get("temperature", 0.0)),
                "wind_speed": float(feats["wind_speed"]),
                "humidity": float(feats.get("humidity", 0.0)),
                "precipitation": float(feats.get("precipitation", 0.0)),
                "vehicle_factor": float(feats.get("vehicle_factor", 1.0)),
                "is_high_risk": segment_risk > threshold
            })
        
        # Calculate route statistics
        high_risk_count = sum(1 for s in segments if s["is_high_risk"])
        route_statistics = {
            "total_segments": len(segments),
            "high_risk_segments": high_risk_count,
            "high_risk_percentage": (high_risk_count / len(segments) * 100) if segments else 0.0,
            "max_risk": max(seg) if seg else 0.0,
            "min_risk": min(seg) if seg else 0.0,
            "avg_curvature": float(sum(curvatures) / len(curvatures)) if curvatures else 0.0,
            "avg_incident_rate": float(sum(rates) / len(rates)) if rates else 0.0
        }
        
        return {
            "overall": overall,
            "overall_0_100": int(overall * 100),
            "segmentScores": seg,
            "segmentCoordinates": ginigathena_coords,  # Only Ginigathena coordinates
            "segmentCauses": causes,
            "rateScores": rates,
            "segments": segments,  # NEW: Detailed segment information
            "explain": explain,
            "confidence": confidence_metrics,
            "weather": {
                "temperature": weather.get("temperature"),
                "humidity": weather.get("humidity"),
                "precipitation": weather.get("precipitation"),
                "wind_speed": weather.get("wind_speed"),
                "is_wet": 1 if weather.get("is_rain") else 0
            },
            "route_statistics": route_statistics  # NEW: Route-level statistics
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
    
    Supports both LIVE and MANUAL weather data:
    - LIVE: If 'weather' is not provided, fetches real-time weather
    - MANUAL: If 'weather' is provided, uses your specified values
    
    Only works within Ginigathena service area.
    """
    try:
        lat, lon = req.point
        
        # Check if point is within Ginigathena area
        if not is_within_ginigathena(lat, lon):
            raise HTTPException(
                400, 
                "Location is outside Ginigathena service area. Risk analysis is only available within Ginigathena."
            )
        
        coords = [[lat, lon],[lat+0.0009, lon+0.0009],[lat+0.0018, lon+0.0018]]
        
        # Get weather data - MANUAL or LIVE
        if req.weather:
            # MANUAL MODE
            weather = {
                "temperature": req.weather.temperature,
                "humidity": req.weather.humidity,
                "precipitation": req.weather.precipitation,
                "wind_speed": req.weather.wind_speed,
                "is_rain": (req.weather.precipitation or 0.0) > 0.1 or (req.weather.is_wet == 1)
            }
            print(f"[Info] Nearby - Using MANUAL weather: {weather}")
        else:
            # LIVE MODE
            weather = await snapshot_for_polyline(coords, None)
            print(f"[Info] Nearby - Using LIVE weather: {weather}")
        
        # Build features and predict
        feats = build_features(coords, weather, req.vehicleType)
        
        # Predict using ML models
        seg, causes, rates = predict_with_cause(
            coords, 
            weather,  # Pass weather dict, not feats
            req.vehicleType,
            hour=req.hour
        )
        overall = float(sum(seg)/len(seg))
        
        # Calculate confidence metrics
        _, raw_spi, _ = predict_segment_scores(feats, coords)
        confidence_metrics = calculate_prediction_confidence(raw_spi, req.vehicleType)
        
        # Prepare explanation with model features
        # Convert curvature list to average value for response
        curvature_val = feats.get("curvature", 0.0)
        if isinstance(curvature_val, list):
            curvature_val = float(sum(curvature_val) / len(curvature_val)) if curvature_val else 0.0
        
        explain = {
            "curvature": float(curvature_val),
            "surface_wetness_prob": float(feats.get("surface_wetness_prob", 1.0 if weather.get("is_rain") else 0.0)),
            "wind_speed": float(feats.get("wind_speed", weather.get("wind_speed", 0.0))),
            "temperature": float(feats.get("temperature", weather.get("temperature", 0.0))),
            "vehicle_factor": float(feats.get("vehicle_factor", 1.0)),
        }
        
        # Build detailed segment information
        curvatures = feats.get("curvature", [0.0] * len(coords))
        if not isinstance(curvatures, list):
            curvatures = [curvatures] * len(coords)
        surface_wetness = feats.get("surface_wetness_prob", 1.0 if weather.get("is_rain") else 0.0)
        
        # Load vehicle thresholds for high-risk determination
        from ..ml.model import load_vehicle_thresholds
        thresholds = load_vehicle_thresholds()
        threshold = thresholds.get(req.vehicleType, thresholds.get("__GLOBAL__", 0.5))
        
        segments = []
        for i in range(len(coords)):
            segment_risk = seg[i]
            segments.append({
                "index": i,
                "coordinate": coords[i],
                "risk_score": float(segment_risk),
                "risk_0_100": int(segment_risk * 100),
                "cause": causes[i] if i < len(causes) else "Unknown",
                "incident_rate": float(rates[i]) if i < len(rates) else 0.0,
                "curvature": float(curvatures[i]) if i < len(curvatures) else 0.0,
                "surface_wetness_prob": float(surface_wetness),
                "temperature": float(feats.get("temperature", weather.get("temperature", 0.0))),
                "wind_speed": float(feats.get("wind_speed", weather.get("wind_speed", 0.0))),
                "humidity": float(feats.get("humidity", weather.get("humidity", 0.0))),
                "precipitation": float(feats.get("precipitation", weather.get("precipitation", 0.0))),
                "vehicle_factor": float(feats.get("vehicle_factor", 1.0)),
                "is_high_risk": segment_risk > threshold
            })
        
        # Calculate route statistics
        high_risk_count = sum(1 for s in segments if s["is_high_risk"])
        route_statistics = {
            "total_segments": len(segments),
            "high_risk_segments": high_risk_count,
            "high_risk_percentage": (high_risk_count / len(segments) * 100) if segments else 0.0,
            "max_risk": max(seg) if seg else 0.0,
            "min_risk": min(seg) if seg else 0.0,
            "avg_curvature": float(sum(curvatures) / len(curvatures)) if curvatures else 0.0,
            "avg_incident_rate": float(sum(rates) / len(rates)) if rates else 0.0
        }

        return {
            "overall": overall,
            "overall_0_100": int(overall * 100),
            "segmentScores": seg,
            "segmentCoordinates": coords,  # Add coordinates for consistency
            "segmentCauses": causes,
            "rateScores": rates,
            "segments": segments,  # NEW: Detailed segment information
            "explain": explain,
            "confidence": confidence_metrics,
            "weather": {
                "temperature": weather.get("temperature"),
                "humidity": weather.get("humidity"),
                "precipitation": weather.get("precipitation"),
                "wind_speed": weather.get("wind_speed"),
                "is_wet": 1 if weather.get("is_rain") else 0
            },
            "route_statistics": route_statistics  # NEW: Route-level statistics
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR in /nearby endpoint] {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Internal server error: {str(e)}")

@router.get("/segments/today", response_model=SegmentsTodayResponse)
async def get_segments_today(
    bbox: Optional[str] = Query(None, description="Bounding box as 'minLon,minLat,maxLon,maxLat'"),
    hour: Optional[int] = Query(None, ge=0, le=23, description="Hour of day (0-23)"),
    vehicle: Optional[VehicleType] = Query(None, description="Vehicle type filter"),
    temperature: Optional[float] = Query(None),
    humidity: Optional[float] = Query(None),
    precipitation: Optional[float] = Query(None),
    wind_speed: Optional[float] = Query(None),
    is_wet: Optional[int] = Query(None, ge=0, le=1),
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
    
    weather_input = {
        "temperature": temperature,
        "humidity": humidity,
        "precipitation": precipitation,
        "wind_speed": wind_speed,
        "is_wet": is_wet
    }
    
    # Generate segments
    segments = generate_risk_segments(
        bbox=bbox_tuple,
        hour=hour,
        vehicle_type=vehicle,
        weather_input=weather_input
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


@router.get("/segments/realtime", response_model=SegmentsTodayResponse)
async def get_segments_realtime(
    bbox: Optional[str] = Query(None, description="Bounding box as 'minLon,minLat,maxLon,maxLat'"),
    hour: Optional[int] = Query(None, ge=0, le=23, description="Hour of day (0-23)"),
    vehicle: Optional[VehicleType] = Query(None, description="Vehicle type filter"),
    temperature: Optional[float] = Query(None, description="Temperature in Celsius"),
    humidity: Optional[float] = Query(None, description="Humidity percentage"),
    precipitation: Optional[float] = Query(None, description="Precipitation in mm"),
    wind_speed: Optional[float] = Query(None, description="Wind speed in km/h"),
    is_wet: Optional[int] = Query(None, ge=0, le=1, description="Is road wet (0 or 1)"),
):
    """
    Get risk segments enhanced with REALTIME XGBoost model predictions.
    
    Process:
    1. First get base segment risk data (high-risk areas)
    2. Then enhance each segment with realtime predictions considering time and vehicle
    
    Supports both LIVE and MANUAL weather:
    - LIVE: If weather params are not provided, fetches real-time weather from APIs
    - MANUAL: If weather params are provided, uses your specified values
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
    
    # Use current hour if not specified
    if hour is None:
        hour = datetime.now().hour
    
    # Default vehicle if not specified
    if vehicle is None:
        vehicle = VehicleType.CAR
    
    # Step 1: Get base segment risk data (historical/geographical risk areas)
    weather_input = {
        "temperature": temperature,
        "humidity": humidity,
        "precipitation": precipitation,
        "wind_speed": wind_speed,
        "is_wet": is_wet
    }
    
    base_segments = generate_risk_segments(
        bbox=bbox_tuple,
        hour=hour,
        vehicle_type=vehicle,
        weather_input=weather_input
    )
    
    # Get center of bbox for weather
    if bbox_tuple:
        min_lon, min_lat, max_lon, max_lat = bbox_tuple
    else:
        min_lon, min_lat, max_lon, max_lat = (80.43, 6.92, 80.49, 6.97)
    
    center_lat = (min_lat + max_lat) / 2
    center_lon = (min_lon + max_lon) / 2
    
    # Determine if we should fetch live weather
    use_live_weather = (temperature is None or humidity is None or 
                        precipitation is None or wind_speed is None)
    
    if use_live_weather:
        try:
            # Use snapshot_for_polyline with center point
            weather = await snapshot_for_polyline([[center_lat, center_lon]], None)
        except Exception as e:
            print(f"[Warning] Failed to fetch live weather, using defaults: {e}")
            weather = {
                "temperature": 28.0,
                "humidity": 75.0,
                "precipitation": 0.0,
                "wind_speed": 10.0,
                "is_rain": False
            }
    else:
        weather = {
            "temperature": temperature,
            "humidity": humidity,
            "precipitation": precipitation,
            "wind_speed": wind_speed,
            "is_rain": (precipitation or 0.0) > 0.1 or (is_wet == 1)
        }
    
    # Step 2: Enhance segments with realtime ML predictions - each cell independently
    enhanced_segments = []
    
    for segment in base_segments:
        try:
            # Get center coordinates from Polygon segment
            if segment.geometry.type == "Polygon":
                # Get center of polygon for independent risk calculation
                coords_list = segment.geometry.coordinates
                if isinstance(coords_list, list) and len(coords_list) > 0 and len(coords_list[0]) > 0:
                    ring = coords_list[0]  # Exterior ring
                    lon = sum(p[0] for p in ring[:-1]) / (len(ring) - 1)
                    lat = sum(p[1] for p in ring[:-1]) / (len(ring) - 1)
                    # Single point for this cell's independent prediction
                    coords = [(lat, lon)]
                else:
                    continue
            elif segment.geometry.type == "Point":
                coords_list = segment.geometry.coordinates
                if isinstance(coords_list, list) and len(coords_list) == 2:
                    lon, lat = coords_list
                    coords = [(lat, lon)]
                else:
                    continue
            elif segment.geometry.type == "LineString":
                coords_list = segment.geometry.coordinates
                if isinstance(coords_list, list) and len(coords_list) > 0:
                    # Get center point
                    mid_idx = len(coords_list) // 2
                    lon, lat = coords_list[mid_idx]
                    coords = [(lat, lon)]
                else:
                    continue
            else:
                continue
            
            # Calculate curvature for this cell based on location
            seed = hash_coords(lat, lon)
            cell_curvature = seeded_random(seed) * 0.25
            
            # Create weather copy with cell-specific curvature
            cell_weather = weather.copy()
            cell_weather["curvature"] = [cell_curvature]
            
            # Independent realtime prediction for THIS CELL ONLY
            seg_scores, causes, rates = predict_with_cause(
                coords,
                cell_weather,
                vehicle,
                hour=hour
            )
            
            # Use the prediction result (single point)
            realtime_risk = int(seg_scores[0] * 100)
            realtime_cause = causes[0]
            
            # Get model features for explanation
            surface_wetness = 1.0 if cell_weather.get("is_rain") else 0.0
            
            # Create enhanced segment with realtime predictions
            enhanced_segment = SegmentFeature(
                type="Feature",
                geometry=segment.geometry,  # Keep original Polygon geometry
                properties=SegmentFeatureProperties(
                    segment_id=segment.properties.segment_id,
                    risk_0_100=realtime_risk,  # Use realtime risk score
                    top_cause=realtime_cause,   # Use realtime top cause
                    hour=hour,
                    vehicle=vehicle,
                    curvature=float(cell_curvature),
                    surface_wetness_prob=float(surface_wetness),
                    wind_speed=float(cell_weather.get("wind_speed", 0.0)),
                    temperature=float(cell_weather.get("temperature", 0.0)),
                    is_realtime=True  # Flag to indicate this uses realtime model
                )
            )
            
            enhanced_segments.append(enhanced_segment)
            
        except Exception as e:
            # If realtime prediction fails, keep the original segment
            print(f"[Warning] Failed to enhance segment {segment.properties.segment_id}: {e}")
            enhanced_segments.append(segment)
            continue
    
    return SegmentsTodayResponse(
        type="FeatureCollection",
        features=enhanced_segments
    )
