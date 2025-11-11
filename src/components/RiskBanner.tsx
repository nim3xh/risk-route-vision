import { ScoreResponse } from "@/types";
import { AlertTriangle } from "lucide-react";
import { riskToColor, riskToBand, getBandLabel } from "@/lib/utils/colors";
import { cn } from "@/lib/utils";

interface RiskBannerProps {
  score: ScoreResponse;
  className?: string;
}

export function RiskBanner({ score, className }: RiskBannerProps) {
  const band = riskToBand(score.risk_0_100);
  const color = riskToColor(score.risk_0_100);

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3 md:p-4 shadow-lg",
        className
      )}
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div
          className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          <span className="text-xl md:text-2xl font-bold text-white">
            {score.risk_0_100}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base md:text-lg font-bold" style={{ color }}>
            {getBandLabel(band)}
          </div>
          <div className="flex items-start gap-1 text-xs md:text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="line-clamp-2">{score.top_cause}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Confidence: {Math.round(score.p_top_cause * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
