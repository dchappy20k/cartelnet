from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.organizations.router import router as org_router
from app.modules.tenders.router import router as tenders_router
from app.modules.companies.router import router as companies_router
from app.modules.bids.router import router as bids_router
from app.modules.risk.router import router as risk_router
from app.modules.network.router import router as network_router
from app.modules.investigations.router import router as investigations_router
from app.modules.ingestion.router import router as ingestion_router
from app.modules.reports.router import router as reports_router
from app.modules.government_uploads.router import router as government_uploads_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(org_router)
api_router.include_router(tenders_router)
api_router.include_router(companies_router)
api_router.include_router(bids_router)
api_router.include_router(risk_router)
api_router.include_router(network_router)
api_router.include_router(investigations_router)
api_router.include_router(ingestion_router)
api_router.include_router(reports_router)
api_router.include_router(government_uploads_router)
