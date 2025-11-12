import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Vehicle } from "@/types";
import { getCurrentHour } from "@/lib/utils/format";
import { config } from "@/lib/config";

export type MapStyle = "streets" | "satellite" | "outdoors" | "dark" | "light";

interface UiState {
  hour: number;
  vehicle: Vehicle;
  mockMode: boolean;
  mapCenter: { lat: number; lng: number };
  mapStyle: MapStyle;
  
  setHour: (hour: number) => void;
  setVehicle: (vehicle: Vehicle) => void;
  setMockMode: (enabled: boolean) => void;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapStyle: (style: MapStyle) => void;
  resetToNow: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hour: getCurrentHour(),
      vehicle: "Car",
      mockMode: config.useMockApi,
      mapCenter: config.domain.center,
      mapStyle: "streets",
      
      setHour: (hour) => set({ hour }),
      setVehicle: (vehicle) => set({ vehicle }),
      setMockMode: (enabled) => set({ mockMode: enabled }),
      setMapCenter: (center) => set({ mapCenter: center }),
      setMapStyle: (style) => set({ mapStyle: style }),
      resetToNow: () => set({ hour: getCurrentHour() }),
    }),
    {
      name: "driver-alert-ui",
      partialize: (state) => ({
        vehicle: state.vehicle,
        mockMode: state.mockMode,
        mapStyle: state.mapStyle,
      }),
    }
  )
);
