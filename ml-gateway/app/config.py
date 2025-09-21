from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    conf_threshold: float = 0.25
    video_fps_sample: int = 2
    video_max_frames: int = 120
    port: int = 8000
    hf_token: Optional[str] = None  # Keep for future use if needed
    
    class Config:
        env_file = ".env"

settings = Settings()
