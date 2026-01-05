import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

interface ModelInsightsPanelProps {
  confidence?: {
    confidence: number;
    certainty: "low" | "medium" | "high";
    distance_from_threshold: number;
    consistency: number;
    avg_prediction: number;
    threshold: number;
  };
  featureImportance?: Record<string, number>;
  explain?: Record<string, number>;
  vehicleType: string;
}

export function ModelInsightsPanel({ 
  confidence, 
  featureImportance, 
  explain, 
  vehicleType 
}: ModelInsightsPanelProps) {
  const getCertaintyColor = (certainty?: string) => {
    switch (certainty) {
      case "high":
        return "text-green-500 bg-green-500/20";
      case "medium":
        return "text-yellow-500 bg-yellow-500/20";
      case "low":
        return "text-red-500 bg-red-500/20";
      default:
        return "text-gray-500 bg-gray-500/20";
    }
  };

  const getCertaintyIcon = (certainty?: string) => {
    switch (certainty) {
      case "high":
        return <CheckCircle2 className="h-4 w-4" />;
      case "medium":
      case "low":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  // Normalize feature importance for display
  const normalizeFeatures = (features?: Record<string, number>) => {
    if (!features || Object.keys(features).length === 0) return [];
    
    const entries = Object.entries(features);
    const max = Math.max(...entries.map(([, v]) => Math.abs(v)));
    
    return entries
      .map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
        normalized: max > 0 ? (Math.abs(value) / max) * 100 : 0
      }))
      .sort((a, b) => b.normalized - a.normalized)
      .slice(0, 5); // Top 5 features
  };

  const topFeatures = featureImportance 
    ? normalizeFeatures(featureImportance) 
    : normalizeFeatures(explain);

  return (
    <div className="space-y-4">
      {/* Confidence Score */}
      {confidence && (
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Prediction Confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Confidence Score</span>
                <div className="flex items-center gap-2">
                  <Badge className={getCertaintyColor(confidence.certainty)}>
                    {getCertaintyIcon(confidence.certainty)}
                    <span className="ml-1 capitalize">{confidence.certainty}</span>
                  </Badge>
                  <span className="text-lg font-bold">{(confidence.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              <Progress value={confidence.confidence * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                <p className="text-sm font-semibold">{(confidence.consistency * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Threshold</p>
                <p className="text-sm font-semibold">{confidence.threshold.toFixed(3)}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t border-white/10">
              The model is <span className="font-semibold text-foreground">{confidence.certainty}</span> certainty 
              about this prediction for <span className="font-semibold text-foreground">{vehicleType}</span> vehicles.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Importance */}
      {topFeatures.length > 0 && (
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Key Risk Factors
            </CardTitle>
            <CardDescription className="text-xs">
              Top contributors to the risk prediction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topFeatures.map((feature, idx) => (
                <div key={feature.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        #{idx + 1}
                      </Badge>
                      <span className="text-xs font-medium">{feature.name}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {feature.value.toFixed(3)}
                    </span>
                  </div>
                  <Progress value={feature.normalized} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
