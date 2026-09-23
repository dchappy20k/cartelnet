from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/")
def get_reports_root():
    return {"module": "reports", "status": "active"}
