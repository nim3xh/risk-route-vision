# 🎨 Historical Model Integration - Visual Guide

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Historical Risk Engine                        │
│                  (Jupyter Notebook + Models)                     │
│                                                                   │
│  📊 Outputs:                                                     │
│  ├── metrics.json (model performance)                           │
│  ├── classification_metrics.json (detailed cause metrics)       │
│  └── risk_tiles.csv (311 high-risk segments)                    │
│                                                                   │
│  🤖 Models:                                                      │
│  ├── cause_classifier.joblib (Logistic Regression)              │
│  └── segment_gbr.joblib (HistGradientBoostingRegressor)         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI/Python)                       │
│                                                                   │
│  🔌 New Endpoints:                                               │
│  ├── GET /api/v1/models/historical/metrics                      │
│  │   └── Returns: Cause classifier + Segment GBR metrics        │
│  │                                                               │
│  └── GET /api/v1/models/historical/risk-tiles                   │
│      ├── ?limit=100 (default)                                   │
│      ├── ?vehicle=Car (filter by vehicle)                       │
│      └── ?min_risk=0.38 (filter by risk threshold)              │
│                                                                   │
│  🔧 Enhanced:                                                    │
│  └── GET /api/v1/models/info                                    │
│      └── Now includes historical_models section                 │
│                                                                   │
│  📜 Integration Script:                                          │
│  └── historical_model_integration.py                            │
│      ├── Load models                                            │
│      ├── Analyze performance                                    │
│      └── Identify patterns                                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Frontend (React/TypeScript)                    │
│                                                                   │
│  🎨 New Component: HistoricalModelInsights.tsx                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  📊 Cause Classifier Performance                          │  │
│  │  ├── Overall metrics (Accuracy, F1, Precision, Recall)    │  │
│  │  ├── Progress bars for visualization                      │  │
│  │  └── Per-class breakdown (4 classes)                      │  │
│  │                                                            │  │
│  │  📈 Segment GBR Performance                               │  │
│  │  ├── RMSE, MAE, R² metrics                                │  │
│  │  └── Card-based layout                                    │  │
│  │                                                            │  │
│  │  🗺️  High-Risk Segments (Top 10)                          │  │
│  │  ├── Location, time, vehicle details                      │  │
│  │  ├── SPI scores with color coding                         │  │
│  │  └── Speed-related incident indicators                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  📄 Dashboard Integration:                                       │
│  └── Dashboard.tsx                                               │
│      ├── Real-time model metrics                                │
│      ├── System health status                                   │
│      └── ✨ Historical Model Insights (NEW)                     │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
Historical Data → Models → Outputs → API → Frontend → User
     (CSV)      (joblib)   (JSON)   (REST)  (React)   (Visual)
```

## 🎯 Component Interaction

```
User Opens Dashboard
        ↓
Frontend loads
        ↓
HistoricalModelInsights component mounts
        ↓
┌───────────────────────────────────┐
│  Parallel API Calls:              │
│  1. /models/historical/metrics    │
│  2. /models/historical/risk-tiles │
└───────────────────────────────────┘
        ↓
Backend reads files:
├── metrics.json
├── classification_metrics.json
└── risk_tiles.csv
        ↓
Data processed & filtered
        ↓
JSON response sent to frontend
        ↓
Component renders:
├── Metrics cards
├── Progress bars
└── Risk segment list
        ↓
User sees beautiful insights! 🎉
```

## 📈 Example API Response Flow

### Request
```http
GET /api/v1/models/historical/metrics
```

### Backend Processing
```python
1. Load metrics.json
   ├── Extract cause_classifier metrics
   └── Extract segment_gbr metrics

2. Load classification_metrics.json
   └── Get detailed per-class metrics

3. Build response JSON
   ├── cause_classifier: {...}
   ├── segment_gbr: {...}
   └── available: true
```

### Response
```json
{
  "cause_classifier": {
    "accuracy": 0.9412,
    "f1_macro": 0.6839,
    "per_class": {
      "Excessive Speed": {
        "precision": 0.9524,
        "recall": 1.0,
        "f1-score": 0.9756,
        "support": 20
      }
      // ... more classes
    }
  },
  "segment_gbr": {
    "rmse": 0.0123,
    "mae": 0.0098,
    "r2": 0.8456
  },
  "available": true
}
```

### Frontend Rendering
```tsx
<Card> Cause Classifier
  ├── Accuracy: 94.1% [Progress Bar]
  ├── F1 Score: 68.4% [Progress Bar]
  └── Per-Class Metrics
      ├── Excessive Speed: 97.6% F1
      ├── Slipped: 96.0% F1
      ├── Mechanical Error: 80.0% F1
      └── Mechanical Failure: 0.0% F1
</Card>
```

## 🎨 UI Component Breakdown

```
Dashboard Page
└── HistoricalModelInsights Component
    ├── Loading State (spinning database icon)
    ├── Error State (yellow warning card)
    └── Success State
        ├── Cause Classifier Card
        │   ├── Header with icon
        │   ├── 4 metric columns (Accuracy, F1, Precision, Recall)
        │   │   ├── Number display
        │   │   └── Progress bar
        │   └── Per-class performance grid
        │       └── 4 glass-panel boxes (one per class)
        │           ├── Class name + sample count badge
        │           └── 3-column metrics (Precision, Recall, F1)
        │
        ├── Segment GBR Card
        │   ├── Header with icon
        │   └── 3 metric panels (RMSE, MAE, R²)
        │       └── Large number + description
        │
        └── High-Risk Segments Card
            ├── Header with icon
            └── 10 segment items
                ├── SPI badge (color-coded)
                ├── Vehicle name
                ├── Incident count
                └── 4 detail columns
                    ├── Location (lat, lon)
                    ├── Hour
                    ├── Day of week
                    └── Wet/Dry condition
```

## 🔄 Integration Testing Flow

```
Test Script Starts
        ↓
Wait for Backend (max 10 retries)
        ↓
┌────────────────────────┐
│  Test 1: Models Info   │
│  GET /models/info      │
│  ✅ Check historical   │
│     models present     │
└────────────────────────┘
        ↓
┌────────────────────────┐
│  Test 2: Metrics       │
│  GET /historical/      │
│       metrics          │
│  ✅ Verify structure   │
│  ✅ Check accuracy %   │
└────────────────────────┘
        ↓
┌────────────────────────┐
│  Test 3: Risk Tiles    │
│  GET /historical/      │
│       risk-tiles       │
│  ✅ Basic query        │
│  ✅ Vehicle filter     │
│  ✅ Risk filter        │
│  ✅ Verify threshold   │
└────────────────────────┘
        ↓
Generate Test Report
        ↓
✅ 3/3 Tests Passed!
```

## 📱 User Journey

```
1. User starts application
   └── .\start-both.ps1

2. Backend loads models
   ├── XGBoost real-time model
   ├── Cause classifier
   └── Segment GBR

3. Frontend loads
   └── React app on :5173

4. User navigates to Dashboard
   └── http://localhost:5173/dashboard

5. Page loads components
   ├── System health
   ├── Real-time metrics
   └── ⭐ Historical insights (NEW)

6. User sees:
   ├── "Cause Classifier achieved 94.1% accuracy"
   ├── "Per-class performance breakdown"
   ├── "Segment GBR regression metrics"
   └── "Top 10 high-risk locations"

7. User insights gained:
   ├── "Excessive Speed: 97.6% F1-score (best)"
   ├── "Slipped: 96.0% F1-score (excellent)"
   ├── "Mechanical Error: 80.0% F1-score (good)"
   ├── "Location 6.977,80.504 has highest risk"
   └── "Bus incidents often speed-related"
```

## 🎯 Key Visual Elements

### Color Coding
- 🟢 **Green**: High accuracy (>90%), successful metrics
- 🟡 **Yellow**: Medium performance (70-90%), warnings
- 🔴 **Red**: Low performance (<70%), high-risk indicators
- 🔵 **Blue/Primary**: Neutral information, primary actions

### Badge System
- **Destructive (Red)**: High SPI risk scores (>0.38)
- **Secondary**: Vehicle types, sample counts
- **Outline**: Model types, feature names

### Layout Strategy
- **Glass panels**: Semi-transparent cards for modern look
- **Grid layouts**: Responsive 2-4 column grids
- **Progress bars**: Visual representation of percentages
- **Icon headers**: Easy visual identification

## 📊 Metrics At a Glance

```
┌─────────────────────────┐
│  Cause Classifier       │
│  Accuracy: 94.1% ████   │
│  F1 Score: 68.4% ███    │
│  Precision: 65.5% ██    │
│  Recall: 73.1% ███      │
└─────────────────────────┘

┌─────────────────────────┐
│  Segment GBR            │
│  RMSE: 0.0123           │
│  MAE: 0.0098            │
│  R²: 84.6%              │
└─────────────────────────┘

┌─────────────────────────┐
│  Risk Tiles             │
│  Total: 311 segments    │
│  High-risk: 135 (>0.38) │
│  Top SPI: 0.4257        │
└─────────────────────────┘
```

---

**Visual Style**: Modern, clean, glass-morphism design  
**Color Scheme**: Dark mode with accent colors  
**Icons**: Lucide React icon library  
**Animations**: Smooth transitions, loading states  
**Responsive**: Mobile-friendly layouts  

✨ **Beautiful, Informative, Professional!**
