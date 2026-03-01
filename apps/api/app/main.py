import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.agents.watchdog import WatchdogScheduler
from app.routes.agents import router as agents_router
from app.routes.profile import router as profile_router
from app.routes.checkin import router as checkin_router

logging.basicConfig(level=logging.INFO)

_watchdog = WatchdogScheduler(interval_minutes=5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _watchdog.start()
    yield
    _watchdog.stop()


app = FastAPI(title="AMBER API", lifespan=lifespan)
app.include_router(agents_router)
app.include_router(profile_router)
app.include_router(checkin_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
