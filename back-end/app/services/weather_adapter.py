import httpx
from typing import List, Tuple, Dict
from ..core.config import settings
Coord = Tuple[float, float]

async def snapshot_for_polyline(coords: List[Coord], _ts_utc: str | None) -> Dict:
    """
    Fetch LIVE weather data for a polyline from Open-Meteo API.
    Uses the midpoint of the route to get representative weather conditions.
    
    Returns:
        Dict with keys: temp, precip, wind, is_rain (LIVE data from API)
    """
    mid = coords[len(coords)//2]
    lat, lon = mid
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m",
    }
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.get(settings.openmeteo_base, params=params)
        r.raise_for_status()
        data = r.json()
    cur = data.get("current", {})
    
    # Return standardized weather dict with LIVE data
    return {
        "temperature": cur.get("temperature_2m", 20.0),
        "humidity": cur.get("relative_humidity_2m", 60.0),
        "precipitation": cur.get("precipitation", 0.0),
        "wind_speed": cur.get("wind_speed_10m", 0.0),
        "is_rain": (cur.get("precipitation", 0) or 0) > 0.1
    }
