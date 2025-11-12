import { TopSpot } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { riskToColor, riskToBand, getBandLabel } from "@/lib/utils/colors";
import { formatHourLabel } from "@/lib/utils/format";

interface TopSpotsPanelProps {
  spots: TopSpot[];
  onSelectSpot?: (spot: TopSpot) => void;
}

export function TopSpotsPanel({ spots, onSelectSpot }: TopSpotsPanelProps) {
  if (spots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Risky Spots</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No risky spots found for current filters
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg">Top Risky Spots Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {spots.map((spot, index) => {
          const band = riskToBand(spot.risk_0_100);
          return (
            <button
              key={spot.segment_id}
              onClick={() => onSelectSpot?.(spot)}
              className="w-full rounded-lg border bg-card p-2 md:p-3 text-left transition-all hover:border-primary hover:shadow-sm active:scale-98"
            >
              <div className="flex items-start gap-2 md:gap-3">
                <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full bg-muted text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs md:text-sm font-semibold truncate">
                      {spot.segment_id}
                    </span>
                    <span
                      className="text-base md:text-lg font-bold flex-shrink-0"
                      style={{ color: riskToColor(spot.risk_0_100) }}
                    >
                      {spot.risk_0_100}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getBandLabel(band)} • {formatHourLabel(spot.hour)} • {spot.vehicle}
                  </div>
                  {spot.top_cause && (
                    <div className="flex items-start gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-2">{spot.top_cause}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
