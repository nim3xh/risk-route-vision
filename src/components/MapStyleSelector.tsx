import { MapStyle } from "@/store/useUiStore";
import { Map, Satellite, Mountain, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapStyleSelectorProps {
  value: MapStyle;
  onChange: (style: MapStyle) => void;
}

const mapStyles: Array<{ 
  value: MapStyle; 
  label: string; 
  icon: typeof Map;
  description: string;
}> = [
  { 
    value: "streets", 
    label: "Streets", 
    icon: Map,
    description: "Standard street map"
  },
  { 
    value: "satellite", 
    label: "Satellite", 
    icon: Satellite,
    description: "Satellite imagery"
  },
  { 
    value: "outdoors", 
    label: "Outdoors", 
    icon: Mountain,
    description: "Topographic map"
  },
  { 
    value: "dark", 
    label: "Dark", 
    icon: Moon,
    description: "Dark theme"
  },
  { 
    value: "light", 
    label: "Light", 
    icon: Sun,
    description: "Light theme"
  },
];

export function MapStyleSelector({ value, onChange }: MapStyleSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Map Style</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {mapStyles.map(({ value: v, label, icon: Icon, description }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={description}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
              value === v
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-accent"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
