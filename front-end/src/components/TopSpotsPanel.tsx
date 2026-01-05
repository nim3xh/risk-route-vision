import { TopSpot } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { riskToBand, getBandLabel } from "@/lib/utils/colors";
import { formatHourLabel } from "@/lib/utils/format";

interface TopSpotsPanelProps {
  spots: TopSpot[];
  onSelectSpot?: (spot: TopSpot) => void;
}

export function TopSpotsPanel({ spots, onSelectSpot }: TopSpotsPanelProps) {
  if (spots.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-[32px] border-white/10">
        <div className="h-12 w-12 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No High Risk Zones</p>
        <p className="text-[10px] opacity-50 mt-1">Status Nominal for Selected Filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-black italic tracking-tighter uppercase text-gradient">Risk Leaderboard</h3>
        <Badge variant="outline" className="border-white/10 text-[10px] font-bold">{spots.length} Zones</Badge>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {spots.map((spot, index) => {
          const band = riskToBand(spot.risk_0_100);
          const isHighRisk = spot.risk_0_100 > 70;
          
          return (
            <button
              key={spot.segment_id}
              onClick={() => onSelectSpot?.(spot)}
              className="group relative w-full overflow-hidden rounded-[24px] border border-white/5 bg-slate-900/40 p-4 transition-all duration-300 hover:bg-slate-800/60 hover:border-primary/30 hover:shadow-xl hover:-translate-y-0.5 text-left"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl font-black italic shadow-lg",
                  isHighRisk ? "bg-rose-500 text-white" : "bg-white/10 text-muted-foreground"
                )}>
                  #{index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate mr-2">
                      Zone {spot.segment_id.slice(0, 12)}
                    </span>
                    <span className={cn(
                      "text-xl font-black tabular-nums tracking-tighter italic",
                      isHighRisk ? "text-rose-500" : "text-primary"
                    )}>
                      {spot.risk_0_100}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-tighter opacity-60">
                    <span className={cn(isHighRisk ? "text-rose-500" : "text-emerald-500")}>{getBandLabel(band)}</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{formatHourLabel(spot.hour)}</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{spot.vehicle}</span>
                  </div>
                </div>
              </div>
              
              {/* Subtle background glow for high risk */}
              {isHighRisk && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
