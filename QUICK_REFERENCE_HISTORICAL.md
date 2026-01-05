# 🚀 Quick Reference - Historical Model Integration

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
python test_historical_integration.py
```

## 📡 API Endpoints

### Get Historical Metrics
```bash
curl http://localhost:8080/api/v1/models/historical/metrics
```

### Get Risk Tiles (Basic)
```bash
curl http://localhost:8080/api/v1/models/historical/risk-tiles?limit=10
```

### Get High-Risk Segments (SPI ≥ 0.38)
```bash
curl "http://localhost:8080/api/v1/models/historical/risk-tiles?min_risk=0.38"
```

### Filter by Vehicle
```bash
curl "http://localhost:8080/api/v1/models/historical/risk-tiles?vehicle=Bus"
```

### Combine Filters
```bash
curl "http://localhost:8080/api/v1/models/historical/risk-tiles?vehicle=Car&min_risk=0.40&limit=5"
```

## 🐍 Python Usage

### Load Models
```python
from back_end.historical_model_integration import load_historical_models

models = load_historical_models()
cause_classifier = models['cause_classifier']
segment_gbr = models['segment_gbr']
```

### Load Risk Tiles
```python
from back_end.historical_model_integration import load_risk_tiles

risk_tiles = load_risk_tiles()
high_risk = risk_tiles[risk_tiles['SPI_tile'] >= 0.38]
```

### Analyze by Vehicle
```python
bus_tiles = risk_tiles[risk_tiles['Vehicle'].str.contains('Bus')]
avg_bus_risk = bus_tiles['SPI_tile'].mean()
print(f"Average Bus Risk: {avg_bus_risk:.4f}")
```

## 📊 Key Metrics

### Cause Classifier
- ✅ **Accuracy**: 94.1%
- ✅ **F1 Score**: 68.4%
- 📝 **Classes**: Excessive Speed, Slipped, Mechanical Error, Mechanical Failure

### Risk Tiles Dataset
- 📍 **Total Segments**: 311
- 🚨 **High-Risk (≥0.38)**: ~135 segments
- 🚗 **Vehicles**: Bus, Car, Motor Cycle, Three Wheeler, Van, Lorry
- 🕐 **Coverage**: All hours, all days, wet & dry

## 🎨 Frontend Components

### Dashboard Location
```
Dashboard Page → Bottom Section → Historical Model Insights
```

### Component Features
1. Cause Classifier Performance (with per-class breakdown)
2. Segment GBR Metrics (RMSE, MAE, R²)
3. Top 10 High-Risk Segments (interactive list)

## 📁 File Locations

### Backend
```
back-end/
├── app/routers/models.py              (API endpoints)
├── historical_model_integration.py    (Integration script)
├── test_historical_integration.py     (Test suite)
└── models/historical_risk_engine/
    ├── models/
    │   ├── cause_classifier.joblib
    │   └── segment_gbr.joblib
    └── outputs/
        ├── metrics.json
        ├── classification_metrics.json
        └── risk_tiles.csv
```

### Frontend
```
front-end/
└── src/
    ├── components/HistoricalModelInsights.tsx  (New component)
    └── pages/Dashboard.tsx                     (Updated)
```

### Documentation
```
HISTORICAL_MODEL_INTEGRATION.md      (Comprehensive guide)
INTEGRATION_COMPLETE_HISTORICAL.md   (Summary & status)
INTEGRATION_VISUAL_GUIDE.md          (Architecture diagrams)
QUICK_REFERENCE_HISTORICAL.md        (This file)
```

## ✅ Verification Checklist

Run this quick check:

```powershell
# 1. Backend running?
curl http://localhost:8080/api/v1/models/health

# 2. Historical metrics available?
curl http://localhost:8080/api/v1/models/historical/metrics

# 3. Risk tiles working?
curl "http://localhost:8080/api/v1/models/historical/risk-tiles?limit=5"

# 4. Run full test suite
cd back-end
python test_historical_integration.py
```

Expected: ✅ All requests return 200 OK, test suite shows 3/3 passed

## 🎯 Common Queries

### Get Top 10 Riskiest Segments
```bash
curl "http://localhost:8080/api/v1/models/historical/risk-tiles?min_risk=0.40&limit=10"
```

### Get All Motor Cycle Risk Data
```bash
curl "http://localhost:8080/api/v1/models/historical/risk-tiles?vehicle=Motor%20Cycle&limit=100"
```

### Get Wet Condition Incidents (Python)
```python
risk_tiles = load_risk_tiles()
wet_incidents = risk_tiles[risk_tiles['is_wet'] == 1]
print(f"Wet incidents: {len(wet_incidents)}")
print(f"Avg wet risk: {wet_incidents['SPI_tile'].mean():.4f}")
```

### Get Peak Hour Analysis (Python)
```python
peak_hours = risk_tiles.groupby('hour')['SPI_tile'].mean()
print(peak_hours.sort_values(ascending=False).head(5))
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

### Models Not Loading
1. Verify `.joblib` files exist in `back-end/models/historical_risk_engine/models/`
2. Check `pip install scikit-learn joblib pandas`
3. Review backend startup logs

### Test Failures
```powershell
# Re-run with verbose output
cd back-end
python -v test_historical_integration.py
```

## 📚 Documentation Links

- **Full Guide**: [HISTORICAL_MODEL_INTEGRATION.md](HISTORICAL_MODEL_INTEGRATION.md)
- **Visual Guide**: [INTEGRATION_VISUAL_GUIDE.md](INTEGRATION_VISUAL_GUIDE.md)
- **Status Report**: [INTEGRATION_COMPLETE_HISTORICAL.md](INTEGRATION_COMPLETE_HISTORICAL.md)
- **API Docs**: http://localhost:8080/docs (when backend running)

## 🎉 Success Indicators

✅ Backend serving 2 new endpoints  
✅ Frontend displaying 3 insight sections  
✅ Test suite: 3/3 passing  
✅ 311 risk tiles accessible  
✅ Cause classifier: 94.1% accurate  
✅ Documentation complete  

---

**Status**: ✅ FULLY INTEGRATED  
**Last Updated**: January 1, 2026  
**Version**: 1.0  

Need help? Check the comprehensive guides listed above! 🚀
