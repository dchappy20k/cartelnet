from fastapi import APIRouter

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])

@router.get("/")
def get_ingestion_root():
    return {"module": "ingestion", "status": "active"}
