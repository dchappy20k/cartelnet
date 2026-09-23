from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import CartelNetException, cartelnet_exception_handler
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    yield
    # Shutdown tasks


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CartelNet — Procurement Risk Intelligence SaaS API",
    lifespan=lifespan,
)

# Exception handlers
app.add_exception_handler(CartelNetException, cartelnet_exception_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Health Endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    """Service health check endpoint."""
    return {
        "status": "ok",
        "app": "CartelNet API",
        "version": settings.VERSION,
    }


# Mount V1 Master API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
