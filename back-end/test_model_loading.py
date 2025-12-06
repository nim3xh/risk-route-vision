"""
Test script to verify XGBoost model loading
"""
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 60)
print("Testing XGBoost Model Loading")
print("=" * 60)

# Test 1: Check if model files exist
print("\n1. Checking model files...")
models_dir = Path(__file__).parent / "models"
model_file = models_dir / "xgb_vehicle_specific_risk.pkl"
thresholds_file = models_dir / "vehicle_thresholds.csv"

print(f"   Models directory: {models_dir}")
print(f"   Model file exists: {model_file.exists()}")
print(f"   Thresholds file exists: {thresholds_file.exists()}")

if model_file.exists():
    print(f"   Model file size: {model_file.stat().st_size / 1024:.2f} KB")
if thresholds_file.exists():
    print(f"   Thresholds file size: {thresholds_file.stat().st_size} bytes")

# Test 2: Load the model
print("\n2. Loading XGBoost model...")
try:
    from app.ml.model import load_xgboost_model, load_vehicle_thresholds
    
    model = load_xgboost_model()
    if model:
        print(f"   ✅ Model loaded successfully!")
        print(f"   Model type: {type(model)}")
    else:
        print(f"   ⚠️ Model is None (using dummy predictions)")
    
    thresholds = load_vehicle_thresholds()
    if thresholds:
        print(f"   ✅ Thresholds loaded for {len(thresholds)} vehicles")
        for vehicle, threshold in thresholds.items():
            print(f"      - {vehicle}: {threshold}")
    else:
        print(f"   ⚠️ Using default thresholds")
        
except Exception as e:
    print(f"   ❌ Error loading model: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Test prediction
print("\n3. Testing prediction...")
try:
    from app.ml.model import predict_segment_scores
    
    test_features = {
        "temperature": 28.0,
        "humidity": 75.0,
        "precipitation": 0.0,
        "wind_speed": 5.0,
        "is_wet": False,
        "curvature": 0.002,
        "vehicle_type": "MOTORCYCLE"
    }
    
    coords = [[79.8612, 6.9271], [79.8620, 6.9280]]
    
    print(f"   Testing with vehicle: {test_features['vehicle_type']}")
    # Note: predict_segment_scores expects (features, coords) not (coords, features)
    scores = predict_segment_scores(test_features, coords)
    
    print(f"   ✅ Prediction successful!")
    print(f"   Scores: {scores}")
    print(f"   Average risk score: {sum(scores) / len(scores):.3f}")
    
except Exception as e:
    print(f"   ❌ Error in prediction: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
