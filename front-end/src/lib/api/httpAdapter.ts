import axios, { AxiosInstance } from "axios";
import {
  ScoreRequest,
  ScoreResponse,
  SegmentsTodayResponse,
  TopSpot,
  Vehicle,
  BoundingBox,
} from "@/types";
import { bboxToString } from "@/lib/geo/bbox";
import { config } from "@/lib/config";

class HttpAdapter {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async score(req: ScoreRequest): Promise<ScoreResponse> {
    const response = await this.client.post<ScoreResponse>("/score", req);
    return response.data;
  }

  async getSegmentsToday(
    bbox?: BoundingBox,
    hour?: number,
    vehicle?: Vehicle
  ): Promise<SegmentsTodayResponse> {
    const params: Record<string, string> = {};
    
    if (bbox) {
      params.bbox = bboxToString(bbox);
    }
    if (hour !== undefined) {
      params.hour = hour.toString();
    }
    if (vehicle) {
      params.vehicle = vehicle;
    }

    const response = await this.client.get<SegmentsTodayResponse>(
      "/segments/today",
      { params }
    );
    return response.data;
  }

  async getTopSpots(vehicle?: Vehicle, limit: number = 10): Promise<TopSpot[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (vehicle) {
      params.vehicle = vehicle;
    }

    const response = await this.client.get<TopSpot[]>("/spots/top", { params });
    return response.data;
  }
}

export const httpAdapter = new HttpAdapter(config.apiBase);
