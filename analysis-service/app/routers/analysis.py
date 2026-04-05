from fastapi import APIRouter, HTTPException, Request
import time
from app.services.analysis_service import (
    fetch_company_health_data,
    fetch_budget_analysis_data,
    fetch_active_budget_analysis_data,
    fetch_category_breakdown,
    fetch_spending_trend,
    fetch_top_spenders
)
from app.models.schemas import CompanyHealthResponse, ActiveBudgetAnalysisResponse, CategoryAnalysisResponse, SpendingTrendResponse, TopSpendersResponse
from app.core.cache import cache_response

router = APIRouter(
    tags=["Analysis"]
)

@router.get("/company/{company_id}/health", response_model=CompanyHealthResponse)
@cache_response(ttl=300, key_prefix="company_analysis")
async def get_company_health(company_id: str, request: Request):
    start_time = time.time()
    try:
        auth_header = request.headers.get("Authorization", "")
        user_id = request.headers.get("X-User-Id", "analysis-service")
        headers = {"Authorization": auth_header, "X-User-Id": user_id}
        db_client = request.app.state.mongodb_client
        
        return await fetch_company_health_data(company_id, headers, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        end_time = time.time()
        print(f"====== Service Execution Time [Get Company Health]: {int((end_time - start_time) * 1000)}ms ======")

@router.get("/budget/{budget_id}/analysis")
@cache_response(ttl=300, key_prefix="budget_analysis")
async def get_budget_analysis(budget_id: str, request: Request):
    start_time = time.time()
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
    finally:
        end_time = time.time()
        print(f"====== Service Execution Time [Get Budget Analysis]: {int((end_time - start_time) * 1000)}ms ======")

@router.get("/company/{company_id}/active-budget", response_model=ActiveBudgetAnalysisResponse)
@cache_response(ttl=300, key_prefix="company_analysis")
async def get_active_budget_analysis(company_id: str, request: Request):
    start_time = time.time()
    try:
        auth_header = request.headers.get("Authorization", "")
        user_id = request.headers.get("X-User-Id", "analysis-service")
        headers = {"Authorization": auth_header, "X-User-Id": user_id}
        db_client = request.app.state.mongodb_client

        return await fetch_active_budget_analysis_data(company_id, headers, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        end_time = time.time()
        print(f"====== Service Execution Time [Get Active Budget Analysis]: {int((end_time - start_time) * 1000)}ms ======")

@router.get("/company/{company_id}/category-breakdown", response_model=CategoryAnalysisResponse)
@cache_response(ttl=300, key_prefix="company_analysis")
async def get_category_breakdown(company_id: str, request: Request):
    start_time = time.time()
    try:
        db_client = request.app.state.mongodb_client
        return await fetch_category_breakdown(company_id, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        end_time = time.time()
        print(f"====== Service Execution Time [Get Category Breakdown]: {int((end_time - start_time) * 1000)}ms ======")

@router.get("/company/{company_id}/spending-trend", response_model=SpendingTrendResponse)
@cache_response(ttl=300, key_prefix="company_analysis")
async def get_spending_trend(company_id: str, request: Request):
    start_time = time.time()
    try:
        db_client = request.app.state.mongodb_client
        return await fetch_spending_trend(company_id, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        end_time = time.time()
        print(f"====== Service Execution Time [Get Spending Trend]: {int((end_time - start_time) * 1000)}ms ======")

@router.get("/budget/{budget_id}/top-spenders", response_model=TopSpendersResponse)
@cache_response(ttl=300, key_prefix="budget_analysis")
async def get_top_spenders(budget_id: str, request: Request):
    start_time = time.time()
    try:
        db_client = request.app.state.mongodb_client
        return await fetch_top_spenders(budget_id, db_client)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        end_time = time.time()
        print(f"====== Service Execution Time [Get Top Spenders]: {int((end_time - start_time) * 1000)}ms ======")

