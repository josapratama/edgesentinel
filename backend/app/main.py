from contextlib import asynccontextmanager
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings, SNAPSHOTS_DIR, RECORDINGS_DIR
from app.core.database import init_db
from app.services.camera_manager import camera_manager
from app.services.storage_cleaner import storage_cleaner
from app.services.alert_service import alert_service
from app.api import cameras, events, rules, streams, system, whatsapp_bot

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
    storage_cleaner.start()
    alert_service.start_scheduler()
    logger.info(f"EdgeSentinel AI NVR ready on {settings.HOST}:{settings.PORT}")
    yield
    logger.info("Shutting down camera stream workers...")
    storage_cleaner.stop()
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

# Static file serving for snapshots & recordings
app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")
app.mount("/recordings", StaticFiles(directory=str(RECORDINGS_DIR)), name="recordings")

# Mount API Routers
app.include_router(cameras.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(rules.router, prefix="/api")
app.include_router(streams.router, prefix="/api")
app.include_router(system.router, prefix="/api")
app.include_router(whatsapp_bot.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "active_cameras": len(camera_manager.workers)
    }


# Static frontend SPA serving (Serves React Web Dashboard on root /)
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():
    if (STATIC_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

