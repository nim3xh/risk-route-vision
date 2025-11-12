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
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-card-foreground">
        Risk Level
      </h3>
      <div className="space-y-1.5">
        {bands.map((band) => (
          <div key={band} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: riskToColor(band === "safe" ? 20 : band === "warning" ? 55 : 85) }}
            />
            <span className="text-xs text-muted-foreground">
              {getBandLabel(band)} ({ranges[band]})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
