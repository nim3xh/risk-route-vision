"""
Test script for enhanced risk calculation with detailed segment analysis.
Tests that all model outputs are properly returned for each segment.
"""
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1/risk"

# Test route coordinates (within Ginigathena area)
TEST_COORDINATES = [
    [6.93, 80.45],
    [6.935, 80.455],
    [6.94, 80.46],
    [6.945, 80.465],
    [6.95, 80.47]
]

def test_enhanced_score_endpoint():
    """Test the enhanced /score endpoint with detailed segment information"""
    print("\n" + "="*80)
    print("TEST 1: Enhanced Risk Score Endpoint")
    print("="*80)
    
    payload = {
        "vehicleType": "CAR",
        "coordinates": TEST_COORDINATES,
        "hour": 17  # Rush hour
    }
    
    response = requests.post(f"{API_URL}/score", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        print("\n✅ Request successful!")
        print(f"\nOverall Risk: {data['overall']:.3f} ({data.get('overall_0_100', 0)}%)")
        
        # Check for new fields
        if "segments" in data:
            print(f"\n📊 Detailed Segments: {len(data['segments'])} segments")
            print("\nFirst 3 segments details:")
            for i, segment in enumerate(data['segments'][:3]):
                print(f"\n  Segment {segment['index']}:")
                print(f"    Coordinate: {segment['coordinate']}")
                print(f"    Risk: {segment['risk_score']:.3f} ({segment['risk_0_100']}%)")
                print(f"    Cause: {segment['cause'][:50]}...")
                print(f"    Incident Rate: {segment['incident_rate']:.4f}")
                print(f"    Curvature: {segment['curvature']:.3f}")
                print(f"    Surface Wetness: {segment['surface_wetness_prob']:.2f}")
                print(f"    Temperature: {segment['temperature']:.1f}°C")
                print(f"    Wind Speed: {segment['wind_speed']:.1f} km/h")
                print(f"    High Risk: {'⚠️ YES' if segment['is_high_risk'] else '✅ NO'}")
        else:
            print("\n⚠️ Warning: 'segments' field not found in response")
        
        # Check route statistics
        if "route_statistics" in data:
            stats = data["route_statistics"]
            print(f"\n📈 Route Statistics:")
            print(f"    Total Segments: {stats['total_segments']}")
            print(f"    High-Risk Segments: {stats['high_risk_segments']} ({stats['high_risk_percentage']:.1f}%)")
            print(f"    Max Risk: {stats['max_risk']:.3f}")
            print(f"    Min Risk: {stats['min_risk']:.3f}")
            print(f"    Avg Curvature: {stats['avg_curvature']:.3f}")
            print(f"    Avg Incident Rate: {stats['avg_incident_rate']:.4f}")
        else:
            print("\n⚠️ Warning: 'route_statistics' field not found in response")
        
        # Check backward compatibility
        print(f"\n🔄 Backward Compatibility Check:")
        print(f"    segmentScores: {'✅' if 'segmentScores' in data else '❌'} ({len(data.get('segmentScores', []))} items)")
        print(f"    segmentCoordinates: {'✅' if 'segmentCoordinates' in data else '❌'} ({len(data.get('segmentCoordinates', []))} items)")
        print(f"    segmentCauses: {'✅' if 'segmentCauses' in data else '❌'} ({len(data.get('segmentCauses', []))} items)")
        print(f"    rateScores: {'✅' if 'rateScores' in data else '❌'} ({len(data.get('rateScores', []))} items)")
        print(f"    explain: {'✅' if 'explain' in data else '❌'}")
        print(f"    confidence: {'✅' if 'confidence' in data else '❌'}")
        print(f"    weather: {'✅' if 'weather' in data else '❌'}")
        
        return True
    else:
        print(f"\n❌ Request failed with status {response.status_code}")
        print(f"Error: {response.text}")
        return False


def test_vehicle_comparison():
    """Test risk calculation for different vehicle types"""
    print("\n" + "="*80)
    print("TEST 2: Vehicle Type Comparison")
    print("="*80)
    
    vehicles = ["MOTORCYCLE", "CAR", "BUS"]
    results = {}
    
    for vehicle in vehicles:
        payload = {
            "vehicleType": vehicle,
            "coordinates": TEST_COORDINATES,
            "hour": 17
        }
        
        response = requests.post(f"{API_URL}/score", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            results[vehicle] = {
                "overall_risk": data.get("overall_0_100", 0),
                "high_risk_segments": data.get("route_statistics", {}).get("high_risk_segments", 0),
                "total_segments": data.get("route_statistics", {}).get("total_segments", 0)
            }
    
    print("\nVehicle Risk Comparison:")
    for vehicle, result in results.items():
        print(f"\n  {vehicle}:")
        print(f"    Overall Risk: {result['overall_risk']}%")
        print(f"    High-Risk Segments: {result['high_risk_segments']}/{result['total_segments']}")


def test_manual_weather():
    """Test with manual weather data"""
    print("\n" + "="*80)
    print("TEST 3: Manual Weather Data")
    print("="*80)
    
    # Test with rainy conditions
    payload = {
        "vehicleType": "CAR",
        "coordinates": TEST_COORDINATES,
        "hour": 17,
        "weather": {
            "temperature": 25.0,
            "humidity": 90.0,
            "precipitation": 5.0,
            "wind_speed": 20.0,
            "is_wet": 1
        }
    }
    
    response = requests.post(f"{API_URL}/score", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print("\n✅ Rainy conditions test successful!")
        print(f"    Overall Risk: {data.get('overall_0_100', 0)}%")
        print(f"    High-Risk Segments: {data.get('route_statistics', {}).get('high_risk_segments', 0)}")
        
        # Check if weather data is reflected in segments
        if "segments" in data and len(data["segments"]) > 0:
            first_seg = data["segments"][0]
            print(f"\n    Segment Weather Data:")
            print(f"      Temperature: {first_seg['temperature']}°C")
            print(f"      Wind Speed: {first_seg['wind_speed']} km/h")
            print(f"      Surface Wetness: {first_seg['surface_wetness_prob']:.2f}")
    else:
        print(f"\n❌ Request failed: {response.text}")


def test_high_risk_identification():
    """Test identification of high-risk segments"""
    print("\n" + "="*80)
    print("TEST 4: High-Risk Segment Identification")
    print("="*80)
    
    payload = {
        "vehicleType": "MOTORCYCLE",  # Higher risk vehicle
        "coordinates": TEST_COORDINATES,
        "hour": 19,  # Night time
        "weather": {
            "precipitation": 3.0,
            "is_wet": 1
        }
    }
    
    response = requests.post(f"{API_URL}/score", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        if "segments" in data:
            high_risk_segments = [s for s in data["segments"] if s["is_high_risk"]]
            
            print(f"\n✅ Found {len(high_risk_segments)} high-risk segments:")
            
            for seg in high_risk_segments[:3]:  # Show first 3
                print(f"\n  Segment {seg['index']} at {seg['coordinate']}:")
                print(f"    Risk: {seg['risk_0_100']}%")
                print(f"    Cause: {seg['cause'][:60]}...")
                print(f"    Curvature: {seg['curvature']:.3f}")


def test_all_model_outputs():
    """Verify all model outputs are present in segments"""
    print("\n" + "="*80)
    print("TEST 5: All Model Outputs Present")
    print("="*80)
    
    payload = {
        "vehicleType": "CAR",
        "coordinates": TEST_COORDINATES
    }
    
    response = requests.post(f"{API_URL}/score", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        
        required_fields = [
            "index", "coordinate", "risk_score", "risk_0_100",
            "cause", "incident_rate", "curvature", "surface_wetness_prob",
            "temperature", "wind_speed", "humidity", "precipitation",
            "vehicle_factor", "is_high_risk"
        ]
        
        if "segments" in data and len(data["segments"]) > 0:
            segment = data["segments"][0]
            print("\n✅ Checking all required fields in segment:")
            
            for field in required_fields:
                present = field in segment
                print(f"    {field}: {'✅' if present else '❌'}")
                
            print("\n📊 Sample segment data:")
            print(json.dumps(segment, indent=2))
        else:
            print("\n❌ No segments found in response")


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("ENHANCED RISK CALCULATION TEST SUITE")
    print("="*80)
    print(f"\nTesting API at: {API_URL}")
    print(f"Test route: {len(TEST_COORDINATES)} coordinates")
    
    # Check if server is running
    try:
        health_response = requests.get(f"{BASE_URL}/health")
        if health_response.status_code == 200:
            print("✅ Server is running")
        else:
            print("⚠️ Server responded but health check failed")
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("\nPlease start the backend server first:")
        print("  cd back-end")
        print("  python -m app.main")
        return
    
    # Run tests
    tests = [
        test_enhanced_score_endpoint,
        test_vehicle_comparison,
        test_manual_weather,
        test_high_risk_identification,
        test_all_model_outputs
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n❌ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            results.append(False)
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"\nPassed: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")


if __name__ == "__main__":
    main()
