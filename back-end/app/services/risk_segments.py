"""
Service for generating and managing risk segments
"""
from typing import List, Tuple, Optional
import math
from datetime import datetime
from ..schemas.risk import SegmentFeature, SegmentGeometry, SegmentFeatureProperties, TopSpot
from ..schemas.common import VehicleType
from .geo_utils import is_within_ginigathena

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
    """Generate a unique segment ID from coordinates rounded to 3 decimal places"""
    lat_rounded = round(lat, 3)
    lon_rounded = round(lon, 3)
    # Format as seg_LAT_LON (e.g., seg_6.941_80.455)
    return f"seg_{lat_rounded:.3f}_{lon_rounded:.3f}"

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
    
    # Vehicle multipliers (per thesis Section 4.10.4)
    vehicle_multipliers = {
        "MOTORCYCLE": 1.2,      # Higher risk for motorcycles
        "THREE_WHEELER": 1.1,   # Risky for three-wheelers
        "CAR": 1.0,             # Baseline
        "BUS": 0.85,            # Lower risk (professional drivers)
        "LORRY": 0.90,          # Moderate risk
        "VAN": 1.0,             # Same as car
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
    weather_input: Optional[dict] = None
) -> List[SegmentFeature]:
    """
    Generate risk segments as rectangular grid cells (Polygons) for area-based risk visualization.
    Creates a grid of risk zones where each cell represents the risk level of that area.
    """
    from ..ml.model import predict_with_cause
    
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
    
    # Generate grid cells for area coverage
    lat_range = max_lat - min_lat
    lon_range = max_lon - min_lon
    
    # Larger cell size for faster processing (~400-500 meters)
    cell_size = 0.004  # ~440 meters - reduces number of cells significantly
    
    num_cells_lat = max(3, int(lat_range / cell_size))
    num_cells_lon = max(3, int(lon_range / cell_size))
    
    # Limit to prevent overload (max 12x12 = 144 cells for fast response)
    num_cells_lat = min(num_cells_lat, 12)
    num_cells_lon = min(num_cells_lon, 12)
    
    step_lat = lat_range / num_cells_lat
    step_lon = lon_range / num_cells_lon
    
    # Prepare weather
    weather_defaults = {
        "temperature": 30.0,
        "humidity": 75.0,
        "precipitation": 0.0,
        "wind_speed": 10.0,
        "curvature": 0.0
    }
    
    if weather_input:
        for k, v in weather_input.items():
            if v is not None:
                weather_defaults[k] = v
        
        weather_defaults["is_rain"] = (weather_defaults.get("precipitation", 0.0) > 0.1) or (weather_defaults.get("is_wet") == 1)
    
    segments = []
    
    # Generate rectangular grid cells - each calculated independently
    for i in range(num_cells_lat):
        for j in range(num_cells_lon):
            # Calculate cell boundaries
            cell_min_lat = round(min_lat + i * step_lat, 4)
            cell_max_lat = round(min_lat + (i + 1) * step_lat, 4)
            cell_min_lon = round(min_lon + j * step_lon, 4)
            cell_max_lon = round(min_lon + (j + 1) * step_lon, 4)
            
            # Center point for risk calculation
            center_lat = (cell_min_lat + cell_max_lat) / 2
            center_lon = (cell_min_lon + cell_max_lon) / 2
            
            # FILTER: Only process cells within Ginigathhena area
            if not is_within_ginigathena(center_lat, center_lon):
                continue
            
            # Calculate risk for THIS CELL ONLY - independent calculation
            try:
                # Create a single-point route for this specific cell
                cell_coords = [(center_lat, center_lon)]
                
                # Generate unique curvature for this cell based on location
                seed_base = hash_coords(center_lat, center_lon)
                cell_curvature = seeded_random(seed_base) * 0.25
                
                # Create a copy of weather for this cell
                cell_weather = weather_defaults.copy()
                cell_weather["curvature"] = [cell_curvature]
                
                # Independent prediction for this cell only
                scores_0_1, causes, rates = predict_with_cause(
                    coords=cell_coords,
                    weather=cell_weather,
                    vehicle_type=vehicle_type,
                    timestamp=None,
                    hour=hour
                )
                
                # Use the single prediction result
                cell_risk = int(scores_0_1[0] * 100)
                cell_cause = causes[0]
                cell_rate = float(rates[0])
                
                # Create Polygon geometry (rectangle)
                # GeoJSON polygon: array of linear rings, first is exterior
                polygon_coords = [[
                    [cell_min_lon, cell_min_lat],
                    [cell_max_lon, cell_min_lat],
                    [cell_max_lon, cell_max_lat],
                    [cell_min_lon, cell_max_lat],
                    [cell_min_lon, cell_min_lat]  # Close the ring
                ]]
                
                segment_id = generate_segment_id(center_lat, center_lon)
                
                segments.append(SegmentFeature(
                    type="Feature",
                    geometry=SegmentGeometry(
                        type="Polygon",
                        coordinates=polygon_coords
                    ),
                    properties=SegmentFeatureProperties(
                        segment_id=segment_id,
                        risk_0_100=cell_risk,
                        rate_pred=cell_rate,
                        hour=hour,
                        vehicle=vehicle_type,
                        top_cause=cell_cause
                    )
                ))
            except Exception as e:
                print(f"Error generating cell at ({center_lat}, {center_lon}): {e}")
                continue
    
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
        
        # Handle Point, LineString, and Polygon geometries
        if segment.geometry.type == "Point":
            if isinstance(coords, list) and len(coords) == 2:
                lon, lat = coords[0], coords[1]
            else:
                continue
        elif segment.geometry.type == "LineString":
            # Get middle point of LineString
            if isinstance(coords, list) and len(coords) > 0:
                mid_idx = len(coords) // 2
                lon, lat = coords[mid_idx][0], coords[mid_idx][1]
            else:
                continue
        elif segment.geometry.type == "Polygon":
            # Get center of polygon (average of exterior ring points)
            if isinstance(coords, list) and len(coords) > 0 and len(coords[0]) > 0:
                ring = coords[0]  # Exterior ring
                lon = sum(p[0] for p in ring[:-1]) / (len(ring) - 1)
                lat = sum(p[1] for p in ring[:-1]) / (len(ring) - 1)
            else:
                continue
        else:
            continue
        
        spot = TopSpot(
            segment_id=segment.properties.segment_id,
            lat=lat,
            lon=lon,
            risk_0_100=segment.properties.risk_0_100,
            rate_pred=segment.properties.rate_pred,
            vehicle=segment.properties.vehicle,
            hour=segment.properties.hour,
            top_cause=segment.properties.top_cause
        )
        spots.append(spot)
    
    # Sort by risk descending
    spots.sort(key=lambda x: x.risk_0_100, reverse=True)
    
    return spots[:limit]
