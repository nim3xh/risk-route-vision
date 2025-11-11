import { Vehicle } from "@/types";
import { Car, Bus, Bike, TramFront, Truck, Package } from "lucide-react";
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
  { value: "Van", label: "Van", icon: Package },
  { value: "Lorry", label: "Lorry", icon: Truck },
];

export function VehicleSelect({ value, onChange }: VehicleSelectProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Vehicle Type</span>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
        {vehicles.map(({ value: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 rounded-lg border-2 px-2 py-2 sm:px-3 text-sm font-medium transition-all min-h-[60px] sm:min-h-0",
              value === v
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-accent"
            )}
          >
            <Icon className="h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="text-xs text-center sm:text-left leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
