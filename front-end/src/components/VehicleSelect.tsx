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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Vessel</span>
        <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">{value}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {vehicles.map(({ value: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={label}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all duration-300 group relative overflow-hidden",
              value === v
                ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                : "border-white/5 bg-slate-900/50 text-muted-foreground hover:border-white/10 hover:bg-slate-800/50"
            )}
          >
            {value === v && (
              <div className="absolute inset-0 bg-primary opacity-5 animate-pulse" />
            )}
            <Icon className={cn(
              "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
              value === v ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span className="text-[8px] font-bold uppercase tracking-tighter truncate w-full text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
