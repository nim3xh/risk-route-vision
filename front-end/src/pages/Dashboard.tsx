import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Server, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { config } from "@/lib/config";
import { HistoricalModelInsights } from "@/components/HistoricalModelInsights";
import { RealtimeModelInsights } from "@/components/RealtimeModelInsights";
import { WeatherDisplay } from "@/components/WeatherDisplay";

interface ModelInfo {
  realtime_model: {
    name: string;
    type: string;
    status: string;
    features: string[];
    vehicle_types: string[];
  };
  historical_models: {
    cause_classifier: {
      name: string;
      type: string;
      status: string;
      classes: string[];
    };
    segment_gbr: {
      name: string;
      type: string;
      status: string;
    };
  };
}

interface ModelMetrics {
  realtime_model: {
    regression_metrics: {
      r2: number;
      mae: number;
      rmse: number;
    };
    dataset_info: {
      n_train: number;
      n_test: number;
    };
  };
  historical_model: {
    cause_classifier: {
      accuracy: number;
      f1_macro: number;
    };
  };
  summary: {
    realtime_r2: number;
    realtime_rmse: number;
    cause_accuracy: number;
    cause_f1_macro: number;
  };
}

interface ModelHealth {
  status: string;
  models: {
    xgboost_realtime: { loaded: boolean; status: string };
    cause_classifier: { loaded: boolean; status: string };
    vehicle_thresholds: { loaded: boolean; count: number; status: string };
  };
  prediction_mode: string;
}

export default function Dashboard() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // config.apiBase is already "http://localhost:8080/api/v1" from .env
      const baseUrl = config.apiBase || "http://localhost:8080/api/v1";
      const [infoRes, metricsRes, healthRes] = await Promise.all([
        fetch(`${baseUrl}/models/info`),
        fetch(`${baseUrl}/models/metrics`),
        fetch(`${baseUrl}/models/health`),
      ]);

      if (!infoRes.ok || !metricsRes.ok || !healthRes.ok) {
        throw new Error(`Failed to fetch dashboard data: Info=${infoRes.status}, Metrics=${metricsRes.status}, Health=${healthRes.status}`);
      }

      const [info, metrics, health] = await Promise.all([
        infoRes.json(),
        metricsRes.json(),
        healthRes.json(),
      ]);

      setModelInfo(info);
      setModelMetrics(metrics);
      setModelHealth(health);
      setError(null);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err instanceof Error ? err.message : "Failed to load data. Make sure the backend is running on port 8080.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-panel px-8 py-6 rounded-3xl flex items-center gap-4 animate-pulse">
          <Activity className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg font-bold">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md w-full border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === "loaded" || status === "ready" || status === "healthy") return "text-green-500";
    if (status === "fallback_mode") return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusBadge = (status: string) => {
    if (status === "loaded" || status === "ready" || status === "healthy") {
      return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Active</Badge>;
    }
    if (status === "fallback_mode") {
      return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Fallback</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Offline</Badge>;
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-panel p-6 rounded-3xl border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-gradient mb-2">System Dashboard</h1>
              <p className="text-muted-foreground">Real-time model performance and health monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              {modelHealth && (
                <div className="flex items-center gap-2">
                  <Server className={`h-6 w-6 ${getStatusColor(modelHealth.status)}`} />
                  {getStatusBadge(modelHealth.status)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model Health Status */}
        {modelHealth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${getStatusColor(modelHealth.models.xgboost_realtime.status)}`} />
                  XGBoost Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(modelHealth.models.xgboost_realtime.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mode</span>
                    <Badge variant="outline">{modelHealth.prediction_mode}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${getStatusColor(modelHealth.models.cause_classifier.status)}`} />
                  Cause Classifier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(modelHealth.models.cause_classifier.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-xs font-mono">LogisticRegression</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${getStatusColor(modelHealth.models.vehicle_thresholds.status)}`} />
                  Vehicle Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loaded</span>
                    <Badge variant="outline">{modelHealth.models.vehicle_thresholds.count} types</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(modelHealth.models.vehicle_thresholds.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Metrics */}
        {modelMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Model Metrics */}
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Real-time Model Performance
                </CardTitle>
                <CardDescription>XGBoost regression metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">R² Score</span>
                    <span className="text-2xl font-bold text-primary">
                      {(modelMetrics.summary.realtime_r2 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={modelMetrics.summary.realtime_r2 * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Measures how well the model explains variance in risk scores
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">MAE</p>
                    <p className="text-xl font-bold">{modelMetrics.realtime_model.regression_metrics.mae.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">RMSE</p>
                    <p className="text-xl font-bold">{modelMetrics.summary.realtime_rmse.toFixed(4)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-muted-foreground mb-2">Training Dataset</p>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Train: </span>
                      <span className="font-mono font-semibold">{modelMetrics.realtime_model.dataset_info.n_train}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Test: </span>
                      <span className="font-mono font-semibold">{modelMetrics.realtime_model.dataset_info.n_test}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cause Classifier Metrics */}
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Cause Classifier Performance
                </CardTitle>
                <CardDescription>Historical model accuracy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Accuracy</span>
                    <span className="text-2xl font-bold text-primary">
                      {(modelMetrics.summary.cause_accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={modelMetrics.summary.cause_accuracy * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Correctly classifies accident causes
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">F1 Score (Macro)</p>
                    <p className="text-xl font-bold">{(modelMetrics.summary.cause_f1_macro * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Classes</p>
                    <p className="text-xl font-bold">4</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-muted-foreground mb-2">Classification Types</p>
                  <div className="flex flex-wrap gap-2">
                    {modelInfo?.historical_models.cause_classifier.classes.map((cls) => (
                      <Badge key={cls} variant="secondary" className="text-xs">
                        {cls}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Model Information */}
        {modelInfo && (
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Model Details
              </CardTitle>
              <CardDescription>Technical specifications and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* XGBoost Model */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">{modelInfo.realtime_model.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Key Features</p>
                    <div className="flex flex-wrap gap-2">
                      {modelInfo.realtime_model.features.slice(0, 6).map((feat) => (
                        <Badge key={feat} variant="outline" className="text-xs">
                          {feat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Supported Vehicles</p>
                    <div className="flex flex-wrap gap-2">
                      {modelInfo.realtime_model.vehicle_types.map((veh) => (
                        <Badge key={veh} variant="secondary" className="text-xs">
                          {veh}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Models */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="font-semibold mb-3 text-lg">Historical Analysis Models</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-panel p-4 rounded-xl">
                    <p className="font-medium mb-1">{modelInfo.historical_models.cause_classifier.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {modelInfo.historical_models.cause_classifier.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {modelInfo.historical_models.cause_classifier.type}
                    </Badge>
                  </div>
                  <div className="glass-panel p-4 rounded-xl">
                    <p className="font-medium mb-1">{modelInfo.historical_models.segment_gbr.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {modelInfo.historical_models.segment_gbr.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {modelInfo.historical_models.segment_gbr.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Realtime Model Insights */}
        <RealtimeModelInsights />

        {/* Historical Model Insights */}
        <HistoricalModelInsights />

        {/* Real-time Weather Conditions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeatherDisplay 
            location={{ 
              lat: 7.0167, 
              lng: 80.6167,
              name: "Ginigathhena, Sri Lanka"
            }}
            autoRefresh={true}
            refreshInterval={300}
          />
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-black italic">Weather Impact</CardTitle>
              <CardDescription>How weather affects risk predictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Wet Conditions</p>
                    <p className="text-xs text-muted-foreground">
                      Increases risk by 30-40%. Activates hydroplaning risk analysis.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Low Visibility</p>
                    <p className="text-xs text-muted-foreground">
                      Below 1km visibility significantly impacts driver reaction time.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/20">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">High Winds</p>
                    <p className="text-xs text-muted-foreground">
                      Winds above 40 km/h affect vehicle stability, especially for motorcycles.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Temperature Extremes</p>
                    <p className="text-xs text-muted-foreground">
                      Below 5°C or above 40°C affects road surface and driver alertness.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
