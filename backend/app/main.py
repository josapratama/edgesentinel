from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings, SNAPSHOTS_DIR
from app.core.database import init_db
from app.services.camera_manager import camera_manager
from app.api import cameras, events, rules, streams, system

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("edgesentinel")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing EdgeSentinel database...")
    await init_db()
    logger.info("Starting camera stream workers...")
    await camera_manager.initialize_all()
    logger.info(f"EdgeSentinel AI NVR ready on {settings.HOST}:{settings.PORT}")
    yield
    logger.info("Shutting down camera stream workers...")
    await camera_manager.stop_all()
    logger.info("EdgeSentinel stopped cleanly.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Edge AI Smart NVR & Vision Security Hub with WhatsApp Alerts",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for snapshots
app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")

# Mount API Routers
app.include_router(cameras.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(rules.router, prefix="/api")
app.include_router(streams.router, prefix="/api")
app.include_router(system.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "active_cameras": len(camera_manager.workers)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

