"""
Router for model information and metrics.
Provides endpoints to get model metadata, performance metrics, and health status.
"""
from fastapi import APIRouter, Query
from typing import Dict, Any
import os
import json

router = APIRouter(prefix="/api/v1/models", tags=["models"])

@router.get("/info")
async def get_model_info() -> Dict[str, Any]:
    """
    Get information about loaded models including version, type, and features.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
    
    # Check which models are available
    xgb_model_path = os.path.join(models_dir, "xgb_vehicle_specific_risk.pkl")
    cause_classifier_path = os.path.join(models_dir, "cause_classifier.joblib")
    segment_gbr_path = os.path.join(models_dir, "segment_gbr.joblib")
    thresholds_path = os.path.join(models_dir, "vehicle_thresholds.csv")
    
    return {
        "realtime_model": {
            "name": "XGBoost Vehicle-Specific Risk Predictor",
            "type": "XGBRegressor",
            "status": "loaded" if os.path.exists(xgb_model_path) else "not_found",
            "file": "xgb_vehicle_specific_risk.pkl",
            "size_kb": round(os.path.getsize(xgb_model_path) / 1024, 2) if os.path.exists(xgb_model_path) else 0,
            "features": [
                "curvature",
                "temperature",
                "humidity",
                "precipitation",
                "wind_speed",
                "is_wet",
                "vehicle_type",
                "hour_of_day",
                "location_features"
            ],
            "vehicle_types": ["MOTORCYCLE", "THREE_WHEELER", "CAR", "BUS", "LORRY", "VAN"],
            "description": "Real-time risk prediction using XGBoost with per-vehicle thresholds"
        },
        "historical_models": {
            "cause_classifier": {
                "name": "Accident Cause Classifier",
                "type": "LogisticRegression",
                "status": "loaded" if os.path.exists(cause_classifier_path) else "not_found",
                "file": "cause_classifier.joblib",
                "size_kb": round(os.path.getsize(cause_classifier_path) / 1024, 2) if os.path.exists(cause_classifier_path) else 0,
                "classes": ["Excessive Speed", "Slipped", "Mechanical Error", "Mechanical Failure"],
                "description": "Predicts most likely accident cause based on conditions"
            },
            "segment_gbr": {
                "name": "Segment Risk Severity Model",
                "type": "HistGradientBoostingRegressor",
                "status": "loaded" if os.path.exists(segment_gbr_path) else "not_found",
                "file": "segment_gbr.joblib",
                "size_kb": round(os.path.getsize(segment_gbr_path) / 1024, 2) if os.path.exists(segment_gbr_path) else 0,
                "description": "Predicts accident severity index from historical data"
            }
        },
        "thresholds": {
            "status": "loaded" if os.path.exists(thresholds_path) else "not_found",
            "file": "vehicle_thresholds.csv",
            "size_bytes": os.path.getsize(thresholds_path) if os.path.exists(thresholds_path) else 0,
            "description": "Vehicle-specific risk classification thresholds"
        }
    }


@router.get("/metrics")
async def get_model_metrics() -> Dict[str, Any]:
    """
    Get model performance metrics from training/validation.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
    
    # Load realtime model metrics
    realtime_metrics_path = os.path.join(models_dir, "realtime_risk_pipeline", "outputs", "metrics.json")
    realtime_metrics = {}
    if os.path.exists(realtime_metrics_path):
        with open(realtime_metrics_path, 'r') as f:
            realtime_metrics = json.load(f)
    
    # Load historical model metrics
    historical_metrics_path = os.path.join(models_dir, "historical_risk_engine", "outputs", "metrics.json")
    historical_metrics = {}
    if os.path.exists(historical_metrics_path):
        with open(historical_metrics_path, 'r') as f:
            historical_metrics = json.load(f)
    
    # Load vehicle-specific metrics
    vehicle_metrics_path = os.path.join(models_dir, "realtime_risk_pipeline", "outputs", "classification_metrics_per_vehicle.json")
    vehicle_metrics = {}
    if os.path.exists(vehicle_metrics_path):
        with open(vehicle_metrics_path, 'r') as f:
            vehicle_metrics = json.load(f)
    
    return {
        "realtime_model": {
            "regression_metrics": realtime_metrics.get("test_metrics", {}),
            "dataset_info": {
                "n_train": realtime_metrics.get("n_train", 0),
                "n_test": realtime_metrics.get("n_test", 0),
                "target": realtime_metrics.get("target", "SPI_smoothed")
            },
            "tuned": realtime_metrics.get("tuned", False),
            "model": realtime_metrics.get("model", "XGBRegressor")
        },
        "vehicle_specific_performance": vehicle_metrics,
        "historical_model": {
            "cause_classifier": historical_metrics.get("cause_classifier", {}),
            "segment_gbr": {
                "rmse": historical_metrics.get("segment_gbr_rmse", 0)
            }
        },
        "summary": {
            "realtime_r2": realtime_metrics.get("test_metrics", {}).get("r2", 0),
            "realtime_rmse": realtime_metrics.get("test_metrics", {}).get("rmse", 0),
            "cause_accuracy": historical_metrics.get("cause_classifier", {}).get("accuracy", 0),
            "cause_f1_macro": historical_metrics.get("cause_classifier", {}).get("f1_macro", 0)
        }
    }


@router.get("/health")
async def get_model_health() -> Dict[str, Any]:
    """
    Get current health status of all models and dependencies.
    """
    from ..ml.model import _XGB_MODEL, _CAUSE_MODEL, _RATE_MODEL, _VEHICLE_THRESHOLDS
    
    return {
        "status": "healthy",
        "models": {
            "xgboost_realtime": {
                "loaded": _XGB_MODEL is not None,
                "status": "ready" if _XGB_MODEL is not None else "fallback_mode"
            },
            "cause_classifier": {
                "loaded": _CAUSE_MODEL is not None,
                "status": "ready" if _CAUSE_MODEL is not None else "not_loaded"
            },
            "rate_model": {
                "loaded": _RATE_MODEL is not None,
                "status": "ready" if _RATE_MODEL is not None else "not_loaded"
            },
            "vehicle_thresholds": {
                "loaded": _VEHICLE_THRESHOLDS is not None,
                "count": len(_VEHICLE_THRESHOLDS) if _VEHICLE_THRESHOLDS else 0,
                "status": "ready" if _VEHICLE_THRESHOLDS else "not_loaded"
            }
        },
        "prediction_mode": "xgboost" if _XGB_MODEL is not None else "fallback",
        "timestamp": None  # Will be added by middleware
    }


@router.get("/historical/metrics")
async def get_historical_metrics() -> Dict[str, Any]:
    """
    Get detailed metrics for historical risk engine models.
    Returns classification and regression metrics from the historical_risk_engine.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
    metrics_path = os.path.join(models_dir, "historical_risk_engine", "outputs", "metrics.json")
    classification_path = os.path.join(models_dir, "historical_risk_engine", "outputs", "classification_metrics.json")
    
    result = {
        "cause_classifier": {},
        "segment_gbr": {},
        "available": False
    }
    
    # Load main metrics file
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
            result["cause_classifier"] = metrics.get("cause_classifier", {})
            result["segment_gbr"] = {
                "rmse": metrics.get("segment_gbr_rmse", 0),
                "mae": metrics.get("segment_gbr_mae", 0),
                "r2": metrics.get("segment_gbr_r2", 0)
            }
            result["available"] = True
    
    # Load classification metrics (more detailed)
    if os.path.exists(classification_path):
        with open(classification_path, 'r') as f:
            classification_metrics = json.load(f)
            result["cause_classifier_detailed"] = classification_metrics
    
    return result


@router.get("/historical/risk-tiles")
async def get_risk_tiles(
    limit: int = Query(100, ge=1, le=1000, description="Number of tiles to return"),
    vehicle: str = Query(None, description="Filter by vehicle type"),
    min_risk: float = Query(None, ge=0, le=1, description="Minimum SPI_tile value")
) -> Dict[str, Any]:
    """
    Get historical risk tiles data from the historical_risk_engine.
    Returns segment-level risk data with location, time, and vehicle information.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
    risk_tiles_path = os.path.join(models_dir, "historical_risk_engine", "outputs", "risk_tiles.csv")
    
    if not os.path.exists(risk_tiles_path):
        return {
            "error": "Risk tiles data not found",
            "tiles": [],
            "total": 0
        }
    
    try:
        # Read CSV file
        import pandas as pd
        df = pd.read_csv(risk_tiles_path)
        
        # Apply filters
        if vehicle:
            df = df[df['Vehicle'].str.contains(vehicle, case=False, na=False)]
        
        if min_risk is not None:
            df = df[df['SPI_tile'] >= min_risk]
        
        # Sort by risk score descending
        df = df.sort_values('SPI_tile', ascending=False)
        
        # Limit results
        df = df.head(limit)
        
        # Convert to dict format
        tiles = df.to_dict('records')
        
        return {
            "tiles": tiles,
            "total": len(tiles),
            "filters": {
                "vehicle": vehicle,
                "min_risk": min_risk,
                "limit": limit
            }
        }
    except Exception as e:
        return {
            "error": f"Error reading risk tiles: {str(e)}",
            "tiles": [],
            "total": 0
        }


@router.get("/realtime/metrics")
async def get_realtime_metrics() -> Dict[str, Any]:
    """
    Get detailed metrics for realtime XGBoost risk prediction model.
    Returns regression metrics, classification performance, and vehicle-specific thresholds.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
    metrics_path = os.path.join(models_dir, "realtime_risk_pipeline", "outputs", "metrics.json")
    classification_path = os.path.join(models_dir, "realtime_risk_pipeline", "outputs", "classification_metrics.json")
    vehicle_metrics_path = os.path.join(models_dir, "realtime_risk_pipeline", "outputs", "classification_metrics_per_vehicle.json")
    
    result = {
        "regression_metrics": {},
        "classification_metrics": {},
        "vehicle_specific": [],
        "available": False
    }
    
    # Load main metrics file
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
            result["regression_metrics"] = {
                "r2": metrics.get("test_metrics", {}).get("r2", 0),
                "mae": metrics.get("test_metrics", {}).get("mae", 0),
                "rmse": metrics.get("test_metrics", {}).get("rmse", 0),
                "n_train": metrics.get("n_train", 0),
                "n_test": metrics.get("n_test", 0),
                "model": metrics.get("model", "XGBRegressor"),
                "tuned": metrics.get("tuned", False)
            }
            result["available"] = True
    
    # Load classification metrics
    if os.path.exists(classification_path):
        with open(classification_path, 'r') as f:
            classification = json.load(f)
            result["classification_metrics"] = classification
    
    # Load per-vehicle metrics
    if os.path.exists(vehicle_metrics_path):
        with open(vehicle_metrics_path, 'r') as f:
            result["vehicle_specific"] = json.load(f)
    
    return result


@router.get("/realtime/feature-importance")
async def get_feature_importance(
    limit: int = Query(15, ge=1, le=50, description="Number of top features to return")
) -> Dict[str, Any]:
    """
    Get top feature importance values from the realtime XGBoost model.
    Shows which features contribute most to risk predictions.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
    features_path = os.path.join(models_dir, "realtime_risk_pipeline", "outputs", "top_features.csv")
    
    if not os.path.exists(features_path):
        return {
            "error": "Feature importance data not found",
            "features": [],
            "total": 0
        }
    
    try:
        import pandas as pd
        df = pd.read_csv(features_path)
        
        # Limit results
        df = df.head(limit)
        
        # Convert to dict format
        features = df.to_dict('records')
        
        return {
            "features": features,
            "total": len(features),
            "limit": limit
        }
    except Exception as e:
        return {
            "error": f"Error reading feature importance: {str(e)}",
            "features": [],
            "total": 0
        }


@router.get("/realtime/predictions")
async def get_realtime_predictions(
    limit: int = Query(20, ge=1, le=100, description="Number of predictions to return"),
    vehicle: str = Query(None, description="Filter by vehicle type"),
    show_errors_only: bool = Query(False, description="Show only incorrect predictions")
) -> Dict[str, Any]:
    """
    Get sample predictions from the realtime model test set.
    Shows true vs predicted SPI values and classification accuracy.
    """
    models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
    predictions_path = os.path.join(models_dir, "realtime_risk_pipeline", "outputs", "predictions.csv")
    
    if not os.path.exists(predictions_path):
        return {
            "error": "Predictions data not found",
            "predictions": [],
            "total": 0
        }
    
    try:
        import pandas as pd
        df = pd.read_csv(predictions_path)
        
        # Apply filters
        if vehicle:
            df = df[df['Vehicle'].str.contains(vehicle, case=False, na=False)]
        
        if show_errors_only:
            # Show only misclassified predictions
            df = df[df['is_high_true'] != df['is_high_pred']]
        
        # Sort by absolute residual (largest errors first)
        df['abs_residual'] = df['residual'].abs()
        df = df.sort_values('abs_residual', ascending=False)
        
        # Limit results
        df = df.head(limit)
        
        # Drop temporary column
        df = df.drop('abs_residual', axis=1)
        
        # Convert to dict format
        predictions = df.to_dict('records')
        
        # Calculate summary stats
        correct_predictions = len(df[df['is_high_true'] == df['is_high_pred']])
        total_predictions = len(df)
        accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
        
        return {
            "predictions": predictions,
            "total": len(predictions),
            "summary": {
                "accuracy": accuracy,
                "correct": correct_predictions,
                "incorrect": total_predictions - correct_predictions,
                "mean_absolute_error": df['residual'].abs().mean() if len(df) > 0 else 0
            },
            "filters": {
                "vehicle": vehicle,
                "show_errors_only": show_errors_only,
                "limit": limit
            }
        }
    except Exception as e:
        return {
            "error": f"Error reading predictions: {str(e)}",
            "predictions": [],
            "total": 0
        }
