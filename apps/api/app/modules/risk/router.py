from fastapi import APIRouter

router = APIRouter(prefix="/risk", tags=["Risk"])

@router.get("/")
def get_risk_root():
    return {"module": "risk", "status": "active"}
