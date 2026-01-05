import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Target, TrendingUp, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { config } from "@/lib/config";

interface CauseClassifierMetrics {
  accuracy: number;
  f1_macro: number;
  precision_macro: number;
  recall_macro: number;
  per_class: {
    [key: string]: {
      precision: number;
      recall: number;
      "f1-score": number;
      support: number;
    };
  };
}

interface SegmentGBRMetrics {
  rmse: number;
  mae: number;
  r2: number;
}

interface HistoricalMetrics {
  cause_classifier: CauseClassifierMetrics;
  segment_gbr: SegmentGBRMetrics;
  available: boolean;
}

interface RiskTile {
  segment_id: string;
  lat_bin: number;
  lon_bin: number;
  hour: number;
  dow: number;
  is_wet: number;
  Vehicle: string;
  incident_count: number;
  speed_reason_rate: number;
  n: number;
  SPI_tile: number;
}

export function HistoricalModelInsights() {
  const [metrics, setMetrics] = useState<HistoricalMetrics | null>(null);
  const [riskTiles, setRiskTiles] = useState<RiskTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const loadHistoricalData = async () => {
    try {
      const baseUrl = config.apiBase || "http://localhost:8080/api/v1";
      
      const [metricsRes, tilesRes] = await Promise.all([
        fetch(`${baseUrl}/models/historical/metrics`),
        fetch(`${baseUrl}/models/historical/risk-tiles?limit=10&min_risk=0.38`)
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (tilesRes.ok) {
        const tilesData = await tilesRes.json();
        setRiskTiles(tilesData.tiles || []);
      }

      setError(null);
    } catch (err) {
      console.error("Historical data error:", err);
      setError(err instanceof Error ? err.message : "Failed to load historical data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-panel border-white/10">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <Database className="h-5 w-5 animate-pulse text-primary" />
            <span className="text-muted-foreground">Loading historical insights...</span>
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
            <Database className="h-5 w-5" />
            Historical Model Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || "Historical model data is not available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cause Classifier Performance */}
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Cause Classifier - Historical Analysis
          </CardTitle>
          <CardDescription>
            Predicts accident causes from historical incident data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  {(metrics.cause_classifier.accuracy * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress 
                value={metrics.cause_classifier.accuracy * 100} 
                className="h-1.5" 
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">F1 Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {(metrics.cause_classifier.f1_macro * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress 
                value={metrics.cause_classifier.f1_macro * 100} 
                className="h-1.5" 
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Precision</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {(metrics.cause_classifier.precision_macro * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress 
                value={metrics.cause_classifier.precision_macro * 100} 
                className="h-1.5" 
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Recall</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {(metrics.cause_classifier.recall_macro * 100).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Progress 
                value={metrics.cause_classifier.recall_macro * 100} 
                className="h-1.5" 
              />
            </div>
          </div>

          {/* Per-Class Performance */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm font-medium mb-4">Per-Class Performance</p>
            <div className="space-y-3">
              {Object.entries(metrics.cause_classifier.per_class).map(([className, classMetrics]) => (
                <div key={className} className="glass-panel p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{className}</span>
                    <Badge variant="secondary" className="text-xs">
                      {classMetrics.support} samples
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Precision</p>
                      <p className="font-semibold">{(classMetrics.precision * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Recall</p>
                      <p className="font-semibold">{(classMetrics.recall * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">F1</p>
                      <p className="font-semibold">{(classMetrics["f1-score"] * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segment GBR Performance */}
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Segment Risk Severity Model
          </CardTitle>
          <CardDescription>
            Gradient Boosting Regressor for segment-level risk prediction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 glass-panel rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">RMSE</p>
              <p className="text-3xl font-bold text-primary">
                {metrics.segment_gbr.rmse.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Root Mean Squared Error</p>
            </div>
            <div className="text-center p-4 glass-panel rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">MAE</p>
              <p className="text-3xl font-bold">
                {metrics.segment_gbr.mae.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Mean Absolute Error</p>
            </div>
            <div className="text-center p-4 glass-panel rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">R² Score</p>
              <p className="text-3xl font-bold text-green-500">
                {(metrics.segment_gbr.r2 * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Variance Explained</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High-Risk Segments */}
      {riskTiles.length > 0 && (
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Historical High-Risk Segments
            </CardTitle>
            <CardDescription>
              Top risk locations from historical incident data (SPI ≥ 0.38)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {riskTiles.map((tile, idx) => (
                <div 
                  key={`${tile.segment_id}-${idx}`} 
                  className="glass-panel p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="font-mono text-xs">
                        {tile.SPI_tile.toFixed(3)}
                      </Badge>
                      <span className="text-sm font-medium">
                        {tile.Vehicle}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {tile.incident_count} incident{tile.incident_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Location:</span> {tile.lat_bin.toFixed(3)}, {tile.lon_bin.toFixed(3)}
                    </div>
                    <div>
                      <span className="font-medium">Hour:</span> {tile.hour}:00
                    </div>
                    <div>
                      <span className="font-medium">Day:</span> {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][tile.dow]}
                    </div>
                    <div>
                      <span className="font-medium">Conditions:</span> {tile.is_wet ? 'Wet' : 'Dry'}
                    </div>
                  </div>
                  {tile.speed_reason_rate > 0 && (
                    <div className="mt-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {(tile.speed_reason_rate * 100).toFixed(0)}% Speed-Related
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
