from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.get("/")
def get_auth_root():
    return {"module": "auth", "status": "active"}
