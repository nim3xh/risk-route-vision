import { Slider } from "@/components/ui/slider";
import { formatHourLabel } from "@/lib/utils/format";
import { Clock } from "lucide-react";

interface HourSliderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}

export function HourSlider({ value, onChange, onCommit }: HourSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Hour</span>
        </div>
        <span className="text-sm font-bold text-primary">
          {formatHourLabel(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={([v]) => onCommit?.(v)}
        min={0}
        max={23}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>00:00</span>
        <span>12:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}
