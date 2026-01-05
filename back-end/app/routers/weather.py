from fastapi import APIRouter, HTTPException, Query
import httpx
from ..core.config import settings
from datetime import datetime

router = APIRouter(prefix="/api/v1/weather", tags=["weather"])


def get_weather_from_code(code: int) -> dict:
    """
    Convert WMO Weather Code to weather description and icon.
    Based on: https://open-meteo.com/en/docs
    """
    weather_codes = {
        0: {"main": "Clear", "description": "clear sky", "icon": "01d"},
        1: {"main": "Clear", "description": "mainly clear", "icon": "01d"},
        2: {"main": "Clouds", "description": "partly cloudy", "icon": "02d"},
        3: {"main": "Clouds", "description": "overcast", "icon": "03d"},
        45: {"main": "Fog", "description": "fog", "icon": "50d"},
        48: {"main": "Fog", "description": "depositing rime fog", "icon": "50d"},
        51: {"main": "Drizzle", "description": "light drizzle", "icon": "09d"},
        53: {"main": "Drizzle", "description": "moderate drizzle", "icon": "09d"},
        55: {"main": "Drizzle", "description": "dense drizzle", "icon": "09d"},
        56: {"main": "Drizzle", "description": "light freezing drizzle", "icon": "09d"},
        57: {"main": "Drizzle", "description": "dense freezing drizzle", "icon": "09d"},
        61: {"main": "Rain", "description": "slight rain", "icon": "10d"},
        63: {"main": "Rain", "description": "moderate rain", "icon": "10d"},
        65: {"main": "Rain", "description": "heavy rain", "icon": "10d"},
        66: {"main": "Rain", "description": "light freezing rain", "icon": "13d"},
        67: {"main": "Rain", "description": "heavy freezing rain", "icon": "13d"},
        71: {"main": "Snow", "description": "slight snow fall", "icon": "13d"},
        73: {"main": "Snow", "description": "moderate snow fall", "icon": "13d"},
        75: {"main": "Snow", "description": "heavy snow fall", "icon": "13d"},
        77: {"main": "Snow", "description": "snow grains", "icon": "13d"},
        80: {"main": "Rain", "description": "slight rain showers", "icon": "09d"},
        81: {"main": "Rain", "description": "moderate rain showers", "icon": "09d"},
        82: {"main": "Rain", "description": "violent rain showers", "icon": "09d"},
        85: {"main": "Snow", "description": "slight snow showers", "icon": "13d"},
        86: {"main": "Snow", "description": "heavy snow showers", "icon": "13d"},
        95: {"main": "Thunderstorm", "description": "thunderstorm", "icon": "11d"},
        96: {"main": "Thunderstorm", "description": "thunderstorm with slight hail", "icon": "11d"},
        99: {"main": "Thunderstorm", "description": "thunderstorm with heavy hail", "icon": "11d"},
    }
    
    return weather_codes.get(code, {"main": "Unknown", "description": "unknown conditions", "icon": "01d"})


@router.get("")
async def get_weather(
    lat: float = Query(...),
    lon: float = Query(...),
    provider: str = Query("openweather", description="Weather provider: openweather or openmeteo")
):
    """
    Fetch current live weather for a specific location.
    Supports OpenWeatherMap (comprehensive) or Open-Meteo (fallback).
    """
    if provider == "openweather" and settings.openweather_api_key:
        return await get_openweather_data(lat, lon)
    else:
        return await get_openmeteo_data(lat, lon)

async def get_openweather_data(lat: float, lon: float):
    """
    Fetch comprehensive weather data from OpenWeatherMap API
    """
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.openweather_api_key,
        "units": "metric"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{settings.openweather_base}/weather", params=params)
            r.raise_for_status()
            data = r.json()
        
        main = data.get("main", {})
        wind = data.get("wind", {})
        clouds = data.get("clouds", {})
        weather = data.get("weather", [{}])[0]
        sys = data.get("sys", {})
        
        # Calculate precipitation from rain and snow
        rain = data.get("rain", {}).get("1h", 0) or 0
        snow = data.get("snow", {}).get("1h", 0) or 0
        total_precip = rain + snow
        
        return {
            "temperature_c": round(main.get("temp", 0), 1),
            "feels_like_c": round(main.get("feels_like", 0), 1),
            "humidity_pct": main.get("humidity", 0),
            "pressure_hpa": main.get("pressure", 0),
            "precip_mm": round(total_precip, 2),
            "wind_kmh": round(wind.get("speed", 0) * 3.6, 1),  # Convert m/s to km/h
            "wind_deg": wind.get("deg", 0),
            "wind_gust_kmh": round(wind.get("gust", 0) * 3.6, 1) if wind.get("gust") else None,
            "clouds_pct": clouds.get("all", 0),
            "visibility_m": data.get("visibility", 10000),
            "weather_main": weather.get("main", "Clear"),
            "weather_description": weather.get("description", ""),
            "weather_icon": weather.get("icon", "01d"),
            "sunrise": sys.get("sunrise"),
            "sunset": sys.get("sunset"),
            "location_name": data.get("name", ""),
            "country": sys.get("country", ""),
            "is_wet": 1 if total_precip > 0.1 or weather.get("main") in ["Rain", "Drizzle", "Thunderstorm", "Snow"] else 0,
            "provider": "openweather",
            "timestamp": datetime.utcnow().isoformat()
        }
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(401, "Invalid OpenWeatherMap API key. Check your .env configuration.")
        raise HTTPException(500, f"OpenWeatherMap API error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Weather service error: {str(e)}")

async def get_openmeteo_data(lat: float, lon: float):
    """
    Fetch basic weather data from Open-Meteo (free, no API key required)
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code",
    }
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(settings.openmeteo_base, params=params)
            r.raise_for_status()
            data = r.json()
        
        cur = data.get("current", {})
        precip = cur.get("precipitation", 0) or 0
        weather_code = cur.get("weather_code", 0)
        
        # Convert WMO weather code to description
        weather_info = get_weather_from_code(weather_code)
        
        return {
            "temperature_c": cur.get("temperature_2m"),
            "humidity_pct": cur.get("relative_humidity_2m"),
            "precip_mm": precip,
            "wind_kmh": cur.get("wind_speed_10m"),
            "wind_deg": cur.get("wind_direction_10m"),
            "clouds_pct": cur.get("cloud_cover"),
            "weather_code": weather_code,
            "weather_main": weather_info["main"],
            "weather_description": weather_info["description"],
            "weather_icon": weather_info["icon"],
            "is_wet": 1 if precip > 0.1 else 0,
            "provider": "openmeteo",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(500, f"Weather service error: {str(e)}")
