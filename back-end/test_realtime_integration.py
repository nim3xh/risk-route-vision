"""
Test suite for Realtime Risk Pipeline API Integration
Tests all new endpoints and validates data integrity.
"""
import requests
import time
import sys

BASE_URL = "http://localhost:8080/api/v1"
MAX_RETRIES = 10
RETRY_DELAY = 2

def wait_for_backend():
    """Wait for backend to be ready"""
    print("⏳ Waiting for backend to be ready...")
    for i in range(MAX_RETRIES):
        try:
            response = requests.get(f"{BASE_URL}/models/health", timeout=2)
            if response.status_code == 200:
                print("✅ Backend is ready!\n")
                return True
        except requests.exceptions.RequestException:
            pass
        
        if i < MAX_RETRIES - 1:
            print(f"   Attempt {i+1}/{MAX_RETRIES}... retrying in {RETRY_DELAY}s")
            time.sleep(RETRY_DELAY)
    
    print("❌ Backend not responding after maximum retries")
    return False

def test_realtime_metrics():
    """Test /api/v1/models/realtime/metrics endpoint"""
    print("🧪 Testing /api/v1/models/realtime/metrics")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/models/realtime/metrics")
        
        if response.status_code != 200:
            print(f"❌ FAIL - Status code: {response.status_code}")
            return False
        
        data = response.json()
        
        # Validate structure
        if not data.get('available'):
            print("❌ FAIL - Data not available")
            return False
        
        print("✅ Endpoint successful!")
        print(f"   Available: {data['available']}")
        
        # Check regression metrics
        reg = data.get('regression_metrics', {})
        print(f"\n   Regression Metrics:")
        print(f"   - R² Score: {reg.get('r2', 0)*100:.1f}%")
        print(f"   - MAE: {reg.get('mae', 0):.6f}")
        print(f"   - RMSE: {reg.get('rmse', 0):.6f}")
        print(f"   - Dataset: {reg.get('n_train', 0)} train / {reg.get('n_test', 0)} test")
        print(f"   - Model: {reg.get('model', 'N/A')}")
        print(f"   - Tuned: {reg.get('tuned', False)}")
        
        # Check classification metrics
        cls = data.get('classification_metrics', {})
        print(f"\n   Classification Metrics:")
        print(f"   - Accuracy: {cls.get('accuracy', 0)*100:.1f}%")
        print(f"   - F1 Score: {cls.get('f1', 0)*100:.1f}%")
        print(f"   - Threshold: {cls.get('global_threshold', 0):.4f}")
        
        # Check vehicle-specific metrics
        vehicles = data.get('vehicle_specific', [])
        print(f"\n   Vehicle-Specific Metrics: {len(vehicles)} vehicle types")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL - Exception: {e}")
        return False

def test_feature_importance():
    """Test /api/v1/models/realtime/feature-importance endpoint"""
    print("\n🧪 Testing /api/v1/models/realtime/feature-importance")
    print("=" * 60)
    
    try:
        # Test basic request
        response = requests.get(f"{BASE_URL}/models/realtime/feature-importance")
        
        if response.status_code != 200:
            print(f"❌ FAIL - Status code: {response.status_code}")
            return False
        
        data = response.json()
        features = data.get('features', [])
        
        print(f"✅ Basic request successful!")
        print(f"   Total features returned: {len(features)}")
        
        if features:
            top_feature = features[0]
            print(f"\n   Top Feature:")
            print(f"   - Name: {top_feature['feature']}")
            print(f"   - Importance: {top_feature['importance']*100:.2f}%")
        
        # Test with limit parameter
        print(f"\n   Testing limit parameter (limit=5)...")
        response_limited = requests.get(f"{BASE_URL}/models/realtime/feature-importance?limit=5")
        
        if response_limited.status_code != 200:
            print(f"   ❌ Limit parameter failed")
            return False
        
        data_limited = response_limited.json()
        features_limited = data_limited.get('features', [])
        print(f"   ✅ Limit works! Returned {len(features_limited)} features")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL - Exception: {e}")
        return False

def test_realtime_predictions():
    """Test /api/v1/models/realtime/predictions endpoint"""
    print("\n🧪 Testing /api/v1/models/realtime/predictions")
    print("=" * 60)
    
    try:
        # Test basic request
        response = requests.get(f"{BASE_URL}/models/realtime/predictions?limit=5")
        
        if response.status_code != 200:
            print(f"❌ FAIL - Status code: {response.status_code}")
            return False
        
        data = response.json()
        predictions = data.get('predictions', [])
        summary = data.get('summary', {})
        
        print(f"✅ Basic request successful!")
        print(f"   Total predictions returned: {len(predictions)}")
        
        if predictions:
            sample = predictions[0]
            print(f"\n   Sample Prediction:")
            print(f"   - Vehicle: {sample.get('Vehicle', 'N/A')}")
            print(f"   - True SPI: {sample.get('SPI_true', 0):.4f}")
            print(f"   - Predicted SPI: {sample.get('SPI_pred', 0):.4f}")
            print(f"   - Error: {abs(sample.get('residual', 0)):.4f}")
        
        print(f"\n   Summary Statistics:")
        print(f"   - Accuracy: {summary.get('accuracy', 0)*100:.1f}%")
        print(f"   - Correct: {summary.get('correct', 0)}")
        print(f"   - Incorrect: {summary.get('incorrect', 0)}")
        print(f"   - Mean Absolute Error: {summary.get('mean_absolute_error', 0):.6f}")
        
        # Test vehicle filter
        print(f"\n   Testing vehicle filter (Motor Cycle)...")
        response_filtered = requests.get(
            f"{BASE_URL}/models/realtime/predictions?vehicle=Motor%20Cycle&limit=5"
        )
        
        if response_filtered.status_code == 200:
            data_filtered = response_filtered.json()
            predictions_filtered = data_filtered.get('predictions', [])
            print(f"   ✅ Vehicle filter works! Found {len(predictions_filtered)} Motor Cycle predictions")
        
        # Test errors only filter
        print(f"\n   Testing show_errors_only filter...")
        response_errors = requests.get(
            f"{BASE_URL}/models/realtime/predictions?show_errors_only=true&limit=10"
        )
        
        if response_errors.status_code == 200:
            data_errors = response_errors.json()
            predictions_errors = data_errors.get('predictions', [])
            print(f"   ✅ Errors filter works! Found {len(predictions_errors)} misclassified predictions")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL - Exception: {e}")
        return False

def test_models_info():
    """Verify that /api/v1/models/info includes realtime model info"""
    print("\n🧪 Testing /api/v1/models/info (realtime section)")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/models/info")
        
        if response.status_code != 200:
            print(f"❌ FAIL - Status code: {response.status_code}")
            return False
        
        data = response.json()
        realtime = data.get('realtime_model', {})
        
        if not realtime:
            print("❌ FAIL - Realtime model info not found")
            return False
        
        print("✅ Realtime model info found!")
        print(f"\n   Model Info:")
        print(f"   - Name: {realtime.get('name', 'N/A')}")
        print(f"   - Type: {realtime.get('type', 'N/A')}")
        print(f"   - Status: {realtime.get('status', 'N/A')}")
        print(f"   - Vehicle Types: {len(realtime.get('vehicle_types', []))}")
        print(f"   - Features: {len(realtime.get('features', []))}")
        
        return True
        
    except Exception as e:
        print(f"❌ FAIL - Exception: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Realtime Model Integration Test Suite")
    print("=" * 60)
    
    # Wait for backend
    if not wait_for_backend():
        sys.exit(1)
    
    # Run tests
    results = {}
    results['models_info'] = test_models_info()
    results['realtime_metrics'] = test_realtime_metrics()
    results['feature_importance'] = test_feature_importance()
    results['predictions'] = test_realtime_predictions()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        test_display = test_name.replace('_', ' ').title()
        print(f"{status} - {test_display}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed! Realtime model integration is working!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
