from fastapi import APIRouter, HTTPException, Query
import httpx
from typing import List, Dict

router = APIRouter(prefix="/api/v1/geocoding", tags=["geocoding"])

@router.get("/search")
async def geocode_address(
    q: str = Query(..., description="Search query"),
    countrycodes: str = Query("lk", description="Country code filter"),
    limit: int = Query(5, description="Maximum number of results")
) -> List[Dict]:
    """
    Proxy endpoint for OpenStreetMap Nominatim geocoding to avoid CORS issues.
    """
    try:
        params = {
            "q": q,
            "format": "json",
            "countrycodes": countrycodes,
            "limit": limit,
            "addressdetails": "1"
        }
        
        headers = {
            "User-Agent": "RiskRouteVision/1.0 (Risk Assessment Application)"
        }
        
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
        return data
        
    except httpx.HTTPError as e:
        raise HTTPException(500, f"Geocoding service error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Internal server error: {str(e)}")
