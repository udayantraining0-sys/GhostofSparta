from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1.router import api_router
from app.api.ws.voice_ws import router as voice_ws_router

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(voice_ws_router)


@app.on_event("startup")
async def startup():
    from app.memory.memory_manager import memory_manager
    from app.memory.long_term import long_term_memory
    await long_term_memory.initialize()


@app.get("/health")
async def health():
    return {"status": "operational", "system": "KRATOS", "version": "0.1.0"}
