import { create } from "zustand";
import { SegmentFeature, TopSpot, ScoreResponse, Weather } from "@/types";

interface RiskState {
  segmentsToday: SegmentFeature[];
  selectedSegment: SegmentFeature | null;
  topSpots: TopSpot[];
  currentScore: ScoreResponse | null;
  isLoading: boolean;
  error: string | null;

  weather: Weather;
  weatherMode: "manual" | "live";
  liveWeather: Weather | null;

  setSegmentsToday: (segments: SegmentFeature[]) => void;
  setSelectedSegment: (segment: SegmentFeature | null) => void;
  setTopSpots: (spots: TopSpot[]) => void;
  setCurrentScore: (score: ScoreResponse | null) => void;
  setWeather: (weather: Partial<RiskState["weather"]>) => void;
  setWeatherMode: (mode: "manual" | "live") => void;
  setLiveWeather: (weather: Weather | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getActiveWeather: () => Weather;
}

export const useRiskStore = create<RiskState>((set) => ({
  segmentsToday: [],
  selectedSegment: null,
  topSpots: [],
  currentScore: null,
  isLoading: false,
  error: null,
  weather: {
    temperature_c: 28,
    humidity_pct: 75,
    precip_mm: 0,
    wind_kmh: 12,
    is_wet: 0,
  },
  weatherMode: "manual",
  liveWeather: null,

  setSegmentsToday: (segments) => set({ segmentsToday: segments }),
  setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  setTopSpots: (spots) => set({ topSpots: spots }),
  setCurrentScore: (score) => set({ currentScore: score }),
  setWeather: (weather) => set((state) => ({
    weather: { ...state.weather, ...weather }
  })),
  setWeatherMode: (mode) => set({ weatherMode: mode }),
  setLiveWeather: (weather) => set({ liveWeather: weather }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  getActiveWeather: () => {
    const state = useRiskStore.getState();
    if (state.weatherMode === "live" && state.liveWeather) {
      return state.liveWeather;
    }
    return state.weather;
  }
}));
