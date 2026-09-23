from fastapi import APIRouter

router = APIRouter(prefix="/network", tags=["Network"])

@router.get("/")
def get_network_root():
    return {"module": "network", "status": "active"}
