import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Vehicle } from "@/types";
import { getCurrentHour } from "@/lib/utils/format";
import { config } from "@/lib/config";

interface UiState {
  hour: number;
  vehicle: Vehicle;
  mockMode: boolean;
  mapCenter: { lat: number; lng: number };
  
  setHour: (hour: number) => void;
  setVehicle: (vehicle: Vehicle) => void;
  setMockMode: (enabled: boolean) => void;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  resetToNow: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hour: getCurrentHour(),
      vehicle: "Car",
      mockMode: config.useMockApi,
      mapCenter: config.domain.center,
      
      setHour: (hour) => set({ hour }),
      setVehicle: (vehicle) => set({ vehicle }),
      setMockMode: (enabled) => set({ mockMode: enabled }),
      setMapCenter: (center) => set({ mapCenter: center }),
      resetToNow: () => set({ hour: getCurrentHour() }),
    }),
    {
      name: "driver-alert-ui",
      partialize: (state) => ({
        vehicle: state.vehicle,
        mockMode: state.mockMode,
      }),
    }
  )
);
