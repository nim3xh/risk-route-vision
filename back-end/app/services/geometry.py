from typing import List, Tuple
from math import radians, sin, cos, atan2, sqrt
Coord = Tuple[float, float]

def haversine_m(p1: Coord, p2: Coord) -> float:
    R = 6371000.0
    lat1, lon1 = map(radians, p1)
    lat2, lon2 = map(radians, p2)
    dlat, dlon = (lat2-lat1, lon2-lon1)
    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2*R*atan2(sqrt(a), sqrt(1-a))

def curvature_estimate(coords: List[Coord]) -> float:
    if len(coords) < 3: return 0.0
    angles = per_point_curvature(coords)
    return float(sum(angles)/len(angles))

def per_point_curvature(coords: List[Coord]) -> List[float]:
    if len(coords) < 3: return [0.0] * len(coords)
    import numpy as np
    angles = [0.0] # First point has no curvature
    for i in range(1, len(coords)-1):
        a, b, c = coords[i-1], coords[i], coords[i+1]
        v1 = (a[0]-b[0], a[1]-b[1])
        v2 = (c[0]-b[0], c[1]-b[1])
        num = v1[0]*v2[0] + v1[1]*v2[1]
        den = ((v1[0]**2+v1[1]**2)**0.5 * (v2[0]**2+v2[1]**2)**0.5 + 1e-9)
        angles.append(abs(np.arccos(max(-1,min(1,num/den)))))
    angles.append(0.0) # Last point has no curvature
    return [float(a) for a in angles]
