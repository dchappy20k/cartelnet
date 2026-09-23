from fastapi import APIRouter

router = APIRouter(prefix="/tenders", tags=["Tenders"])

@router.get("/")
def get_tenders_root():
    return {"module": "tenders", "status": "active"}
