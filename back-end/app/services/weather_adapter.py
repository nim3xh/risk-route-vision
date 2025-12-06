import httpx
from typing import List, Tuple, Dict
from ..core.config import settings
Coord = Tuple[float, float]

async def snapshot_for_polyline(coords: List[Coord], _ts_utc: str | None) -> Dict:
    mid = coords[len(coords)//2]
    lat, lon = mid
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,precipitation,wind_speed_10m",
    }
    async with httpx.AsyncClient(timeout=5) as client:
        r = await client.get(settings.openmeteo_base, params=params)
        r.raise_for_status()
        data = r.json()
    cur = data.get("current", {})
    return {
        "temp": cur.get("temperature_2m"),
        "precip": cur.get("precipitation"),
        "wind": cur.get("wind_speed_10m"),
        "is_rain": (cur.get("precipitation", 0) or 0) > 0.1
    }
