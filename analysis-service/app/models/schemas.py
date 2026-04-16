from pydantic import BaseModel
from typing import List, Optional

class CategoryBreakdown(BaseModel):
    name: str
    allocated: float
    spent: float

class BudgetAnalysisBase(BaseModel):
    budget_id: str
    budget_name: str
    total_amount: float
    total_expense: float
    remaining: float
    health_score: str
    category_breakdown: List[CategoryBreakdown]

class ActiveBudgetAnalysisResponse(BaseModel):
    company_id: str
    active_budgets: List[BudgetAnalysisBase]
    overall_category_breakdown: List[CategoryBreakdown]
    total_budget: float
    total_expense: float
    remaining: float
    health_score: str

class BudgetStats(BaseModel):
    total: int
    on_track: int
    at_risk: int
    over_budget: int

class TopBudget(BaseModel):
    budget_id: str
    name: str
    spent_amount: float
    total_amount: float
    usage_percentage: float

class CompanyHealthResponse(BaseModel):
    company_id: str
    total_budget: float
    total_expense: float
    remaining: float
    health_score: str
    category_breakdown: List[CategoryBreakdown]
    budget_stats: Optional[BudgetStats] = None
    top_budgets: Optional[List[TopBudget]] = None
    estimated_runway_months: Optional[float] = None


class PercentageBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float

class CategoryAnalysisResponse(BaseModel):
    company_id: str
    total_spent_across_company: float
    top_spending_category: str
    breakdown: List[PercentageBreakdown]

class TrendDataPoint(BaseModel):
    month: str
    amount: float
    growth_percentage: float

class SpendingTrendResponse(BaseModel):
    company_id: str
    current_month_spend: float
    trend_direction: str
    mom_growth_percentage: float
    trend_data: List[TrendDataPoint]

class SpenderData(BaseModel):
    allocation_name: str
    amount_spent: float
    percentage_of_total_spend: float

class TopSpendersResponse(BaseModel):
    budget_id: str
    total_budget_spent: float
    top_spenders: List[SpenderData]

