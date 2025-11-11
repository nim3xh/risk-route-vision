import { create } from "zustand";
import { SegmentFeature, TopSpot, ScoreResponse } from "@/types";

interface RiskState {
  segmentsToday: SegmentFeature[];
  selectedSegment: SegmentFeature | null;
  topSpots: TopSpot[];
  currentScore: ScoreResponse | null;
  isLoading: boolean;
  error: string | null;
  
  setSegmentsToday: (segments: SegmentFeature[]) => void;
  setSelectedSegment: (segment: SegmentFeature | null) => void;
  setTopSpots: (spots: TopSpot[]) => void;
  setCurrentScore: (score: ScoreResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRiskStore = create<RiskState>((set) => ({
  segmentsToday: [],
  selectedSegment: null,
  topSpots: [],
  currentScore: null,
  isLoading: false,
  error: null,
  
  setSegmentsToday: (segments) => set({ segmentsToday: segments }),
  setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  setTopSpots: (spots) => set({ topSpots: spots }),
  setCurrentScore: (score) => set({ currentScore: score }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
