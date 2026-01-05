"""
Geographical utility functions for coordinate validation and filtering.
"""
from typing import List, Tuple

# Ginigathena bounding box coordinates (approximate)
# These define the service area for risk analysis
GINIGATHENA_BOUNDS = {
    "min_lat": 7.0,    # Southern boundary
    "max_lat": 7.5,    # Northern boundary
    "min_lon": 80.4,   # Western boundary
    "max_lon": 80.9    # Eastern boundary
}


def is_within_ginigathena(lat: float, lon: float) -> bool:
    """
    Check if a single coordinate point is within the Ginigathena service area.
    
    Args:
        lat: Latitude coordinate
        lon: Longitude coordinate
        
    Returns:
        bool: True if the coordinate is within Ginigathena bounds
    """
    return (
        GINIGATHENA_BOUNDS["min_lat"] <= lat <= GINIGATHENA_BOUNDS["max_lat"] and
        GINIGATHENA_BOUNDS["min_lon"] <= lon <= GINIGATHENA_BOUNDS["max_lon"]
    )


def filter_coordinates_in_ginigathena(coordinates: List[List[float]]) -> List[List[float]]:
    """
    Filter a list of coordinates to only include those within Ginigathena area.
    
    Args:
        coordinates: List of [lat, lon] coordinate pairs
        
    Returns:
        List of coordinate pairs that fall within Ginigathena bounds
    """
    return [
        coord for coord in coordinates
        if is_within_ginigathena(coord[0], coord[1])
    ]


def route_intersects_ginigathena(coordinates: List[List[float]]) -> bool:
    """
    Check if a route (list of coordinates) intersects with the Ginigathena area.
    
    Args:
        coordinates: List of [lat, lon] coordinate pairs representing a route
        
    Returns:
        bool: True if any coordinate in the route falls within Ginigathena bounds
    """
    return any(is_within_ginigathena(coord[0], coord[1]) for coord in coordinates)
