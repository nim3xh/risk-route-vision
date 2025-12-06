from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
import asyncio, json
from ..services.weather_adapter import snapshot_for_polyline
from ..services.feature_engineering import build_features
from ..ml.model import predict_segment_scores

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])

@router.get("/stream")
async def stream(request: Request, clientId: str, vehicleType: str, lat: float, lon: float):
    async def gen():
        while True:
            if await request.is_disconnected():
                break
            coords = [[lat, lon],[lat+0.0009, lon+0.0009]]
            weather = await snapshot_for_polyline(coords, None)
            feats = build_features(coords, weather, vehicleType)
            seg = predict_segment_scores(feats, coords)
            overall = sum(seg)/len(seg)
            level = "LOW" if overall<0.33 else ("MEDIUM" if overall<0.66 else "HIGH")
            payload = {"overall": overall, "level": level, "reason": ["curvature" if feats["curvature"]>0.1 else "weather"]}
            yield {"event": "tick", "data": json.dumps(payload)}
            await asyncio.sleep(2)
    return EventSourceResponse(gen())
