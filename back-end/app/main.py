from fastapi import FastAPI
from .core.cors import setup_cors
from .core.config import settings
from .routers import risk, datasets, alerts

def create_app():
    app = FastAPI(title=settings.app_name)
    setup_cors(app)
    app.include_router(risk.router)
    app.include_router(datasets.router)
    app.include_router(alerts.router)

    @app.get("/health")
    def health():
        return {"status":"ok","env":settings.app_env}
    return app

app = create_app()
