from fastapi import APIRouter, HTTPException, Request
from app.services.analysis_service import (
    fetch_company_health_data,
    fetch_budget_analysis_data,
    fetch_active_budget_analysis_data,
    fetch_category_breakdown,
    fetch_spending_trend,
    fetch_top_spenders
)
from app.models.schemas import CompanyHealthResponse, ActiveBudgetAnalysisResponse, CategoryAnalysisResponse, SpendingTrendResponse, TopSpendersResponse

router = APIRouter(
    tags=["Analysis"]
)

@router.get("/company/{company_id}/health", response_model=CompanyHealthResponse)
async def get_company_health(company_id: str, request: Request):
    try:
        auth_header = request.headers.get("Authorization", "")
        user_id = request.headers.get("X-User-Id", "analysis-service")
        headers = {"Authorization": auth_header, "X-User-Id": user_id}
        db_client = request.app.state.mongodb_client
        
        return await fetch_company_health_data(company_id, headers, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budget/{budget_id}/analysis")
async def get_budget_analysis(budget_id: str, request: Request):
    try:
        auth_header = request.headers.get("Authorization", "")
        user_id = request.headers.get("X-User-Id", "analysis-service")
        headers = {"Authorization": auth_header, "X-User-Id": user_id}
        db_client = request.app.state.mongodb_client

        return await fetch_budget_analysis_data(budget_id, headers, db_client)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/company/{company_id}/active-budget", response_model=ActiveBudgetAnalysisResponse)
async def get_active_budget_analysis(company_id: str, request: Request):
    try:
        auth_header = request.headers.get("Authorization", "")
        user_id = request.headers.get("X-User-Id", "analysis-service")
        headers = {"Authorization": auth_header, "X-User-Id": user_id}
        db_client = request.app.state.mongodb_client

        return await fetch_active_budget_analysis_data(company_id, headers, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/company/{company_id}/category-breakdown", response_model=CategoryAnalysisResponse)
async def get_category_breakdown(company_id: str, request: Request):
    try:
        db_client = request.app.state.mongodb_client
        return await fetch_category_breakdown(company_id, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/company/{company_id}/spending-trend", response_model=SpendingTrendResponse)
async def get_spending_trend(company_id: str, request: Request):
    try:
        db_client = request.app.state.mongodb_client
        return await fetch_spending_trend(company_id, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budget/{budget_id}/top-spenders", response_model=TopSpendersResponse)
async def get_top_spenders(budget_id: str, request: Request):
    try:
        db_client = request.app.state.mongodb_client
        return await fetch_top_spenders(budget_id, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
