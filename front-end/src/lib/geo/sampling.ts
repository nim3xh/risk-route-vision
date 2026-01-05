/**
 * Calculate distance between two points using Haversine formula
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Sample points along a polyline at approximately equal intervals
 */
export function samplePolyline(
  coordinates: number[][],
  intervalMeters: number = 100
): Array<{ lat: number; lon: number }> {
  if (coordinates.length < 2) return [];

  const points: Array<{ lat: number; lon: number }> = [];
  let accumulatedDistance = 0;

  // Always include first point
  points.push({ lat: coordinates[0][1], lon: coordinates[0][0] });

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    const segmentDistance = haversineDistance(lat1, lon1, lat2, lon2);
    const numSamples = Math.floor(segmentDistance / intervalMeters);

    for (let j = 1; j <= numSamples; j++) {
      const fraction = (j * intervalMeters) / segmentDistance;
      const lat = lat1 + (lat2 - lat1) * fraction;
      const lon = lon1 + (lon2 - lon1) * fraction;
      points.push({ lat, lon });
    }
  }

  // Always include last point
  const lastCoord = coordinates[coordinates.length - 1];
  points.push({ lat: lastCoord[1], lon: lastCoord[0] });

  return points;
}

/**
 * Sample a fixed number of points evenly distributed along a polyline
 */
export function samplePolylineByCount(
  coordinates: number[][],
  count: number = 50
): Array<{ lat: number; lon: number }> {
  if (coordinates.length < 2) return [];
  if (count < 2) count = 2;

  // Calculate total route length
  let totalLength = 0;
  const segmentLengths: number[] = [];
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    const length = haversineDistance(lat1, lon1, lat2, lon2);
    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength === 0) {
    return [{ lat: coordinates[0][1], lon: coordinates[0][0] }];
  }

  const points: Array<{ lat: number; lon: number }> = [];
  const interval = totalLength / (count - 1);
  
  let targetDistance = 0;
  let currentDistance = 0;
  let currentSegmentIndex = 0;
  
  // Add first point
  points.push({ lat: coordinates[0][1], lon: coordinates[0][0] });
  
  for (let i = 1; i < count - 1; i++) {
    targetDistance = i * interval;
    
    // Find the segment containing this target distance
    while (currentSegmentIndex < segmentLengths.length && 
           currentDistance + segmentLengths[currentSegmentIndex] < targetDistance) {
      currentDistance += segmentLengths[currentSegmentIndex];
      currentSegmentIndex++;
    }
    
    if (currentSegmentIndex >= segmentLengths.length) break;
    
    // Interpolate within the current segment
    const remainingDistance = targetDistance - currentDistance;
    const fraction = remainingDistance / segmentLengths[currentSegmentIndex];
    
    const [lon1, lat1] = coordinates[currentSegmentIndex];
    const [lon2, lat2] = coordinates[currentSegmentIndex + 1];
    
    const lat = lat1 + (lat2 - lat1) * fraction;
    const lon = lon1 + (lon2 - lon1) * fraction;
    
    points.push({ lat, lon });
  }
  
  // Add last point
  const lastCoord = coordinates[coordinates.length - 1];
  points.push({ lat: lastCoord[1], lon: lastCoord[0] });
  
  return points;
}

/**
 * Interpolate a point between two coordinates
 */
export function interpolatePoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): { lat: number; lon: number } {
  return {
    lat: lat1 + (lat2 - lat1) * fraction,
    lon: lon1 + (lon2 - lon1) * fraction,
  };
}
