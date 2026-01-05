import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, TrendingUp, BarChart3, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { config } from "@/lib/config";

interface RegressionMetrics {
  r2: number;
  mae: number;
  rmse: number;
  n_train: number;
  n_test: number;
  model: string;
  tuned: boolean;
}

interface ClassificationMetrics {
  threshold_mode: string;
  global_threshold: number;
  strategy: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

interface VehicleMetric {
  Vehicle: string;
  n_test: number;
  threshold_used: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface RealtimeMetrics {
  regression_metrics: RegressionMetrics;
  classification_metrics: ClassificationMetrics;
  vehicle_specific: VehicleMetric[];
  available: boolean;
}

export function RealtimeModelInsights() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRealtimeData();
  }, []);

  const loadRealtimeData = async () => {
    try {
      const baseUrl = config.apiBase || "http://localhost:8080/api/v1";
      
      const [metricsRes, featuresRes] = await Promise.all([
        fetch(`${baseUrl}/models/realtime/metrics`),
        fetch(`${baseUrl}/models/realtime/feature-importance?limit=10`)
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (featuresRes.ok) {
        const featuresData = await featuresRes.json();
        setFeatures(featuresData.features || []);
      }

      setError(null);
    } catch (err) {
      console.error("Realtime data error:", err);
      setError(err instanceof Error ? err.message : "Failed to load realtime data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-panel border-white/10">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <Zap className="h-5 w-5 animate-pulse text-primary" />
            <span className="text-muted-foreground">Loading realtime insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics?.available) {
    return (
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-500">
            <Zap className="h-5 w-5" />
            Realtime Model Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || "Realtime model data is not available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort vehicles by F1 score descending, show top 6
  const topVehicles = [...metrics.vehicle_specific]
    .sort((a, b) => b.f1 - a.f1)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* XGBoost Regression Performance */}
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            XGBoost Regression - Realtime Risk Prediction
          </CardTitle>
          <CardDescription>
            {metrics.regression_metrics.model} {metrics.regression_metrics.tuned && "(Tuned)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* R² Score - Main Metric */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">R² Score (Variance Explained)</span>
              <span className="text-3xl font-bold text-primary">
                {(metrics.regression_metrics.r2 * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.regression_metrics.r2 * 100} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              Model explains {(metrics.regression_metrics.r2 * 100).toFixed(1)}% of risk score variance
            </p>
          </div>

          {/* Error Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="text-center p-4 glass-panel rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">MAE</p>
              <p className="text-2xl font-bold">{metrics.regression_metrics.mae.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground mt-1">Mean Absolute Error</p>
            </div>
            <div className="text-center p-4 glass-panel rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">RMSE</p>
              <p className="text-2xl font-bold">{metrics.regression_metrics.rmse.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground mt-1">Root Mean Squared</p>
            </div>
            <div className="text-center p-4 glass-panel rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Dataset</p>
              <p className="text-2xl font-bold">{metrics.regression_metrics.n_train + metrics.regression_metrics.n_test}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.regression_metrics.n_train} train / {metrics.regression_metrics.n_test} test
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classification Performance */}
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Binary Classification Performance
          </CardTitle>
          <CardDescription>
            High-risk detection using {metrics.classification_metrics.strategy} thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Classification Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  {(metrics.classification_metrics.accuracy * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress value={metrics.classification_metrics.accuracy * 100} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Precision</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {(metrics.classification_metrics.precision * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress value={metrics.classification_metrics.precision * 100} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Recall</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {(metrics.classification_metrics.recall * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress value={metrics.classification_metrics.recall * 100} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">F1 Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-500">
                  {(metrics.classification_metrics.f1 * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress value={metrics.classification_metrics.f1 * 100} className="h-1.5" />
            </div>
          </div>

          {/* Threshold Info */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Global Threshold</span>
              <Badge variant="secondary" className="font-mono">
                {metrics.classification_metrics.global_threshold.toFixed(4)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Using {metrics.classification_metrics.strategy} strategy for per-vehicle thresholds
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle-Specific Performance */}
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Top Vehicle Performance
          </CardTitle>
          <CardDescription>
            Best performing vehicle types (by F1 score)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topVehicles.map((vehicle, idx) => (
              <div 
                key={`${vehicle.Vehicle}-${idx}`} 
                className="glass-panel p-4 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={vehicle.f1 >= 0.9 ? "default" : vehicle.f1 >= 0.7 ? "secondary" : "outline"}>
                      #{idx + 1}
                    </Badge>
                    <span className="font-medium">{vehicle.Vehicle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {vehicle.n_test} samples
                    </Badge>
                    <Badge 
                      className={`font-mono ${
                        vehicle.f1 >= 0.9 ? "bg-green-500/20 text-green-500" :
                        vehicle.f1 >= 0.7 ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {(vehicle.f1 * 100).toFixed(0)}% F1
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-1">Accuracy</p>
                    <p className="font-semibold">{(vehicle.accuracy * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Precision</p>
                    <p className="font-semibold">{(vehicle.precision * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Recall</p>
                    <p className="font-semibold">{(vehicle.recall * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Threshold: <span className="font-mono">{vehicle.threshold_used.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance */}
      {features.length > 0 && (
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Top Predictive Features
            </CardTitle>
            <CardDescription>
              Most important features for risk prediction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {features.map((feature, idx) => {
                const maxImportance = features[0].importance;
                const normalizedImportance = (feature.importance / maxImportance) * 100;
                
                return (
                  <div key={`${feature.feature}-${idx}`} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {feature.feature.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {(feature.importance * 100).toFixed(2)}%
                        </Badge>
                        {idx === 0 && <Badge variant="default" className="text-xs">Top</Badge>}
                      </div>
                    </div>
                    <Progress value={normalizedImportance} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
