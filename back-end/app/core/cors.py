from fastapi.middleware.cors import CORSMiddleware
from .config import settings

def setup_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
