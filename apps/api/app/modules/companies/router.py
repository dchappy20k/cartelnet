from fastapi import APIRouter

router = APIRouter(prefix="/companies", tags=["Companies"])

@router.get("/")
def get_companies_root():
    return {"module": "companies", "status": "active"}
