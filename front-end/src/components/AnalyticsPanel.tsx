import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { ChevronDown, Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailedSegmentInfo {
  segment_index: number;
  start: { lat: number; lon: number };
  end: { lat: number; lon: number };
  risk_score: number;
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  top_cause: string;
  accident_severity_rate: number;
  curvature: number;
  weather_influence: {
    temperature: number;
    humidity: number;
    precipitation: number;
    wind_speed: number;
  };
}

interface SegmentBreakdownProps {
  segments: DetailedSegmentInfo[];
  maxRisk?: number;
}

export const SegmentBreakdown: React.FC<SegmentBreakdownProps> = ({
  segments,
  maxRisk = 100,
}) => {
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);

  const getRiskColor = (risk: number) => {
    if (risk > 70) return "text-red-500 bg-red-500/10";
    if (risk >= 40) return "text-yellow-500 bg-yellow-500/10";
    return "text-green-500 bg-green-500/10";
  };

  const getProgressColor = (risk: number) => {
    if (risk > 70) return "bg-red-500";
    if (risk >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Segment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {segments.slice(0, 20).map((segment) => (
          <div
            key={segment.segment_index}
            className="border rounded-lg p-3 hover:bg-accent/30 cursor-pointer transition-colors"
            onClick={() =>
              setExpandedSegment(
                expandedSegment === segment.segment_index
                  ? null
                  : segment.segment_index
              )
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">Segment {segment.segment_index}</span>
                  <Badge
                    className={cn(
                      "text-xs",
                      segment.risk_level === "HIGH"
                        ? "bg-red-500 text-white"
                        : segment.risk_level === "MEDIUM"
                          ? "bg-yellow-500 text-white"
                          : "bg-green-500 text-white"
                    )}
                  >
                    {segment.risk_level}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      getProgressColor(segment.risk_score)
                    )}
                    style={{
                      width: `${(segment.risk_score / maxRisk) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="ml-4 text-right">
                <span className={cn("text-lg font-bold", getRiskColor(segment.risk_score))}>
                  {Math.round(segment.risk_score)}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform ml-2",
                  expandedSegment === segment.segment_index && "rotate-180"
                )}
              />
            </div>

            {expandedSegment === segment.segment_index && (
              <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Top Cause</p>
                    <p className="font-semibold">{segment.top_cause}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Severity Rate</p>
                    <p className="font-semibold">{segment.accident_severity_rate.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Curvature</p>
                    <p className="font-semibold">{segment.curvature.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Distance</p>
                    <p className="font-semibold">~100m</p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-2">Weather Conditions</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="opacity-70">Temp:</span>{" "}
                      {segment.weather_influence.temperature}°C
                    </div>
                    <div>
                      <span className="opacity-70">Humidity:</span>{" "}
                      {segment.weather_influence.humidity}%
                    </div>
                    <div>
                      <span className="opacity-70">Wind:</span>{" "}
                      {segment.weather_influence.wind_speed} km/h
                    </div>
                    <div>
                      <span className="opacity-70">Rain:</span>{" "}
                      {segment.weather_influence.precipitation}mm
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

interface RiskTrendProps {
  data: Array<{ hour: number; risk: number }>;
  title?: string;
}

export const RiskTrendChart: React.FC<RiskTrendProps> = ({
  data,
  title = "Hourly Risk Trends",
}) => {
  return (
    <Card className="backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" label={{ value: "Hour", position: "insideBottomRight", offset: -5 }} />
            <YAxis label={{ value: "Risk Score", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="risk"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", r: 4 }}
              activeDot={{ r: 6 }}
              name="Average Risk"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface RiskDistributionProps {
  distribution: Record<string, number>;
  title?: string;
}

export const RiskDistributionChart: React.FC<RiskDistributionProps> = ({
  distribution,
  title = "Risk Distribution",
}) => {
  const data = Object.entries(distribution).map(([range, count]) => ({
    range,
    count,
  }));

  return (
    <Card className="backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => {
                const rangeStart = parseInt(entry.range.split("-")[0]);
                let color = "#22c55e"; // green
                if (rangeStart >= 70) color = "#ef4444"; // red
                else if (rangeStart >= 40) color = "#eab308"; // yellow
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
