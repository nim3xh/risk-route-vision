import { SegmentFeature } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Clock, X } from "lucide-react";
import { riskToBand, getBandLabel } from "@/lib/utils/colors";
import { formatHourLabel } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SegmentInfoCardProps {
  segment: SegmentFeature;
  onClose?: () => void;
}

export function SegmentInfoCard({ segment, onClose }: SegmentInfoCardProps) {
  const { properties } = segment;
  const band = riskToBand(properties.risk_0_100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="h-8 w-1 bg-primary rounded-full" />
           <h3 className="text-xl font-black italic tracking-tighter uppercase text-gradient">Data Inspector</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="relative group">
         <div className={cn(
           "absolute inset-0 rounded-[32px] blur-xl opacity-20",
           properties.risk_0_100 > 70 ? "bg-rose-500" : properties.risk_0_100 > 40 ? "bg-amber-500" : "bg-emerald-500"
         )} />
         <div className="relative glass-card p-6 rounded-[32px] border-white/10 text-center space-y-2 overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
               <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-[8px] uppercase font-black">Segment {properties.segment_id.slice(0, 8)}</Badge>
            </div>
            <div className={cn(
              "text-6xl font-black tabular-nums tracking-tighter italic",
              properties.risk_0_100 > 70 ? "text-rose-500" : properties.risk_0_100 > 40 ? "text-amber-500" : "text-emerald-500"
            )}>
              {properties.risk_0_100}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Risk Index</div>
            <div className="pt-2">
               <span className={cn(
                 "px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest",
                 properties.risk_0_100 > 70 ? "bg-rose-500/20 text-rose-500" : properties.risk_0_100 > 40 ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500"
               )}>
                 {getBandLabel(band)}
               </span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 transition-all hover:bg-white/10">
           <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <AlertTriangle className="h-5 w-5" />
           </div>
           <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase opacity-50 block">Primary Etiology</span>
              <span className="text-sm font-bold truncate block capitalize">{properties.top_cause?.replace(/_/g, ' ') || "Indeterminate"}</span>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
             <div className="flex items-center gap-2 mb-2 opacity-50">
                <Clock className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase">Timeframe</span>
             </div>
             <span className="text-sm font-black italic">{formatHourLabel(properties.hour)}</span>
          </div>
          <div className="p-4 rounded-3xl bg-white/5 border border-white/5">
             <div className="flex items-center gap-2 mb-2 opacity-50">
                <MapPin className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase">Vehicle</span>
             </div>
             <span className="text-sm font-black italic">{properties.vehicle}</span>
          </div>
        </div>
      </div>

      {properties.rate_pred !== undefined && (
        <div className="p-5 rounded-3xl border border-dashed border-white/10 space-y-3">
           <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-50">
              <span>Predictive Analytics</span>
              <span>v1.2</span>
           </div>
           <div className="flex justify-between items-end">
              <div className="text-2xl font-black italic tabular-nums">{properties.rate_pred.toFixed(4)}</div>
              <div className="text-[9px] font-bold opacity-40 mb-1 uppercase tracking-tighter">Expected Incidents / Area</div>
           </div>
        </div>
      )}
    </div>
  );
}
