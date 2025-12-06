"""
XGBoost-based risk prediction model for vehicle-specific risk assessment.
This module loads a pre-trained XGBoost model and applies per-vehicle thresholds
to predict risk scores and determine high-risk classifications.
"""
import os
import csv
import joblib
import warnings
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.feature_extraction import FeatureHasher

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# Compatibility fix for sklearn pickle loading
import sys
import sklearn.compose._column_transformer as ct_module

# Create a dummy _RemainderColsList class if it doesn't exist
if not hasattr(ct_module, '_RemainderColsList'):
    class _RemainderColsList(list):
        """Compatibility wrapper for older sklearn models"""
        pass
    ct_module._RemainderColsList = _RemainderColsList
    print("[Info] Added sklearn compatibility wrapper for _RemainderColsList")

# Custom transformer class required for model loading
class DenseHashingVectorizer(BaseEstimator, TransformerMixin):
    """
    Custom transformer that applies feature hashing and returns dense arrays.
    This is required to load the trained XGBoost model.
    """
    def __init__(self, n_features=20, input_type='string'):
        self.n_features = n_features
        self.input_type = input_type
        self._init_hasher()
    
    def _init_hasher(self):
        """Initialize or reinitialize the hasher"""
        # Use defaults if attributes not set
        n_feat = getattr(self, 'n_features', 20)
        inp_type = getattr(self, 'input_type', 'string')
        self.hasher = FeatureHasher(n_features=n_feat, input_type=inp_type)
    
    def __setstate__(self, state):
        """Handle unpickling - reinitialize hasher after unpickling"""
        self.__dict__.update(state)
        # Set defaults if not in pickled state
        if not hasattr(self, 'n_features'):
            self.n_features = 20
        if not hasattr(self, 'input_type'):
            self.input_type = 'string'
        # Reinitialize hasher
        self._init_hasher()
    
    def fit(self, X, y=None):
        return self
    
    def transform(self, X):
        if not hasattr(self, 'hasher') or self.hasher is None:
            self._init_hasher()
        
        # When X comes from pandas ColumnTransformer, it's a DataFrame with categorical columns
        # FeatureHasher expects an iterable where each element is an iterable of strings
        # We need to convert DataFrame rows to the proper format
        if hasattr(X, 'values'):
            # Extract values and ensure they're in the right format
            # Each row should be an iterable of strings
            X_transformed = []
            for row in X.values:
                # row is a numpy array of values from the categorical columns
                # Each value might be a tuple/list of strings or a single string
                tokens = []
                for val in row:
                    if isinstance(val, (tuple, list)):
                        # Already an iterable of strings
                        tokens.extend(val)
                    elif isinstance(val, str):
                        # Single string, wrap in list
                        tokens.append(val)
                    else:
                        # Convert to string
                        tokens.append(str(val))
                X_transformed.append(tokens)
            X = X_transformed
        
        # Now X is in the proper format for FeatureHasher
        return self.hasher.transform(X).toarray()

_MODEL = None
_VEHICLE_THRESHOLDS = None

# Risk cause descriptions by risk level
RISK_CAUSES = {
    "high": [
        "Dangerous sharp curve with very poor visibility",
        "Steep descent with hairpin turn",
        "Narrow road with blind spots",
        "Wet road with poor drainage",
        "Heavy traffic during rush hour",
        "Severe weather conditions affecting visibility",
        "Poor road surface with potholes",
        "Tight curve with limited escape routes"
    ],
    "medium": [
        "Moderate traffic zone",
        "Uneven road surface",
        "Tight turn requiring caution",
        "Medium traffic with lane changes",
        "Narrow lane with limited visibility",
        "Moderate weather impact",
        "Slight road degradation",
        "Moderate curvature section"
    ],
    "low": [
        "Well-maintained road section",
        "Safe residential area",
        "Wide road with good visibility",
        "Low traffic conditions",
        "Straight road section",
        "Favorable weather conditions",
        "Good road surface quality",
        "Adequate lighting and signage"
    ]
}

def load_vehicle_thresholds(thresholds_path: Optional[str] = None) -> Dict[str, float]:
    """
    Load vehicle-specific thresholds from CSV file.
    Returns dict with vehicle names as keys and threshold values.
    """
    global _VEHICLE_THRESHOLDS
    
    if _VEHICLE_THRESHOLDS is not None:
        return _VEHICLE_THRESHOLDS
    
    # Default thresholds if file not found
    default_thresholds = {
        "__GLOBAL__": 0.5,
        "MOTORCYCLE": 0.45,
        "THREE_WHEELER": 0.48,
        "CAR": 0.50,
        "BUS": 0.55,
        "LORRY": 0.52
    }
    
    if thresholds_path is None:
        thresholds_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "models", "vehicle_thresholds.csv"
        )
    
    if os.path.exists(thresholds_path):
        try:
            thresholds = {}
            # Vehicle name mapping from CSV to API format
            vehicle_name_mapping = {
                "Motor Cycle": "MOTORCYCLE",
                "Three Wheeler": "THREE_WHEELER",
                "Car": "CAR",
                "Bus": "BUS",
                "Lorry": "LORRY",
                "Van": "VAN"
            }
            
            with open(thresholds_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    vehicle = row.get('Vehicle', row.get('vehicle', ''))
                    threshold = float(row.get('threshold', row.get('Threshold', 0.5)))
                    
                    # Map CSV vehicle names to API format
                    api_vehicle = vehicle_name_mapping.get(vehicle, vehicle.upper().replace(' ', '_'))
                    thresholds[api_vehicle] = threshold
                    
            _VEHICLE_THRESHOLDS = thresholds
            print(f"[Info] Loaded vehicle thresholds from {thresholds_path}")
            print(f"[Debug] Threshold mapping: {thresholds}")
            return thresholds
        except Exception as e:
            print(f"[Warn] Error loading thresholds from {thresholds_path}: {e}")
            _VEHICLE_THRESHOLDS = default_thresholds
            return default_thresholds
    else:
        print(f"[Warn] Thresholds file not found at {thresholds_path}, using defaults")
        _VEHICLE_THRESHOLDS = default_thresholds
        return default_thresholds

def load_xgboost_model(model_path: Optional[str] = None):
    """
    Load the pre-trained XGBoost model from pickle file.
    """
    global _MODEL
    
    if _MODEL is not None and _MODEL != "dummy":
        return _MODEL
    
    # Register DenseHashingVectorizer in __main__ for pickle compatibility
    import __main__
    if not hasattr(__main__, 'DenseHashingVectorizer'):
        __main__.DenseHashingVectorizer = DenseHashingVectorizer
        print("[Info] Registered DenseHashingVectorizer in __main__")
    
    if model_path is None:
        # Try environment variable first
        model_path = os.getenv("RISK_MODEL_PATH")
    
    if model_path is None or not os.path.exists(model_path):
        # Try default location
        model_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "models", "xgb_vehicle_specific_risk.pkl"
        )
    
    if os.path.exists(model_path):
        try:
            print(f"[Info] Attempting to load model from {model_path}")
            _MODEL = joblib.load(model_path)
            print(f"[Info] ✅ Loaded XGBoost model successfully!")
            print(f"[Info] Model type: {type(_MODEL)}")
            return _MODEL
        except Exception as e:
            print(f"[Error] Failed to load model from {model_path}: {e}")
            import traceback
            traceback.print_exc()
            _MODEL = "dummy"
            return _MODEL
    else:
        print(f"[Warn] Model file not found at {model_path}, using dummy predictions")
        _MODEL = "dummy"
        return _MODEL

def prepare_features_for_prediction(
    coords: List[Tuple[float, float]],
    weather: Dict,
    vehicle_type: str,
    timestamp: Optional[str] = None
) -> pd.DataFrame:
    """
    Prepare features in the format expected by the XGBoost model.
    This matches the feature engineering from the training notebook.
    """
    n = len(coords)
    
    # Parse timestamp or use current time
    if timestamp:
        try:
            dt = pd.to_datetime(timestamp)
        except:
            dt = datetime.now()
    else:
        dt = datetime.now()
    
    # Extract time features
    hour = dt.hour
    dow = dt.weekday()  # 0=Monday, 6=Sunday (weekday() for datetime objects)
    is_weekend = 1 if dow >= 5 else 0
    
    # Timestamp as unix seconds
    ts = int(dt.timestamp())
    
    # Weather features
    temp = weather.get("temperature", 20.0)
    humidity = weather.get("humidity", 60.0)
    precip = weather.get("precipitation", 0.0)
    wind = weather.get("wind_speed", 0.0)
    is_wet = 1 if precip > 0.1 else 0
    
    # Location features (use middle coordinate)
    mid_idx = len(coords) // 2
    lat, lon = coords[mid_idx]
    
    # Create lat/lon bins (approximate grid cells)
    lat_bin = int(lat * 100)
    lon_bin = int(lon * 100)
    
    # Curvature estimation (from existing feature engineering)
    curvature = weather.get("curvature", 0.0)
    
    # Vehicle as categorical
    vehicle = vehicle_type
    
    # Build dataframe with all features
    # Only include features that the model can handle
    data = {
        'Temperature (C)': [temp] * n,
        'Humidity (%)': [humidity] * n,
        'Precipitation (mm)': [precip] * n,
        'Wind Speed (km/h)': [wind] * n,
        'Latitude': [lat] * n,
        'Longitude': [lon] * n,
        'hour': [hour] * n,
        'dow': [dow] * n,
        'is_weekend': [is_weekend] * n,
        'is_wet': [is_wet] * n,
        'lat_bin': [lat_bin] * n,
        'lon_bin': [lon_bin] * n,
        'timestamp': [ts] * n,
        'Vehicle': [vehicle] * n,
        'is_speed_reason': [0] * n,
    }
    
    # Add curvature if available
    if 'curvature' in weather or curvature > 0:
        data['curvature'] = [curvature] * n
    
    df = pd.DataFrame(data)
    
    # Add categorical text columns formatted for FeatureHasher
    # FeatureHasher with input_type='string' expects each value to be an iterable of strings
    # We use apply to ensure each cell contains a list/tuple, not a single string
    df['Reason'] = [('Unknown',)] * n  # Tuple of strings
    df['Position'] = [('Road',)] * n
    df['Description'] = [('Route', 'segment')] * n  # Multiple tokens
    df['Place'] = [('Unknown',)] * n
    df['segment_id'] = [(f'seg_{i}',) for i in range(n)]
    
    return df

def get_risk_cause(risk_score: float, vehicle_type: str, weather: Dict) -> str:
    """
    Generate a risk cause description based on risk level and context.
    """
    # Determine risk level
    if risk_score >= 0.7:
        level = "high"
    elif risk_score >= 0.4:
        level = "medium"
    else:
        level = "low"
    
    # Select base cause
    causes = RISK_CAUSES[level]
    
    # Use hash of inputs to consistently select cause
    hash_val = hash((risk_score, vehicle_type)) % len(causes)
    cause = causes[hash_val]
    
    # Add vehicle-specific context for high/medium risk
    if risk_score >= 0.6:
        vehicle_context = {
            "MOTORCYCLE": " - high risk for motorcycles",
            "THREE_WHEELER": " - risky for three wheelers",
            "BUS": " - challenging for buses",
            "LORRY": " - difficult for lorries",
        }
        cause += vehicle_context.get(vehicle_type, "")
    
    # Add weather context if relevant
    if weather.get("precipitation", 0) > 0.5 and risk_score >= 0.5:
        cause += " with wet conditions"
    
    return cause

def predict_segment_scores(features: Dict, coords: List[Tuple[float, float]]) -> List[float]:
    """
    Predict risk scores for route segments using XGBoost model.
    
    Args:
        features: Dict containing weather, curvature, vehicle info
        coords: List of (lat, lon) tuples for route points
        
    Returns:
        List of risk scores (0.0 to 1.0) for each segment
    """
    model = load_xgboost_model()
    vehicle_type = features.get("vehicle_type", "CAR")
    
    # Use dummy prediction if model not loaded
    if model == "dummy":
        print("[Warn] Using dummy predictions - model not loaded")
        base = features.get("curvature", 0.1)
        wet = features.get("surface_wetness_prob", 0.0)
        vf = features.get("vehicle_factor", 1.0)
        return [min(1.0, max(0.0, 0.15*vf + 0.7*base + 0.15*wet)) for _ in range(len(coords))]
    
    try:
        # Prepare features for model
        X = prepare_features_for_prediction(
            coords=coords,
            weather=features,
            vehicle_type=vehicle_type,
            timestamp=features.get("timestamp")
        )
        
        # Get predictions (SPI_smoothed values)
        predictions = model.predict(X)
        
        # Load vehicle thresholds
        thresholds = load_vehicle_thresholds()
        threshold = thresholds.get(vehicle_type, thresholds.get("__GLOBAL__", 0.5))
        
        # Normalize predictions to 0-1 range
        # SPI values are typically around 0.3-0.8, normalize relative to threshold
        normalized_scores = []
        for pred in predictions:
            # Convert SPI to risk score (0-1)
            # Values above threshold are high risk, below are low risk
            if pred >= threshold:
                # Map [threshold, max_spi] to [0.5, 1.0]
                max_spi = 1.0
                risk = 0.5 + 0.5 * ((pred - threshold) / (max_spi - threshold))
            else:
                # Map [0, threshold] to [0.0, 0.5]
                risk = 0.5 * (pred / threshold)
            
            normalized_scores.append(float(np.clip(risk, 0.0, 1.0)))
        
        return normalized_scores
        
    except Exception as e:
        print(f"[Error] Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to dummy prediction
        n = len(coords)
        return [0.3] * n  # Conservative moderate risk

def predict_with_cause(
    coords: List[Tuple[float, float]],
    weather: Dict,
    vehicle_type: str,
    timestamp: Optional[str] = None
) -> Tuple[List[float], List[str]]:
    """
    Predict risk scores and generate causes for each segment.
    
    Returns:
        Tuple of (risk_scores, risk_causes)
    """
    features = {
        **weather,
        "vehicle_type": vehicle_type,
        "timestamp": timestamp
    }
    
    scores = predict_segment_scores(features, coords)
    causes = [get_risk_cause(score, vehicle_type, weather) for score in scores]
    
    return scores, causes
