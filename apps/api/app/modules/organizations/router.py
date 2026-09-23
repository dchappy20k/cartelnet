from fastapi import APIRouter

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.get("/")
def get_organizations_root():
    return {"module": "organizations", "status": "active"}
