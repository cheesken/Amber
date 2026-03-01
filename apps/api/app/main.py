import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from apps.api.app.agents.watchdog import WatchdogScheduler
from apps.api.app.routes.agents import router as agents_router

logging.basicConfig(level=logging.INFO)

_watchdog = WatchdogScheduler(interval_minutes=5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _watchdog.start()
    yield
    _watchdog.stop()


app = FastAPI(title="AMBER API", lifespan=lifespan)
app.include_router(agents_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
