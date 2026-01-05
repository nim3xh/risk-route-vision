"""
Weather Integration Test Suite

Tests the weather API endpoints and ensures proper fallback behavior.
"""

import httpx
import asyncio
from datetime import datetime

BASE_URL = "http://localhost:8080/api/v1"

# Test location: Colombo, Sri Lanka
TEST_LAT = 6.9271
TEST_LON = 79.8612


async def test_weather_openweather():
    """Test OpenWeatherMap provider"""
    print("\n🌤️  Testing OpenWeatherMap API...")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BASE_URL}/weather",
                params={
                    "lat": TEST_LAT,
                    "lon": TEST_LON,
                    "provider": "openweather"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ OpenWeatherMap API working!")
                print(f"\n📍 Location: {data.get('location_name', 'Unknown')}, {data.get('country', '')}")
                print(f"🌡️  Temperature: {data.get('temperature_c')}°C (feels like {data.get('feels_like_c')}°C)")
                print(f"💧 Humidity: {data.get('humidity_pct')}%")
                print(f"💨 Wind: {data.get('wind_kmh')} km/h")
                print(f"☁️  Clouds: {data.get('clouds_pct')}%")
                print(f"👁️  Visibility: {data.get('visibility_m')}m")
                print(f"🌧️  Precipitation: {data.get('precip_mm')}mm")
                print(f"🌈 Conditions: {data.get('weather_main')} - {data.get('weather_description')}")
                print(f"💦 Wet Roads: {'Yes ⚠️' if data.get('is_wet') == 1 else 'No ✅'}")
                print(f"🕐 Provider: {data.get('provider')}")
                
                if data.get('sunrise'):
                    sunrise = datetime.fromtimestamp(data['sunrise']).strftime('%H:%M')
                    print(f"🌅 Sunrise: {sunrise}")
                if data.get('sunset'):
                    sunset = datetime.fromtimestamp(data['sunset']).strftime('%H:%M')
                    print(f"🌇 Sunset: {sunset}")
                
                return True
            elif response.status_code == 401:
                print("❌ OpenWeatherMap API key invalid or missing")
                print("💡 Add OPENWEATHER_API_KEY to back-end/.env")
                return False
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except httpx.RequestError as e:
            print(f"❌ Request failed: {e}")
            return False


async def test_weather_openmeteo():
    """Test Open-Meteo provider (fallback)"""
    print("\n🌥️  Testing Open-Meteo API (Fallback)...")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BASE_URL}/weather",
                params={
                    "lat": TEST_LAT,
                    "lon": TEST_LON,
                    "provider": "openmeteo"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Open-Meteo API working!")
                print(f"\n🌡️  Temperature: {data.get('temperature_c')}°C")
                print(f"💧 Humidity: {data.get('humidity_pct')}%")
                print(f"💨 Wind: {data.get('wind_kmh')} km/h at {data.get('wind_deg')}°")
                print(f"☁️  Clouds: {data.get('clouds_pct')}%")
                print(f"🌧️  Precipitation: {data.get('precip_mm')}mm")
                print(f"💦 Wet Roads: {'Yes ⚠️' if data.get('is_wet') == 1 else 'No ✅'}")
                print(f"🕐 Provider: {data.get('provider')}")
                return True
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except httpx.RequestError as e:
            print(f"❌ Request failed: {e}")
            return False


async def test_weather_default():
    """Test default weather endpoint (auto provider selection)"""
    print("\n🌦️  Testing Default Weather Endpoint...")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{BASE_URL}/weather",
                params={
                    "lat": TEST_LAT,
                    "lon": TEST_LON
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                provider = data.get('provider', 'unknown')
                print(f"✅ Default endpoint working! (Using: {provider})")
                print(f"\n🌡️  Temperature: {data.get('temperature_c')}°C")
                print(f"💦 Wet Roads: {'Yes ⚠️' if data.get('is_wet') == 1 else 'No ✅'}")
                return True
            else:
                print(f"❌ Error: {response.status_code}")
                return False
                
        except httpx.RequestError as e:
            print(f"❌ Request failed: {e}")
            return False


async def test_backend_health():
    """Test if backend is running"""
    print("\n🏥 Testing Backend Health...")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/models/health", timeout=5.0)
            if response.status_code == 200:
                print("✅ Backend is running!")
                return True
            else:
                print(f"⚠️  Backend returned {response.status_code}")
                return False
        except httpx.RequestError:
            print("❌ Backend is not running!")
            print("💡 Start backend: cd back-end && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080")
            return False


async def main():
    """Run all tests"""
    print("\n" + "=" * 50)
    print("🌤️  WEATHER INTEGRATION TEST SUITE")
    print("=" * 50)
    
    # Test backend first
    backend_ok = await test_backend_health()
    if not backend_ok:
        print("\n❌ Cannot proceed - Backend is not running!")
        return
    
    # Test weather endpoints
    openweather_ok = await test_weather_openweather()
    openmeteo_ok = await test_weather_openmeteo()
    default_ok = await test_weather_default()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Backend Health:    {'✅ PASS' if backend_ok else '❌ FAIL'}")
    print(f"OpenWeatherMap:    {'✅ PASS' if openweather_ok else '❌ FAIL (needs API key)'}")
    print(f"Open-Meteo:        {'✅ PASS' if openmeteo_ok else '❌ FAIL'}")
    print(f"Default Endpoint:  {'✅ PASS' if default_ok else '❌ FAIL'}")
    print("=" * 50)
    
    if openweather_ok:
        print("\n🎉 Weather integration is fully functional!")
        print("✅ OpenWeatherMap API is configured correctly")
        print("✅ All weather data is available")
    elif openmeteo_ok:
        print("\n⚠️  Weather integration is working with fallback")
        print("💡 Add OpenWeatherMap API key for full features:")
        print("   1. Get free key: https://openweathermap.org/api")
        print("   2. Add to back-end/.env: OPENWEATHER_API_KEY=your_key")
        print("   3. Restart backend server")
    else:
        print("\n❌ Weather integration needs attention")
        print("Check backend logs for errors")
    
    print("\n🌐 Frontend: http://localhost:5173/dashboard")
    print("📚 API Docs: http://localhost:8080/docs")
    print("📖 Guide: WEATHER_INTEGRATION_GUIDE.md")
    print()


if __name__ == "__main__":
    asyncio.run(main())
