import { Vehicle } from "@/types";
import { Car, Bus, Bike, TramFront } from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleSelectProps {
  value: Vehicle;
  onChange: (vehicle: Vehicle) => void;
}

const vehicles: Array<{ value: Vehicle; label: string; icon: typeof Car }> = [
  { value: "Car", label: "Car", icon: Car },
  { value: "Bus", label: "Bus", icon: Bus },
  { value: "Motor Cycle", label: "Motorcycle", icon: Bike },
  { value: "Three Wheeler", label: "Three Wheeler", icon: TramFront },
];

export function VehicleSelect({ value, onChange }: VehicleSelectProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Vehicle Type</span>
      <div className="grid grid-cols-2 gap-2">
        {vehicles.map(({ value: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
              value === v
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-accent"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
