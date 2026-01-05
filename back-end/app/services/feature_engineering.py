from typing import List, Tuple, Dict
from .geometry import curvature_estimate, per_point_curvature
Coord = Tuple[float, float]

def build_features(coords: List[Coord], weather: Dict, vehicle: str) -> Dict:
    """
    Build features for risk prediction compatible with XGBoost model.
    Includes weather data, curvature, and vehicle type.
    """
    # Calculate curvature for each coordinate in the polyline
    curvatures = per_point_curvature(coords)
    
    # Weather features (match training data format)
    is_rain = weather.get("is_rain", False)
    wet = 1.0 if is_rain else 0.0
    temp = float(weather.get("temp", weather.get("temperature", 20.0)))
    wind = float(weather.get("wind", weather.get("wind_speed", 0.0)))
    humidity = float(weather.get("humidity", 60.0))
    precipitation = float(weather.get("precipitation", 1.0 if is_rain else 0.0))
    
    # Vehicle-specific factors (for backward compatibility with old endpoints)
    vehicle_factor = {
        "MOTORCYCLE": 1.2, "THREE_WHEELER": 1.15, "CAR": 1.0,
        "BUS": 1.1, "LORRY": 1.15
    }.get(vehicle, 1.0)
    
    return {
        # Core features for XGBoost model
        "curvature": curvatures,
        "temperature": temp,
        "humidity": humidity,
        "precipitation": precipitation,
        "wind_speed": wind,
        "is_wet": 1 if wet > 0 else 0,
        "vehicle_type": vehicle,
        
        # Legacy features for old prediction method
        "surface_wetness_prob": wet,
        "vehicle_factor": vehicle_factor
    }
