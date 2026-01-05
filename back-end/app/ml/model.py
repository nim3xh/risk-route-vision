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

_XGB_MODEL = None
_CAUSE_MODEL = None
_RATE_MODEL = None
_VEHICLE_THRESHOLDS = None



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
    global _XGB_MODEL
    
    if _XGB_MODEL is not None and _XGB_MODEL != "dummy":
        return _XGB_MODEL
    
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
            print(f"[Info] Attempting to load XGBoost model from {model_path}")
            _XGB_MODEL = joblib.load(model_path)
            print("[Info] Loaded XGBoost model successfully")
            return _XGB_MODEL
        except Exception as e:
            print(f"[Error] Failed to load XGBoost model from {model_path}: {e}")
            import traceback
            traceback.print_exc()
            _XGB_MODEL = "dummy"
            return _XGB_MODEL
    else:
        print(f"[Warn] XGBoost Model file not found at {model_path}, using dummy predictions")
        _XGB_MODEL = "dummy"
        return _XGB_MODEL

def load_cause_classifier(model_path: Optional[str] = None):
    """
    Load the pre-trained Cause Classifier (sklearn Pipeline) from joblib file.
    """
    global _CAUSE_MODEL
    
    if _CAUSE_MODEL is not None and _CAUSE_MODEL != "dummy":
        return _CAUSE_MODEL
        
    if model_path is None:
        model_path = os.getenv("CAUSE_MODEL_PATH")
        
    if model_path is None or not os.path.exists(model_path):
        model_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "models", "cause_classifier.joblib"
        )
        
    if os.path.exists(model_path):
        try:
            print(f"[Info] Attempting to load Cause Classifier from {model_path}")
            # Sklearn pipelines don't usually need custom classes for loading if standard components are used
            _CAUSE_MODEL = joblib.load(model_path)
            print("[Info] Loaded Cause Classifier successfully")
            return _CAUSE_MODEL
        except Exception as e:
            print(f"[Error] Failed to load Cause Classifier from {model_path}: {e}")
            import traceback
            traceback.print_exc()
            _CAUSE_MODEL = "dummy"
            return _CAUSE_MODEL
    else:
        print(f"[Warn] Cause Classifier file not found at {model_path}, using dummy causes")
        _CAUSE_MODEL = "dummy"
        return _CAUSE_MODEL

def load_segment_rate_model(model_path: Optional[str] = None):
    """
    Load the pre-trained Segment GBR model (incident rate regressor).
    """
    global _RATE_MODEL
    
    if _RATE_MODEL is not None and _RATE_MODEL != "dummy":
        return _RATE_MODEL
        
    if model_path is None:
        model_path = os.getenv("RATE_MODEL_PATH")
        
    if model_path is None or not os.path.exists(model_path):
        model_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "models", "segment_gbr.joblib"
        )
        
    if os.path.exists(model_path):
        try:
            print(f"[Info] Attempting to load Segment Rate model from {model_path}")
            _RATE_MODEL = joblib.load(model_path)
            print(f"[Info] ✅ Loaded Segment Rate model successfully!")
            return _RATE_MODEL
        except Exception as e:
            print(f"[Error] Failed to load Segment Rate model: {e}")
            _RATE_MODEL = "dummy"
            return _RATE_MODEL
    else:
        print(f"[Warn] Segment Rate model file not found at {model_path}")
        _RATE_MODEL = "dummy"
        return _RATE_MODEL

def predict_incident_rate(df: pd.DataFrame) -> List[float]:
    """
    Predict incident rate using Segment GBR.
    Expects DF with columns [hour, dow, is_wet, Vehicle].
    """
    model = load_segment_rate_model()
    if model == "dummy":
        return [0.0] * len(df)
        
    try:
        feat_cols = ["hour", "dow", "is_wet", "Vehicle"]
        X = df[feat_cols].copy()
        
        # Ensure Vehicle labels match training (Title Case)
        X["Vehicle"] = X["Vehicle"].astype(str).str.title()
        
        X_dummies = pd.get_dummies(X, columns=["Vehicle"], dummy_na=True)
        
        if hasattr(model, "feature_names_in_"):
            cols = model.feature_names_in_
            X_final = pd.DataFrame(index=X_dummies.index)
            for c in cols:
                X_final[c] = X_dummies[c] if c in X_dummies.columns else 0
            return [float(v) for v in model.predict(X_final)]
            
        return [float(v) for v in model.predict(X_dummies)]
    except Exception as e:
        print(f"[Error] Rate prediction failed: {e}")
        return [0.0] * len(df)

def prepare_features_for_xgboost(
    coords: List[Tuple[float, float]],
    weather: Dict,
    vehicle_type: str,
    timestamp: Optional[str] = None,
    hour_override: Optional[int] = None
) -> pd.DataFrame:
    """
    Prepare features for XGBoost (requires feature hashing with tuples).
    """
    df = _base_feature_df(coords, weather, vehicle_type, timestamp, hour_override)
    n = len(df)
    
    # Add categorical text columns formatted for FeatureHasher (tuples of strings)
    df['Reason'] = [('Unknown',)] * n
    df['Position'] = [('Road',)] * n
    df['Description'] = [('Route', 'segment')] * n
    df['Place'] = [('Unknown',)] * n
    df['segment_id'] = [(f'seg_{i}',) for i in range(n)]
    
    return df

def prepare_features_for_classifier(
    coords: List[Tuple[float, float]],
    weather: Dict,
    vehicle_type: str,
    spi_scores: List[float],
    timestamp: Optional[str] = None
) -> pd.DataFrame:
    """
    Prepare features for Cause Classifier (requires standard strings and SPI).
    """
    df = _base_feature_df(coords, weather, vehicle_type, timestamp)
    
    # Add SPI Score (target of XGBoost is input to Classifier)
    df['SPI_smoothed'] = spi_scores
    
    # Add string columns (standard strings for Tfidf/OneHot)
    n = len(df)
    df['Reason'] = [''] * n # Target, not input, but sometimes pipeline expects column existence? No.
    df['Position'] = ['Road'] * n
    df['Place'] = ['Unknown'] * n
    df['Description'] = ['Route segment'] * n # Tfidf input
    
    # Ensure correct types for numeric columns specific to classifier training
    numeric_cols = ["Temperature (C)","Humidity (%)","Precipitation (mm)","Wind Speed (km/h)",
                    "hour","dow","is_weekend","is_wet","Latitude","Longitude","SPI_smoothed"]
    for c in numeric_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce')
            
    return df

def _base_feature_df(
    coords: List[Tuple[float, float]],
    weather: Dict,
    vehicle_type: str,
    timestamp: Optional[str] = None,
    hour_override: Optional[int] = None
) -> pd.DataFrame:
    """
    Shared feature construction logic.
    
    Handles both LIVE and MANUAL data:
    - TIME: Uses hour_override if provided (manual), otherwise extracts from timestamp
    - WEATHER: Uses values from weather dict (can be live API data or manual inputs)
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
    
    # Extract time features - PRIORITIZE manual hour_override
    hour = hour_override if hour_override is not None else dt.hour
    dow = dt.weekday()
    is_weekend = 1 if dow >= 5 else 0
    # Timestamp as unix seconds
    ts = int(dt.timestamp())
    
    # Weather features - can come from LIVE API or MANUAL user input
    temp = weather.get("temperature", 20.0)
    humidity = weather.get("humidity", 60.0)
    precip = weather.get("precipitation", 0.0)
    wind = weather.get("wind_speed", 0.0)
    
    # Use provided is_wet or derive from precip
    is_wet = weather.get("is_wet")
    if is_wet is None:
        is_wet = 1 if precip > 0.1 else 0
    else:
        is_wet = int(is_wet)
    
    # Location features (use middle coordinate for simplicity or per-point?)
    # The XGBoost preparation used repeated values for all points based on middle?
    # Actually, let's verify if 'coords' creates one row per coord.
    # The original prepare_features_for_prediction took a List of coords and returned a DF of length n.
    # So we should preserve that.
    
    lats = [c[0] for c in coords]
    lons = [c[1] for c in coords]
    
    # Create lat/lon bins with higher precision for more granular location differentiation
    lat_bins = [int(l * 1000) for l in lats]  # Increased from 100 to 1000
    lon_bins = [int(l * 1000) for l in lons]  # Increased from 100 to 1000
    
    # Base data
    data = {
        'Temperature (C)': [temp] * n,
        'Humidity (%)': [humidity] * n,
        'Precipitation (mm)': [precip] * n,
        'Wind Speed (km/h)': [wind] * n,
        'Latitude': lats,
        'Longitude': lons,
        'hour': [hour] * n,
        'dow': [dow] * n,
        'is_weekend': [is_weekend] * n,
        'is_wet': [is_wet] * n,
        'lat_bin': lat_bins,
        'lon_bin': lon_bins,
        'timestamp': [ts] * n,
        'Vehicle': [vehicle_type] * n,
        'is_speed_reason': [0] * n,
    }
    
    curvature = weather.get("curvature", 0.0)
    if isinstance(curvature, list):
        if len(curvature) == n:
            # Use actual per-point curvature values
            data['curvature'] = curvature
        else:
            # Fallback if length mismatch
            data['curvature'] = [curvature[0]] * n
    elif 'curvature' in weather or curvature > 0:
        data['curvature'] = [curvature] * n
    else:
        # Default curvature if not provided
        data['curvature'] = [0.0] * n
        
    return pd.DataFrame(data)

def predict_cause_scores(features: Dict, coords: List[Tuple[float, float]], spi_scores: List[float]) -> List[str]:
    """
    Predict cause description using Cause Classifier.
    """
    model = load_cause_classifier()
    vehicle_type = features.get("vehicle_type", "CAR")
    
    if model == "dummy":
        # Fallback heuristic
        return ["Potential risk due to road conditions" for _ in spi_scores]
        
    try:
        X = prepare_features_for_classifier(
            coords=coords,
            weather=features,
            vehicle_type=vehicle_type,
            spi_scores=spi_scores,
            timestamp=features.get("timestamp")
        )
        # Predict "Reason"
        causes = model.predict(X)
        return list(causes)
    except Exception as e:
        print(f"[Error] Cause prediction failed: {e}")
        return ["Unknown Cause"] * len(spi_scores)

def predict_segment_scores(features: Dict, coords: List[Tuple[float, float]]) -> List[float]:
    """
    Predict risk scores for route segments using XGBoost model.
    
    Args:
        features: Dict containing weather, curvature, vehicle info
        coords: List of (lat, lon) tuples for route points
        hour: Optional hour (0-23) override
        
    Returns:
        List of risk scores (0.0 to 1.0) for each segment
    """
    model = load_xgboost_model()
    vehicle_type = features.get("vehicle_type", "CAR")
    hour_val = features.get("hour")
    
    # Use dummy prediction if model not loaded
    if model == "dummy":
        print("[Warn] Using dummy predictions - model not loaded")
        base = features.get("curvature", 0.1)
        # Wet conditions and Time of day influence risk in dummy mode
        # High risk hours (rush hour 7-9, 17-19) increase risk by 20%
        time_factor = 1.2 if hour_val is not None and hour_val in [7,8,9,17,18,19] else 1.0
        
        wet = features.get("surface_wetness_prob", 0.0)
        vf = features.get("vehicle_factor", 1.0)
        
        if isinstance(base, list):
            return [min(1.0, max(0.0, (0.15*vf + 0.7*b + 0.15*wet) * time_factor)) for b in base], [0.0]*len(base), [0.0]*len(base)
        return [min(1.0, max(0.0, (0.15*vf + 0.7*base + 0.15*wet) * time_factor)) for _ in range(len(coords))], [0.0]*len(coords), [0.0]*len(coords)
    
    try:
        # Prepare features for model
        X = prepare_features_for_xgboost(
            coords=coords,
            weather=features,
            vehicle_type=vehicle_type,
            timestamp=features.get("timestamp"),
            hour_override=hour_val
        )
        
        # Get predictions (SPI_smoothed values)
        predictions = model.predict(X)
        
        # Load vehicle thresholds
        thresholds = load_vehicle_thresholds()
        threshold = thresholds.get(vehicle_type, thresholds.get("__GLOBAL__", 0.5))
        
        # Get curvature values for amplification
        curvatures = features.get("curvature", [0.0] * len(coords))
        if not isinstance(curvatures, list):
            curvatures = [curvatures] * len(coords)
        
        # Normalize predictions to 0-1 range with curvature amplification
        normalized_scores = []
        for idx, pred in enumerate(predictions):
            # Base risk from model prediction
            if pred >= threshold:
                max_spi = 1.0
                base_risk = 0.5 + 0.5 * ((pred - threshold) / (max_spi - threshold))
            else:
                base_risk = 0.5 * (pred / threshold)
            
            # Amplify risk based on curvature (higher curvature = more risk)
            # Curvature typically ranges from 0 to ~3 radians
            curvature_factor = curvatures[idx] if idx < len(curvatures) else 0.0
            curvature_multiplier = 1.0 + (curvature_factor * 0.15)  # Up to 45% increase for high curvature
            
            # Apply curvature amplification
            adjusted_risk = base_risk * curvature_multiplier
            
            normalized_scores.append(float(np.clip(adjusted_risk, 0.0, 1.0)))
        
        # Predict incident rates
        incident_rates = predict_incident_rate(X)
        
        return normalized_scores, predictions, incident_rates
        
    except Exception as e:
        print(f"[Error] Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        n = len(coords)
        return [0.3] * n, [0.0] * n, [0.0] * n

def sigmoid(x: float) -> float:
    """Sigmoid function for probability transformation"""
    return 1.0 / (1.0 + np.exp(-x))


def calculate_integrated_risk_score(
    cause_probability: float,
    segment_rate: float,
    vehicle_type: str,
    is_wet: bool
) -> float:
    """
    Calculate integrated risk score using thesis formula (Section 4.10.5):
    Risk_{0-100} = 100 × (0.6 × Cause_component + 0.4 × Rate_component) × Vehicle_multiplier × Weather_multiplier
    
    Args:
        cause_probability: Probability of top cause (0-1)
        segment_rate: Predicted incident rate for segment
        vehicle_type: Type of vehicle (affects multiplier)
        is_wet: Whether road is wet (affects weather multiplier)
        
    Returns:
        Risk score from 0 to 100
    """
    # Cause probability component with sigmoid transformation (Section 4.10.1)
    # Enhances sensitivity around 0.5 probability threshold
    cause_component = sigmoid(5 * (cause_probability - 0.5))
    
    # Segment-rate component (Section 4.10.2)
    # Normalize rate to 0-1 range (assuming max observed rate ~0.05)
    max_rate = 0.05  # 95th percentile of observed rates
    rate_component = min(1.0, segment_rate / max_rate)
    
    # Vehicle multipliers (Section 4.10.4)
    vehicle_multipliers = {
        "MOTORCYCLE": 1.2,      # Higher risk due to reduced stability
        "THREE_WHEELER": 1.1,   # Reduced stability considerations
        "CAR": 1.0,             # Baseline
        "BUS": 0.85,            # Professional drivers, better stability
        "LORRY": 0.90,          # Moderate risk
        "VAN": 1.0,             # Same as car
    }
    vehicle_multiplier = vehicle_multipliers.get(vehicle_type, 1.0)
    
    # Weather multipliers (Section 4.10.4)
    weather_multiplier = 1.25 if is_wet else 1.0  # 25% increase for wet conditions
    
    # Final integrated risk score (Section 4.10.5)
    # Weighted combination: 60% cause, 40% rate
    risk_score = 100 * (
        0.6 * cause_component + 0.4 * rate_component
    ) * vehicle_multiplier * weather_multiplier
    
    # Clip to 0-100 range
    return float(np.clip(risk_score, 0.0, 100.0))


def predict_with_cause(
    coords: List[Tuple[float, float]],
    weather: Dict,
    vehicle_type: str,
    timestamp: Optional[str] = None,
    hour: Optional[int] = None
) -> Tuple[List[float], List[str], List[float]]:
    """
    Predict risk scores, causes, and incident rates for each segment.
    Uses integrated risk scoring per thesis Section 4.10.
    
    Returns:
        Tuple of (risk_scores, risk_causes, incident_rates)
    """
    features = {
        **weather,
        "vehicle_type": vehicle_type,
        "timestamp": timestamp,
        "hour": hour
    }
    
    # Get normalized scores, raw SPI, and incident rates
    xgb_scores, raw_spi, rates = predict_segment_scores(features, coords)
    
    # Use raw SPI (output of XGB) as input to Cause Classifier
    causes = predict_cause_scores(features, coords, raw_spi)
    
    # Check if road is wet
    is_wet = weather.get("is_rain", False) or weather.get("precipitation", 0.0) > 0.1
    
    # Calculate integrated risk scores for each segment
    # Use XGBoost output as cause probability proxy
    integrated_scores = []
    for idx in range(len(coords)):
        # Use raw SPI prediction as cause probability (it's already normalized 0-1)
        cause_prob = float(raw_spi[idx]) if idx < len(raw_spi) else 0.5
        segment_rate = float(rates[idx]) if idx < len(rates) else 0.0
        
        # Calculate integrated risk score using thesis formula
        risk_score = calculate_integrated_risk_score(
            cause_probability=cause_prob,
            segment_rate=segment_rate,
            vehicle_type=vehicle_type,
            is_wet=is_wet
        )
        integrated_scores.append(risk_score)
    
    # Normalize to 0-1 for consistency with existing API
    normalized_scores = [score / 100.0 for score in integrated_scores]
    
    return normalized_scores, causes, rates


def get_feature_importance() -> Dict[str, float]:
    """
    Get feature importance from XGBoost model if available.
    Returns empty dict if model not loaded.
    """
    model = load_xgboost_model()
    
    if model == "dummy":
        return {}
    
    try:
        # XGBoost models have feature_importances_ attribute
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            # Get feature names from model if available
            if hasattr(model, 'get_booster'):
                feature_names = model.get_booster().feature_names
                if feature_names:
                    return dict(zip(feature_names, importances.tolist()))
            # Return as indexed features if names not available
            return {f"feature_{i}": float(imp) for i, imp in enumerate(importances)}
        return {}
    except Exception as e:
        print(f"[Error] Failed to get feature importance: {e}")
        return {}


def calculate_prediction_confidence(
    predictions: List[float],
    vehicle_type: str
) -> Dict[str, float]:
    """
    Calculate confidence metrics for predictions.
    
    Args:
        predictions: Raw model predictions (SPI values)
        vehicle_type: Vehicle type for threshold lookup
        
    Returns:
        Dict with confidence metrics
    """
    if predictions is None or len(predictions) == 0:
        return {"confidence": 0.0, "certainty": "low"}
    
    # Load thresholds
    thresholds = load_vehicle_thresholds()
    threshold = thresholds.get(vehicle_type, thresholds.get("__GLOBAL__", 0.5))
    
    # Calculate how far predictions are from threshold
    # More distance from threshold = higher confidence
    avg_pred = float(np.mean(predictions))
    distance_from_threshold = abs(avg_pred - threshold)
    
    # Normalize to 0-1 (max distance is 0.5 in either direction)
    confidence = min(1.0, distance_from_threshold * 2)
    
    # Calculate variance (low variance = higher confidence)
    if len(predictions) > 1:
        variance = float(np.var(predictions))
        consistency = max(0.0, 1.0 - variance * 10)  # Scale variance
    else:
        consistency = 1.0
    
    # Combined confidence score
    combined_confidence = (confidence * 0.6 + consistency * 0.4)
    
    # Determine certainty level (as numeric value: high=0.9, medium=0.5, low=0.2)
    if combined_confidence > 0.7:
        certainty = 0.9
    elif combined_confidence > 0.4:
        certainty = 0.5
    else:
        certainty = 0.2
    
    return {
        "confidence": round(combined_confidence, 3),
        "certainty": certainty,
        "distance_from_threshold": round(distance_from_threshold, 3),
        "consistency": round(consistency, 3),
        "avg_prediction": round(avg_pred, 3),
        "threshold": round(threshold, 3)
    }

