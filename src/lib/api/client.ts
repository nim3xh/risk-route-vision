import {
  ScoreRequest,
  ScoreResponse,
  SegmentsTodayResponse,
  TopSpot,
  Vehicle,
  BoundingBox,
} from "@/types";
import { config } from "@/lib/config";
import { httpAdapter } from "./httpAdapter";
import {
  mockScore,
  mockGetSegmentsToday,
  mockGetTopSpots,
} from "./mockAdapter";

/**
 * Unified Risk API Client
 * Automatically switches between mock and real HTTP based on config
 */
class RiskApiClient {
  private useMock: boolean;

  constructor() {
    this.useMock = config.useMockApi;
  }

  setMockMode(enabled: boolean) {
    this.useMock = enabled;
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  async score(req: ScoreRequest): Promise<ScoreResponse> {
    if (this.useMock) {
      return mockScore(req);
    }
    return httpAdapter.score(req);
  }

  async getSegmentsToday(
    bbox?: BoundingBox,
    hour?: number,
    vehicle?: Vehicle
  ): Promise<SegmentsTodayResponse> {
    if (this.useMock) {
      return mockGetSegmentsToday(bbox, hour, vehicle);
    }
    return httpAdapter.getSegmentsToday(bbox, hour, vehicle);
  }

  async getTopSpots(vehicle?: Vehicle, limit: number = 10): Promise<TopSpot[]> {
    if (this.useMock) {
      return mockGetTopSpots(vehicle, limit);
    }
    return httpAdapter.getTopSpots(vehicle, limit);
  }
}

export const riskApi = new RiskApiClient();
