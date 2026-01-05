import { Button } from "@/components/ui/button";
import { Circle, Hexagon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type VisualizationMode = "circles" | "graduated" | "labels";

interface RiskVisualizationToggleProps {
  mode: VisualizationMode;
  onChange: (mode: VisualizationMode) => void;
}

export function RiskVisualizationToggle({ mode, onChange }: RiskVisualizationToggleProps) {
  const modes: { value: VisualizationMode; label: string; icon: React.ReactNode; description: string }[] = [
    { value: "circles", label: "Circles", icon: <Circle className="h-4 w-4" />, description: "Uniform markers" },
    { value: "graduated", label: "Graduated", icon: <Hexagon className="h-4 w-4" />, description: "Size by risk" },
    { value: "labels", label: "Labels", icon: <BarChart3 className="h-4 w-4" />, description: "Show scores" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300",
            "border-2 hover:scale-105 active:scale-95",
            mode === m.value
              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
            mode === m.value ? "bg-white/20" : "bg-white/5"
          )}>
            {m.icon}
          </div>
          <div className="text-center">
            <div className="text-xs font-bold">{m.label}</div>
            <div className="text-[10px] opacity-70">{m.description}</div>
          </div>
          {mode === m.value && (
            <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/50 ring-offset-2 ring-offset-slate-950" />
          )}
        </button>
      ))}
    </div>
  );
}
