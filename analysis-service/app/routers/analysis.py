from fastapi import APIRouter

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"]
)

@router.get("/summary")
def get_summary():
    return {
        "total_budget": 0,
        "total_expense": 0,
        "remaining": 0
    }