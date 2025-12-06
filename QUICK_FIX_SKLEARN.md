# Quick Fix Guide - Sklearn Version Mismatch 🔧

## The Problem

Your model was trained with an **older version of scikit-learn**, but your backend environment has **scikit-learn 1.7.2**. The model pickle file contains references to internal sklearn classes (`_RemainderColsList`) that don't exist in the newer version.

**Error:**
```
Can't get attribute '_RemainderColsList' on <module 'sklearn.compose._column_transformer'>
```

---

## The Solution - Retrain in Colab

### Step 1: Open Your Notebook

Open `XG_BOOST_NEWER.ipynb` in Google Colab

### Step 2: Add Version Match Code

**At the very top** of your notebook (first cell), add:

```python
# Install matching versions to backend
!pip install scikit-learn==1.7.2
!pip install xgboost>=1.7.0
!pip install pandas>=2.0.0
!pip install numpy>=1.24.0
!pip install joblib>=1.3.0

# Verify versions
import sklearn
import xgboost
print(f"scikit-learn: {sklearn.__version__}")
print(f"xgboost: {xgboost.__version__}")
```

### Step 3: Run All Cells

Click **Runtime → Run all** to retrain the model with the correct versions.

### Step 4: Download New Model Files

After training completes, download:
- `/content/models/xgb_vehicle_specific_risk.pkl`
- `/content/outputs/vehicle_thresholds.csv`

### Step 5: Replace Files

Replace the files in your backend:
```
back-end/models/xgb_vehicle_specific_risk.pkl
back-end/models/vehicle_thresholds.csv
```

### Step 6: Test

```powershell
cd back-end
.\.venv\Scripts\python.exe test_model_loading.py
```

You should now see:
```
✅ Model loaded successfully!
Model type: <class 'sklearn.pipeline.Pipeline'>  # or XGBRegressor
✅ Thresholds loaded for 7 vehicles
✅ Prediction successful!
Scores: [0.45, 0.48, ...]
Average risk score: 0.465
```

---

## Alternative: Quick Downgrade (Not Recommended)

If you need immediate results and can't retrain:

```powershell
cd back-end
.\.venv\Scripts\Activate.ps1
pip install scikit-learn==1.3.2
```

**⚠️ Warning:** This may cause other issues and is not a long-term solution.

---

## Why This Happened

- Pickle files in Python save the **exact state** of objects
- sklearn's internal classes changed between versions
- `_RemainderColsList` was renamed/removed in sklearn 1.4+
- The safest fix is always to retrain with matching versions

---

## After Fix - Start Backend

Once model loads successfully:

```powershell
cd ..
.\start-backend.ps1
```

Check console for:
```
[Info] Loaded XGBoost model from ...xgb_vehicle_specific_risk.pkl
[Info] Loaded vehicle thresholds for 7 vehicles
INFO: Application startup complete.
```

Then test the API:
```powershell
curl -X POST "http://localhost:8080/api/v1/risk/score" `
  -H "Content-Type: application/json" `
  -d '{
    "route": {"type": "LineString", "coordinates": [[79.8612, 6.9271], [79.8620, 6.9280]]},
    "vehicle": "MOTORCYCLE"
  }'
```

Expected response with **real XGBoost predictions**:
```json
{
  "overall_score": 0.68,
  "segment_scores": [0.68],
  "cause": "Medium risk: Moderate weather conditions and road curvature. Exercise caution."
}
```

---

## Summary

1. ✅ Install sklearn 1.7.2 in Colab
2. ✅ Retrain model (10-15 min)
3. ✅ Download new .pkl and .csv files
4. ✅ Replace in back-end/models/
5. ✅ Test with test_model_loading.py
6. ✅ Start backend and enjoy real XGBoost predictions! 🎉

---

**Time Required:** 10-15 minutes to retrain + download

**Benefit:** Full compatibility, production-ready model, accurate risk predictions

**Your ML integration is 95% complete - just this one quick fix!** 🚀
