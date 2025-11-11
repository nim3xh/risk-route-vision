import { SegmentFeature } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Clock } from "lucide-react";
import { riskToBand, getBandLabel, riskToBackgroundColor } from "@/lib/utils/colors";
import { formatHourLabel } from "@/lib/utils/format";

interface SegmentInfoCardProps {
  segment: SegmentFeature;
  onClose?: () => void;
}

export function SegmentInfoCard({ segment, onClose }: SegmentInfoCardProps) {
  const { properties } = segment;
  const band = riskToBand(properties.risk_0_100);

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">Segment Details</CardTitle>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="rounded-lg p-4 text-center"
          style={{ backgroundColor: riskToBackgroundColor(properties.risk_0_100) }}
        >
          <div className="text-3xl font-bold">{properties.risk_0_100}</div>
          <div className="text-sm font-medium">{getBandLabel(band)}</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Segment ID</div>
              <div className="text-sm font-medium">{properties.segment_id}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Time</div>
              <div className="text-sm font-medium">
                {formatHourLabel(properties.hour)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Top Cause</div>
              <div className="text-sm font-medium">
                {properties.top_cause || "Unknown"}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Badge variant="outline">{properties.vehicle}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
