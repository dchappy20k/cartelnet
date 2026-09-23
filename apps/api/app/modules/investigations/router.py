from fastapi import APIRouter

router = APIRouter(prefix="/investigations", tags=["Investigations"])

@router.get("/")
def get_investigations_root():
    return {"module": "investigations", "status": "active"}
