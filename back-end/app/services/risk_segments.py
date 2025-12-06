"""
Service for generating and managing risk segments
"""
from typing import List, Tuple, Optional
import math
from datetime import datetime
from ..schemas.risk import SegmentFeature, SegmentGeometry, SegmentFeatureProperties, TopSpot
from ..schemas.common import VehicleType

def seeded_random(seed: int) -> float:
    """Deterministic pseudo-random number generator"""
    x = math.sin(seed) * 10000
    return x - math.floor(x)

def hash_coords(lat: float, lon: float) -> int:
    """Hash lat/lon to a seed"""
    return int((lat * 1000 + lon * 1000) * 12345)

def is_point_in_bbox(lat: float, lon: float, bbox: Tuple[float, float, float, float]) -> bool:
    """Check if point is within bounding box"""
    min_lon, min_lat, max_lon, max_lat = bbox
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat

def generate_segment_id(lat: float, lon: float) -> str:
    """Generate a unique segment ID from coordinates"""
    return f"seg_{int(lat * 10000)}_{int(lon * 10000)}"

def calculate_risk_for_location(
    lat: float, 
    lon: float, 
    vehicle_type: VehicleType,
    hour: int
) -> Tuple[int, str]:
    """Calculate risk score and top cause for a location"""
    seed = hash_coords(lat, lon)
    
    # Base risk from location
    base_risk = seeded_random(seed) * 100
    
    # Vehicle multipliers
    vehicle_multipliers = {
        "MOTORCYCLE": 1.3,
        "THREE_WHEELER": 1.15,
        "CAR": 1.0,
        "BUS": 0.85,
        "LORRY": 0.90,
    }
    vehicle_risk = base_risk * vehicle_multipliers.get(vehicle_type, 1.0)
    
    # Time-based multipliers (rush hours are more risky)
    time_multiplier = 1.0
    if hour in [7, 8, 9, 17, 18, 19]:  # Rush hours
        time_multiplier = 1.2
    elif hour in [0, 1, 2, 3, 4, 5]:  # Late night
        time_multiplier = 1.1
    
    final_risk = min(100, max(0, vehicle_risk * time_multiplier))
    
    # Determine top cause based on risk level and vehicle
    causes = {
        "high": [
            "Dangerous sharp curve with very poor visibility",
            "Steep descent with hairpin turn",
            "Narrow road with blind spots",
            "Wet road with poor drainage",
            "Heavy traffic during rush hour",
        ],
        "medium": [
            "Moderate traffic zone",
            "Uneven road surface",
            "Tight turn",
            "Medium traffic",
            "Narrow lane with limited visibility",
        ],
        "low": [
            "Well-maintained road section",
            "Safe residential area",
            "Wide road",
            "Good visibility",
        ]
    }
    
    if final_risk >= 70:
        cause_list = causes["high"]
    elif final_risk >= 40:
        cause_list = causes["medium"]
    else:
        cause_list = causes["low"]
    
    top_cause = cause_list[int(seeded_random(seed + 1) * len(cause_list))]
    
    # Add vehicle-specific context
    vehicle_context = {
        "MOTORCYCLE": " - high risk for motorcycles",
        "THREE_WHEELER": " - risky for three wheelers",
        "BUS": " - challenging for buses",
        "LORRY": " - difficult for lorries",
        "CAR": "",
    }
    
    if final_risk >= 60:
        top_cause += vehicle_context.get(vehicle_type, "")
    
    return int(final_risk), top_cause

def generate_risk_segments(
    bbox: Optional[Tuple[float, float, float, float]] = None,
    hour: Optional[int] = None,
    vehicle_type: Optional[VehicleType] = None,
) -> List[SegmentFeature]:
    """
    Generate risk segments for a given bounding box, hour, and vehicle type
    
    Args:
        bbox: (min_lon, min_lat, max_lon, max_lat)
        hour: Hour of day (0-23)
        vehicle_type: Type of vehicle
    
    Returns:
        List of segment features
    """
    # Default bounding box (Colombo area)
    if bbox is None:
        bbox = (80.43, 6.94, 80.55, 7.03)
    
    # Default hour (current hour)
    if hour is None:
        hour = datetime.now().hour
    
    # Default vehicle
    if vehicle_type is None:
        vehicle_type = "CAR"
    
    min_lon, min_lat, max_lon, max_lat = bbox
    
    # Generate a grid of segments
    segments = []
    
    # Calculate step size for approximately 20-30 segments
    lat_range = max_lat - min_lat
    lon_range = max_lon - min_lon
    
    # Create a reasonable grid
    num_points_lat = max(3, int(lat_range / 0.002))  # ~200m spacing
    num_points_lon = max(3, int(lon_range / 0.002))
    
    step_lat = lat_range / num_points_lat
    step_lon = lon_range / num_points_lon
    
    for i in range(num_points_lat):
        for j in range(num_points_lon):
            lat = min_lat + (i + 0.5) * step_lat
            lon = min_lon + (j + 0.5) * step_lon
            
            # Calculate risk for this location
            risk_score, top_cause = calculate_risk_for_location(lat, lon, vehicle_type, hour)
            
            # Create segment feature
            segment = SegmentFeature(
                type="Feature",
                geometry=SegmentGeometry(
                    type="Point",
                    coordinates=[lon, lat]
                ),
                properties=SegmentFeatureProperties(
                    segment_id=generate_segment_id(lat, lon),
                    risk_0_100=risk_score,
                    hour=hour,
                    vehicle=vehicle_type,
                    top_cause=top_cause
                )
            )
            
            segments.append(segment)
    
    return segments

def get_top_risk_spots(
    vehicle_type: Optional[VehicleType] = None,
    limit: int = 10,
    bbox: Optional[Tuple[float, float, float, float]] = None,
) -> List[TopSpot]:
    """
    Get top risk spots sorted by risk score
    
    Args:
        vehicle_type: Filter by vehicle type
        limit: Maximum number of spots to return
        bbox: Optional bounding box to restrict search area
    
    Returns:
        List of top risk spots
    """
    # Generate segments
    segments = generate_risk_segments(bbox=bbox, vehicle_type=vehicle_type)
    
    # Convert to TopSpot format
    spots = []
    for segment in segments:
        coords = segment.geometry.coordinates
        if isinstance(coords, list) and len(coords) == 2:
            lon, lat = coords[0], coords[1]
            spot = TopSpot(
                segment_id=segment.properties.segment_id,
                lat=lat,
                lon=lon,
                risk_0_100=segment.properties.risk_0_100,
                vehicle=segment.properties.vehicle,
                hour=segment.properties.hour,
                top_cause=segment.properties.top_cause
            )
            spots.append(spot)
    
    # Sort by risk descending
    spots.sort(key=lambda x: x.risk_0_100, reverse=True)
    
    return spots[:limit]
