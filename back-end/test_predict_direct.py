"""Test prediction function directly"""
import sys
sys.path.insert(0, '.')

from app.ml.model import predict_segment_scores

# Test data
coords = [[79.8612, 6.9271], [79.8620, 6.9280]]
features = {
    "temperature": 28.0,
    "humidity": 75.0,
    "precipitation": 0.0,
    "wind_speed": 5.0,
    "curvature": 0.1,
    "is_wet": 0.0,
    "vehicle_factor": 1.3,
}

print("Testing prediction...")
try:
    scores = predict_segment_scores(features, coords)
    print(f"Success! Scores: {scores}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
