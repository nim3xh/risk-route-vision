from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Risk Route Vision API"
    app_env: str = "dev"
    port: int = 8080
    frontend_origin: str = "http://localhost:5173"
    openmeteo_base: str = "https://api.open-meteo.com/v1/forecast"
    openweather_api_key: str = ""
    openweather_base: str = "https://api.openweathermap.org/data/2.5"
    risk_model_path: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
