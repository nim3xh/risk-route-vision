"""
Risk Prediction API - Comprehensive Testing Script
===================================================

This script tests the risk prediction API with various scenarios using both
LIVE data (from weather APIs) and MANUAL data (user-provided values).

Usage:
    python test_risk_predictions.py

Requirements:
    - Backend server running on http://localhost:8000
    - requests library: pip install requests
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Tuple

# Configuration
API_BASE = "http://localhost:8000"
SCORE_ENDPOINT = f"{API_BASE}/api/v1/risk/score"

# Test location in Ginigathena area
TEST_COORDS = [
    [6.8755, 80.7500],
    [6.8760, 80.7505],
    [6.8765, 80.7510],
    [6.8770, 80.7515]
]


def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def print_result(result: Dict, scenario: str):
    """Print prediction results in a formatted way"""
    print(f"\n📊 {scenario}")
    print("-" * 80)
    print(f"Overall Risk: {result['overall']:.2%} ({result['overall']*100:.0f}/100)")
    print(f"Risk Level: {'🔴 HIGH' if result['overall'] > 0.7 else '🟡 MEDIUM' if result['overall'] > 0.4 else '🟢 LOW'}")
    print(f"Top Cause: {result['segmentCauses'][0] if result.get('segmentCauses') else 'N/A'}")
    
    if 'explain' in result:
        print(f"\n📈 Risk Factors:")
        explain = result['explain']
        print(f"  - Curvature: {explain.get('curvature', 0):.3f}")
        print(f"  - Surface Wetness: {explain.get('surface_wetness_prob', 0):.3f}")
        print(f"  - Wind Speed: {explain.get('wind_speed', 0):.1f} km/h")
        print(f"  - Temperature: {explain.get('temperature', 0):.1f}°C")
        print(f"  - Vehicle Factor: {explain.get('vehicle_factor', 1):.2f}")
    
    if 'confidence' in result and result['confidence']:
        print(f"\n🎯 Model Confidence:")
        conf = result['confidence']
        print(f"  - Overall: {conf.get('confidence', 0):.1%}")
        print(f"  - Certainty Level: {conf.get('certainty', 0):.1f}")
        print(f"  - Consistency: {conf.get('consistency', 0):.1%}")
    
    if 'weather' in result and result['weather']:
        print(f"\n🌤️  Weather Used:")
        w = result['weather']
        print(f"  - Temperature: {w.get('temperature', 0):.1f}°C")
        print(f"  - Humidity: {w.get('humidity', 0):.0f}%")
        print(f"  - Precipitation: {w.get('precipitation', 0):.1f}mm")
        print(f"  - Wind: {w.get('wind_speed', 0):.1f} km/h")
        print(f"  - Road: {'💧 WET' if w.get('is_wet') == 1 else '☀️ DRY'}")
    
    print(f"\n✅ Analyzed {len(result.get('segmentScores', []))} segments")


def test_live_mode():
    """Test 1: LIVE MODE - Automatic weather fetching"""
    print_section("TEST 1: LIVE MODE - Automatic Weather")
    
    print("\n🔄 Fetching live weather and predicting risk...")
    print("📍 Using coordinates in Ginigathena area")
    print("🚗 Vehicle: CAR")
    
    request_data = {
        "vehicleType": "CAR",
        "coordinates": TEST_COORDS
    }
    
    print(f"\n📤 Request:")
    print(json.dumps(request_data, indent=2))
    
    try:
        response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
        response.raise_for_status()
        result = response.json()
        print_result(result, "Live Mode - Automatic Weather")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_manual_mode_clear_day():
    """Test 2: MANUAL MODE - Clear sunny day"""
    print_section("TEST 2: MANUAL MODE - Clear Sunny Day")
    
    print("\n☀️ Simulating clear, sunny conditions")
    print("🚗 Vehicle: CAR")
    print("🕐 Time: 2 PM (low traffic)")
    
    request_data = {
        "vehicleType": "CAR",
        "coordinates": TEST_COORDS,
        "hour": 14,
        "weather": {
            "temperature": 32.0,
            "humidity": 60.0,
            "precipitation": 0.0,
            "wind_speed": 8.0,
            "is_wet": 0
        }
    }
    
    print(f"\n📤 Request:")
    print(json.dumps(request_data, indent=2))
    
    try:
        response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
        response.raise_for_status()
        result = response.json()
        print_result(result, "Manual Mode - Clear Day")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_manual_mode_heavy_rain():
    """Test 3: MANUAL MODE - Heavy rain conditions"""
    print_section("TEST 3: MANUAL MODE - Heavy Rain")
    
    print("\n🌧️ Simulating heavy rain conditions")
    print("🏍️ Vehicle: MOTORCYCLE (high risk)")
    print("🕐 Time: 6 PM (rush hour)")
    
    request_data = {
        "vehicleType": "MOTORCYCLE",
        "coordinates": TEST_COORDS,
        "hour": 18,
        "weather": {
            "temperature": 26.0,
            "humidity": 95.0,
            "precipitation": 8.5,
            "wind_speed": 22.0,
            "is_wet": 1
        }
    }
    
    print(f"\n📤 Request:")
    print(json.dumps(request_data, indent=2))
    
    try:
        response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
        response.raise_for_status()
        result = response.json()
        print_result(result, "Manual Mode - Heavy Rain + Rush Hour")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_manual_mode_night_drive():
    """Test 4: MANUAL MODE - Night driving"""
    print_section("TEST 4: MANUAL MODE - Night Driving")
    
    print("\n🌙 Simulating night driving conditions")
    print("🚌 Vehicle: BUS")
    print("🕐 Time: 11 PM (fatigue hours)")
    
    request_data = {
        "vehicleType": "BUS",
        "coordinates": TEST_COORDS,
        "hour": 23,
        "weather": {
            "temperature": 24.0,
            "humidity": 75.0,
            "precipitation": 0.0,
            "wind_speed": 10.0,
            "is_wet": 0
        }
    }
    
    print(f"\n📤 Request:")
    print(json.dumps(request_data, indent=2))
    
    try:
        response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
        response.raise_for_status()
        result = response.json()
        print_result(result, "Manual Mode - Night Driving")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_manual_mode_morning_rush():
    """Test 5: MANUAL MODE - Morning rush hour"""
    print_section("TEST 5: MANUAL MODE - Morning Rush Hour")
    
    print("\n🌅 Simulating morning rush hour")
    print("🛺 Vehicle: THREE_WHEELER")
    print("🕐 Time: 8 AM (peak traffic)")
    
    request_data = {
        "vehicleType": "THREE_WHEELER",
        "coordinates": TEST_COORDS,
        "hour": 8,
        "weather": {
            "temperature": 27.0,
            "humidity": 80.0,
            "precipitation": 1.5,
            "wind_speed": 12.0,
            "is_wet": 1
        }
    }
    
    print(f"\n📤 Request:")
    print(json.dumps(request_data, indent=2))
    
    try:
        response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
        response.raise_for_status()
        result = response.json()
        print_result(result, "Manual Mode - Morning Rush + Light Rain")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_hybrid_mode():
    """Test 6: HYBRID MODE - Manual time + Live weather"""
    print_section("TEST 6: HYBRID MODE - Manual Time + Live Weather")
    
    print("\n🔀 Using live weather but manual time")
    print("🚛 Vehicle: LORRY")
    print("🕐 Time: 7 AM (rush hour)")
    print("🌐 Weather: LIVE from API")
    
    request_data = {
        "vehicleType": "LORRY",
        "coordinates": TEST_COORDS,
        "hour": 7,
        "timestampUtc": datetime.now().isoformat() + "Z"
    }
    
    print(f"\n📤 Request:")
    print(json.dumps(request_data, indent=2))
    
    try:
        response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
        response.raise_for_status()
        result = response.json()
        print_result(result, "Hybrid Mode - Manual Time + Live Weather")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_vehicle_comparison():
    """Test 7: Compare all vehicle types with same conditions"""
    print_section("TEST 7: VEHICLE TYPE COMPARISON")
    
    print("\n🚗 Comparing risk across all vehicle types")
    print("Conditions: Clear day, 2 PM, dry roads")
    
    vehicles = ["CAR", "MOTORCYCLE", "THREE_WHEELER", "BUS", "LORRY", "VAN"]
    results = {}
    
    base_request = {
        "coordinates": TEST_COORDS,
        "hour": 14,
        "weather": {
            "temperature": 30.0,
            "humidity": 65.0,
            "precipitation": 0.0,
            "wind_speed": 10.0,
            "is_wet": 0
        }
    }
    
    for vehicle in vehicles:
        request_data = {**base_request, "vehicleType": vehicle}
        
        try:
            response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
            response.raise_for_status()
            result = response.json()
            results[vehicle] = result['overall']
            print(f"\n{vehicle:15s}: {result['overall']:.2%} - {get_risk_emoji(result['overall'])}")
        except Exception as e:
            print(f"\n{vehicle:15s}: ❌ Error - {e}")
    
    if results:
        sorted_vehicles = sorted(results.items(), key=lambda x: x[1], reverse=True)
        print("\n🏆 Ranking (Highest to Lowest Risk):")
        for i, (vehicle, risk) in enumerate(sorted_vehicles, 1):
            print(f"  {i}. {vehicle:15s} - {risk:.2%}")
    
    return len(results) > 0


def get_risk_emoji(risk: float) -> str:
    """Get emoji based on risk level"""
    if risk > 0.7:
        return "🔴 HIGH"
    elif risk > 0.4:
        return "🟡 MEDIUM"
    else:
        return "🟢 LOW"


def test_time_of_day_comparison():
    """Test 8: Compare risk across different times of day"""
    print_section("TEST 8: TIME OF DAY COMPARISON")
    
    print("\n🕐 Comparing risk across different hours")
    print("Conditions: Car, clear day, dry roads")
    
    test_hours = [
        (7, "Morning Rush"),
        (10, "Mid Morning"),
        (14, "Afternoon"),
        (18, "Evening Rush"),
        (22, "Night")
    ]
    
    results = {}
    
    base_request = {
        "vehicleType": "CAR",
        "coordinates": TEST_COORDS,
        "weather": {
            "temperature": 28.0,
            "humidity": 70.0,
            "precipitation": 0.0,
            "wind_speed": 8.0,
            "is_wet": 0
        }
    }
    
    for hour, label in test_hours:
        request_data = {**base_request, "hour": hour}
        
        try:
            response = requests.post(SCORE_ENDPOINT, json=request_data, timeout=10)
            response.raise_for_status()
            result = response.json()
            results[label] = (hour, result['overall'])
            print(f"\n{label:15s} ({hour:02d}:00): {result['overall']:.2%} - {get_risk_emoji(result['overall'])}")
        except Exception as e:
            print(f"\n{label:15s} ({hour:02d}:00): ❌ Error - {e}")
    
    if results:
        sorted_times = sorted(results.items(), key=lambda x: x[1][1], reverse=True)
        print("\n🏆 Ranking (Highest to Lowest Risk):")
        for i, (label, (hour, risk)) in enumerate(sorted_times, 1):
            print(f"  {i}. {label:15s} ({hour:02d}:00) - {risk:.2%}")
    
    return len(results) > 0


def run_all_tests():
    """Run all test scenarios"""
    print("\n" + "🎯" * 40)
    print("RISK PREDICTION API - COMPREHENSIVE TEST SUITE")
    print("🎯" * 40)
    print(f"\nTesting against: {API_BASE}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check API health
    try:
        health_response = requests.get(f"{API_BASE}/health", timeout=5)
        health_response.raise_for_status()
        print("✅ Backend server is healthy")
    except Exception as e:
        print(f"❌ Backend server health check failed: {e}")
        print("⚠️  Please ensure the backend server is running on http://localhost:8000")
        return
    
    # Run all tests
    tests = [
        ("LIVE MODE", test_live_mode),
        ("MANUAL - Clear Day", test_manual_mode_clear_day),
        ("MANUAL - Heavy Rain", test_manual_mode_heavy_rain),
        ("MANUAL - Night Drive", test_manual_mode_night_drive),
        ("MANUAL - Morning Rush", test_manual_mode_morning_rush),
        ("HYBRID MODE", test_hybrid_mode),
        ("Vehicle Comparison", test_vehicle_comparison),
        ("Time Comparison", test_time_of_day_comparison)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            success = test_func()
            results[test_name] = "✅ PASS" if success else "❌ FAIL"
        except Exception as e:
            results[test_name] = f"❌ FAIL - {e}"
    
    # Summary
    print_section("TEST SUMMARY")
    print("\n")
    for test_name, result in results.items():
        print(f"{test_name:25s}: {result}")
    
    passed = sum(1 for r in results.values() if "✅" in r)
    total = len(results)
    print(f"\n{'='*80}")
    print(f"Total: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    run_all_tests()
