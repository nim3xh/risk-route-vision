import { BoundingBox } from "@/types";

export function isPointInBbox(
  lat: number,
  lon: number,
  bbox: BoundingBox
): boolean {
  return (
    lat >= bbox.minLat &&
    lat <= bbox.maxLat &&
    lon >= bbox.minLon &&
    lon <= bbox.maxLon
  );
}

export function getBboxArray(bbox: BoundingBox): [number, number, number, number] {
  return [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat];
}

export function bboxToString(bbox: BoundingBox): string {
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
}
