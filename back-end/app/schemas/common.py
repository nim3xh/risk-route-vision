from pydantic import BaseModel, conlist
from typing import List, Literal

LatLng = conlist(float, min_length=2, max_length=2)
VehicleType = Literal["MOTORCYCLE","THREE_WHEELER","CAR","BUS","LORRY","VAN"]

class PolylineRequest(BaseModel):
    coordinates: List[LatLng]
