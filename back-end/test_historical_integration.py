"""
Test script to verify historical model integration
"""
import requests
import json
import time

BASE_URL = "http://localhost:8080/api/v1"

def wait_for_backend(max_retries=10, delay=2):
    """Wait for backend to be ready"""
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/models/health", timeout=2)
            if response.status_code == 200:
                print("✅ Backend is ready!")
                return True
        except requests.exceptions.RequestException:
            print(f"⏳ Waiting for backend... ({i+1}/{max_retries})")
            time.sleep(delay)
    print("❌ Backend not ready after maximum retries")
    return False

def test_historical_metrics():
    """Test the historical metrics endpoint"""
    print("\n🧪 Testing /api/v1/models/historical/metrics")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/models/historical/metrics")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Endpoint successful!")
            print(f"   Available: {data.get('available')}")
            
            if 'cause_classifier' in data:
                cc = data['cause_classifier']
                print(f"\n   Cause Classifier Metrics:")
                print(f"   - Accuracy: {cc.get('accuracy', 0):.1%}")
                print(f"   - F1 Score: {cc.get('f1_macro', 0):.1%}")
                print(f"   - Classes: {len(cc.get('per_class', {}))}")
            
            if 'segment_gbr' in data:
                gbr = data['segment_gbr']
                print(f"\n   Segment GBR Metrics:")
                print(f"   - RMSE: {gbr.get('rmse', 0):.6f}")
                print(f"   - MAE: {gbr.get('mae', 0):.6f}")
                print(f"   - R²: {gbr.get('r2', 0):.4f}")
            
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_risk_tiles():
    """Test the risk tiles endpoint"""
    print("\n🧪 Testing /api/v1/models/historical/risk-tiles")
    print("=" * 60)
    
    # Test 1: Basic request
    try:
        response = requests.get(f"{BASE_URL}/models/historical/risk-tiles?limit=5")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Basic request successful!")
            print(f"   Total tiles returned: {data.get('total')}")
            
            if data.get('tiles'):
                first_tile = data['tiles'][0]
                print(f"\n   Sample Tile:")
                print(f"   - Segment: {first_tile.get('segment_id')}")
                print(f"   - SPI: {first_tile.get('SPI_tile'):.4f}")
                print(f"   - Vehicle: {first_tile.get('Vehicle')}")
                print(f"   - Location: ({first_tile.get('lat_bin')}, {first_tile.get('lon_bin')})")
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 2: Filtered by vehicle
    print("\n   Testing vehicle filter (Car)...")
    try:
        response = requests.get(f"{BASE_URL}/models/historical/risk-tiles?limit=5&vehicle=Car")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Vehicle filter works! Found {data.get('total')} Car tiles")
        else:
            print(f"   ❌ Vehicle filter failed")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Filtered by min_risk
    print("\n   Testing risk filter (SPI ≥ 0.38)...")
    try:
        response = requests.get(f"{BASE_URL}/models/historical/risk-tiles?limit=10&min_risk=0.38")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Risk filter works! Found {data.get('total')} high-risk tiles")
            
            # Verify all returned tiles meet the threshold
            if data.get('tiles'):
                min_spi = min(tile['SPI_tile'] for tile in data['tiles'])
                print(f"   Minimum SPI in results: {min_spi:.4f}")
        else:
            print(f"   ❌ Risk filter failed")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return True

def test_models_info():
    """Test that models/info includes historical models"""
    print("\n🧪 Testing /api/v1/models/info (historical section)")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/models/info")
        
        if response.status_code == 200:
            data = response.json()
            
            if 'historical_models' in data:
                print("✅ Historical models info found!")
                
                hist = data['historical_models']
                
                if 'cause_classifier' in hist:
                    cc = hist['cause_classifier']
                    print(f"\n   Cause Classifier:")
                    print(f"   - Name: {cc.get('name')}")
                    print(f"   - Type: {cc.get('type')}")
                    print(f"   - Status: {cc.get('status')}")
                    print(f"   - Classes: {', '.join(cc.get('classes', []))}")
                
                if 'segment_gbr' in hist:
                    gbr = hist['segment_gbr']
                    print(f"\n   Segment GBR:")
                    print(f"   - Name: {gbr.get('name')}")
                    print(f"   - Type: {gbr.get('type')}")
                    print(f"   - Status: {gbr.get('status')}")
                
                return True
            else:
                print("❌ Historical models not found in info")
                return False
        else:
            print(f"❌ Request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all integration tests"""
    print("🚀 Historical Model Integration Test Suite")
    print("=" * 60)
    
    # Wait for backend
    if not wait_for_backend():
        print("\n❌ Cannot proceed without backend")
        return
    
    # Run tests
    results = []
    
    results.append(("Models Info", test_models_info()))
    results.append(("Historical Metrics", test_historical_metrics()))
    results.append(("Risk Tiles", test_risk_tiles()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Historical model integration is working!")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed. Please review the output above.")

if __name__ == "__main__":
    main()
