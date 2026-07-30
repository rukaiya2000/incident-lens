from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import ask, health, investigations, reports, videos
from app.config import get_settings
from app.graph.neo4j_client import close_driver
from app.graph.schema import apply_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    apply_schema()
    yield
    close_driver()


app = FastAPI(title="Incident Lens API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(investigations.router)
app.include_router(videos.router)
app.include_router(ask.router)
app.include_router(reports.router)

settings = get_settings()
app.mount("/media", StaticFiles(directory=str(settings.media_root_path)), name="media")
