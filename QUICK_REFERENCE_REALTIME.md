# 🚀 Quick Reference - Realtime Model Integration

## ⚡ Fast Access

### View in Browser
```
Dashboard: http://localhost:5173/dashboard
API Docs:  http://localhost:8080/docs
```

### Start Application
```powershell
.\start-both.ps1
```

### Test Integration
```powershell
cd back-end
python test_realtime_integration.py
```

## 📡 API Endpoints

### Get Realtime Metrics
```bash
curl http://localhost:8080/api/v1/models/realtime/metrics
```

### Get Feature Importance (Top 10)
```bash
curl http://localhost:8080/api/v1/models/realtime/feature-importance?limit=10
```

### Get All Predictions (Limit 20)
```bash
curl http://localhost:8080/api/v1/models/realtime/predictions?limit=20
```

### Get Motor Cycle Predictions
```bash
curl "http://localhost:8080/api/v1/models/realtime/predictions?vehicle=Motor%20Cycle"
```

### Get Only Misclassified Predictions
```bash
curl "http://localhost:8080/api/v1/models/realtime/predictions?show_errors_only=true&limit=15"
```

### Get Top 5 Features
```bash
curl "http://localhost:8080/api/v1/models/realtime/feature-importance?limit=5"
```

## 🐍 Python Usage

### Load Metrics
```python
from back_end.realtime_model_integration import load_realtime_metrics

metrics = load_realtime_metrics()
r2_score = metrics['regression']['test_metrics']['r2']
print(f"R² Score: {r2_score:.1%}")
```

### Load Feature Importance
```python
from back_end.realtime_model_integration import load_feature_importance

features = load_feature_importance()
top_feature = features.iloc[0]
print(f"Top: {top_feature['feature']} ({top_feature['importance']:.1%})")
```

### Load Predictions
```python
from back_end.realtime_model_integration import load_predictions

predictions = load_predictions()
accuracy = (predictions['is_high_true'] == predictions['is_high_pred']).mean()
print(f"Accuracy: {accuracy:.1%}")
```

### Analyze Vehicle Performance
```python
predictions = load_predictions()
vehicle_acc = predictions.groupby('Vehicle').apply(
    lambda x: (x['is_high_true'] == x['is_high_pred']).mean()
)
print(vehicle_acc.sort_values(ascending=False))
```

## 📊 Key Metrics

### XGBoost Regression
- ✅ **R² Score**: 65.2%
- ✅ **MAE**: 0.0098
- ✅ **RMSE**: 0.015
- 📝 **Dataset**: 252 train / 63 test

### Classification
- ✅ **Accuracy**: 76.2%
- ✅ **Precision**: 90.0%
- ✅ **Recall**: 76.6%
- ✅ **F1 Score**: 82.8%

### Top 3 Features
1. **is_speed_reason**: 78.32% 🌟
2. **Reason_Excessive Speed**: 16.23%
3. **description_hash_338**: 0.54%

## 🎨 Frontend Component

### Dashboard Location
```
Dashboard Page → Middle Section → Realtime Model Insights
```

### Component Features
1. XGBoost Regression Performance (R², MAE, RMSE)
2. Classification Metrics (Accuracy, P, R, F1)
3. Top 6 Vehicle Performance (sorted by F1)
4. Top 10 Feature Importance (visual bars)

## 📁 File Locations

### Backend
```
back-end/
├── app/routers/models.py                (API endpoints)
├── realtime_model_integration.py        (Integration script)
├── test_realtime_integration.py         (Test suite)
└── models/realtime_risk_pipeline/
    ├── outputs/
    │   ├── metrics.json
    │   ├── classification_metrics.json
    │   ├── vehicle_thresholds.csv
    │   ├── top_features.csv
    │   └── predictions.csv
    └── README.md
```

### Frontend
```
front-end/
└── src/
    ├── components/RealtimeModelInsights.tsx  (New component)
    └── pages/Dashboard.tsx                   (Updated)
```

### Documentation
```
INTEGRATION_COMPLETE_REALTIME.md    (Summary & status)
QUICK_REFERENCE_REALTIME.md         (This file)
back-end/models/realtime_risk_pipeline/README.md
```

## ✅ Verification Checklist

Run this quick check:

```powershell
# 1. Backend running?
curl http://localhost:8080/api/v1/models/health

# 2. Realtime metrics available?
curl http://localhost:8080/api/v1/models/realtime/metrics

# 3. Feature importance working?
curl "http://localhost:8080/api/v1/models/realtime/feature-importance?limit=5"

# 4. Predictions working?
curl "http://localhost:8080/api/v1/models/realtime/predictions?limit=10"

# 5. Run full test suite
cd back-end
python test_realtime_integration.py
```

Expected: ✅ All requests return 200 OK, test suite shows 4/4 passed

## 🎯 Common Queries

### Get Top 5 Most Important Features
```bash
curl "http://localhost:8080/api/v1/models/realtime/feature-importance?limit=5"
```

### Get All Bus Predictions
```bash
curl "http://localhost:8080/api/v1/models/realtime/predictions?vehicle=Bus&limit=50"
```

### Find Largest Prediction Errors (Python)
```python
predictions = load_predictions()
predictions['abs_error'] = predictions['residual'].abs()
worst = predictions.nlargest(5, 'abs_error')
print(worst[['Vehicle', 'SPI_true', 'SPI_pred', 'abs_error']])
```

### Analyze Speed Feature Impact (Python)
```python
features = load_feature_importance()
speed_features = features[features['feature'].str.contains('speed', case=False)]
total_speed_impact = speed_features['importance'].sum()
print(f"Speed features: {total_speed_impact:.1%} of total importance")
```

## 🔧 Troubleshooting

### Backend Not Responding
```powershell
# Restart backend
cd back-end
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Frontend Not Showing Data
1. Check browser console (F12)
2. Verify backend is running on port 8080
3. Check CORS settings

### Metrics Not Loading
1. Verify JSON files exist in `back-end/models/realtime_risk_pipeline/outputs/`
2. Check file permissions
3. Review backend startup logs

### Test Failures
```powershell
# Re-run with verbose output
cd back-end
python -v test_realtime_integration.py
```

## 📚 Documentation Links

- **Model README**: [back-end/models/realtime_risk_pipeline/README.md](back-end/models/realtime_risk_pipeline/README.md)
- **Integration Status**: [INTEGRATION_COMPLETE_REALTIME.md](INTEGRATION_COMPLETE_REALTIME.md)
- **Historical Integration**: [INTEGRATION_COMPLETE_HISTORICAL.md](INTEGRATION_COMPLETE_HISTORICAL.md)
- **API Docs**: http://localhost:8080/docs (when backend running)

## 🎉 Success Indicators

✅ Backend serving 3 new endpoints  
✅ Frontend displaying 4 insight sections  
✅ Test suite: 4/4 passing  
✅ R² score: 65.2%  
✅ F1 score: 82.8%  
✅ Documentation complete  

---

**Status**: ✅ FULLY INTEGRATED  
**Last Updated**: January 1, 2026  
**Version**: 1.0  
**Performance**: R²=65.2%, F1=82.8%  

Need help? Check the comprehensive documentation listed above! 🚀
