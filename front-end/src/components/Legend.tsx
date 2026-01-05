import { riskToColor, getBandLabel } from "@/lib/utils/colors";
import { RiskBand } from "@/types";

const bands: RiskBand[] = ["safe", "warning", "danger"];
const ranges = {
  safe: "0-39",
  warning: "40-69",
  danger: "70-100",
};

export function Legend() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
        <h3 className="text-sm font-black uppercase tracking-wider text-primary/80">
          Risk Scale
        </h3>
      </div>
      <div className="space-y-2">
        {bands.map((band) => {
          const color = riskToColor(band === "safe" ? 20 : band === "warning" ? 55 : 85);
          return (
            <div 
              key={band} 
              className="group flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="relative">
                <div
                  className="h-5 w-5 rounded-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: color }}
                />
                <div
                  className="absolute inset-0 rounded-lg blur-md opacity-50"
                  style={{ backgroundColor: color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold capitalize">
                  {getBandLabel(band)}
                </div>
                <div className="text-[10px] opacity-60 font-mono">
                  {ranges[band]}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
