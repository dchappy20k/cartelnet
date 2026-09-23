from fastapi import APIRouter

router = APIRouter(prefix="/bids", tags=["Bids"])

@router.get("/")
def get_bids_root():
    return {"module": "bids", "status": "active"}
