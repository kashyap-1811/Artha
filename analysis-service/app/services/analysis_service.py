from fastapi import HTTPException
from app.core.config import API_GATEWAY_URL
from motor.motor_asyncio import AsyncIOMotorClient
import requests

async def fetch_company_health_data(company_id: str, headers: dict, db_client: AsyncIOMotorClient) -> dict:
    # Use internal gateway route
    budgets_resp = requests.get(
        f"{API_GATEWAY_URL}/internal/budget/api/budgets/all",
        params={"companyId": company_id},
        headers=headers,
        timeout=5
    )
    budgets = budgets_resp.json() if budgets_resp.json() and budgets_resp.status_code == 200 else []
    
    total_budget = 0.0
    category_map = {}

    for b in budgets:
        total_budget += float(b.get("totalAmount", 0))
        for alc in b.get("allocations", []):
            cat_name = alc.get("categoryName", "Uncategorized")
            allocated = float(alc.get("allocatedAmount", 0.0))
            if cat_name not in category_map:
                category_map[cat_name] = {"name": cat_name, "allocated": 0.0, "spent": 0.0}
            category_map[cat_name]["allocated"] += allocated

    # Next, get the cached expenses from MongoDB Atlas
    db = db_client.get_database("artha_analysis")
    collection = db.get_collection("budget_expenses")
    
    total_expense = 0.0
    async for doc in collection.find({"company_id": company_id}):
        spent = doc.get("total_approved_amount", 0.0)
        total_expense += spent
        
        # Add spent info to categories
        for exp in doc.get("expense_history", []):
            cat_name = exp.get("category", "Uncategorized") or "Uncategorized"
            amount = float(exp.get("amount", 0.0))
            if cat_name not in category_map:
                category_map[cat_name] = {"name": cat_name, "allocated": 0.0, "spent": 0.0}
            category_map[cat_name]["spent"] += amount

    health_score = "On Track"
    if total_budget > 0:
        pct = total_expense / total_budget
        if pct >= 1.0:
            health_score = "Over Budget"
        elif pct >= 0.8:
            health_score = "At Risk"

    return {
        "company_id": company_id,
        "total_budget": total_budget,
        "total_expense": total_expense,
        "remaining": total_budget - total_expense,
        "health_score": health_score,
        "category_breakdown": list(category_map.values())
    }

async def fetch_budget_analysis_data(budget_id: str, headers: dict, db_client: AsyncIOMotorClient) -> dict:
    # Use internal gateway route
    budget_resp = requests.get(
        f"{API_GATEWAY_URL}/internal/budget/api/budgets/{budget_id}/details",
        headers=headers,
        timeout=5
    )
    if budget_resp.status_code != 200:
        print(f"FAILED TO FETCH BUDGET FROM GATEWAY: {budget_resp.status_code} {budget_resp.text}")
        raise HTTPException(status_code=404, detail="Budget not found")
    budget = budget_resp.json()

    total_amount = float(budget.get("totalAmount", 0))
    allocations = budget.get("allocations", [])

    # Map allocations to get defined categories and their limits
    category_map = {}
    for alc in allocations:
        cat_name = alc.get("categoryName", "Uncategorized")
        category_map[cat_name] = {
            "name": cat_name,
            "allocated": float(alc.get("allocatedAmount", 0.0)),
            "spent": 0.0
        }

    # Get cached expenses from Mongo Atlas
    db = db_client.get_database("artha_analysis")
    collection = db.get_collection("budget_expenses")
    doc = await collection.find_one({"budget_id": budget_id})
    
    total_expense = doc.get("total_approved_amount", 0.0) if doc else 0.0
    expense_history = doc.get("expense_history", []) if doc else []

    # Map spent amounts to categories
    for exp in expense_history:
        cat_name = exp.get("category", "Uncategorized")
        if not cat_name:
             cat_name = "Uncategorized"
        
        if cat_name not in category_map:
            category_map[cat_name] = {"name": cat_name, "allocated": 0.0, "spent": 0.0}
        
        category_map[cat_name]["spent"] += float(exp.get("amount", 0.0))
        
    category_breakdown = list(category_map.values())

    health_score = "On Track"
    if total_amount > 0:
        pct = total_expense / total_amount
        if pct >= 1.0:
            health_score = "Over Budget"
        elif pct >= 0.8:
            health_score = "At Risk"

    return {
        "budget_id": budget_id,
        "budget_name": budget.get("name"),
        "total_amount": total_amount,
        "total_expense": total_expense,
        "remaining": total_amount - total_expense,
        "health_score": health_score,
        "category_breakdown": category_breakdown
    }

async def fetch_active_budget_analysis_data(company_id: str, headers: dict, db_client: AsyncIOMotorClient) -> dict:
    # Use internal gateway route
    budgets_resp = requests.get(
        f"{API_GATEWAY_URL}/internal/budget/api/budgets/active",
        params={"companyId": company_id},
        headers=headers,
        timeout=5
    )
    budgets = budgets_resp.json() if budgets_resp.status_code == 200 else []

    if not budgets:
        return {
            "company_id": company_id,
            "active_budgets": [],
            "overall_category_breakdown": [],
            "total_budget": 0.0,
            "total_expense": 0.0,
            "remaining": 0.0,
            "health_score": "No Active Budget"
        }

    db = db_client.get_database("artha_analysis")
    collection = db.get_collection("budget_expenses")

    budget_analyses = []
    overall_budget = 0.0
    overall_expense = 0.0
    overall_category_map = {}

    for budget in budgets:
        budget_id = budget.get("id")
        total_amount = float(budget.get("totalAmount", 0))
        overall_budget += total_amount

        doc = await collection.find_one({"budget_id": budget_id})
        budget_expense = doc.get("total_approved_amount", 0.0) if doc else 0.0
        overall_expense += budget_expense

        # Map allocations for this specific budget
        category_map = {}
        for alc in budget.get("allocations", []):
            cat_name = alc.get("categoryName", "Uncategorized")
            allocated = float(alc.get("allocatedAmount", 0.0))
            
            # Per-budget map
            category_map[cat_name] = {"name": cat_name, "allocated": allocated, "spent": 0.0}
            
            # Overall company-wide map for active budgets
            if cat_name not in overall_category_map:
                overall_category_map[cat_name] = {"name": cat_name, "allocated": 0.0, "spent": 0.0}
            overall_category_map[cat_name]["allocated"] += allocated

        # Map expenses
        expense_history = doc.get("expense_history", []) if doc else []
        for exp in expense_history:
            cat_name = exp.get("category", "Uncategorized") or "Uncategorized"
            amount = float(exp.get("amount", 0.0))
            
            if cat_name not in category_map:
                category_map[cat_name] = {"name": cat_name, "allocated": 0.0, "spent": 0.0}
            category_map[cat_name]["spent"] += amount

            if cat_name not in overall_category_map:
                overall_category_map[cat_name] = {"name": cat_name, "allocated": 0.0, "spent": 0.0}
            overall_category_map[cat_name]["spent"] += amount

        health = "On Track"
        if total_amount > 0:
            pct = budget_expense / total_amount
            if pct >= 1.0:
                health = "Over Budget"
            elif pct >= 0.8:
                health = "At Risk"

        budget_analyses.append({
            "budget_id": budget_id,
            "budget_name": budget.get("name"),
            "total_amount": total_amount,
            "total_expense": budget_expense,
            "remaining": total_amount - budget_expense,
            "health_score": health,
            "category_breakdown": list(category_map.values())
        })

    overall_health = "On Track"
    if overall_budget > 0:
        pct = overall_expense / overall_budget
        if pct >= 1.0:
            overall_health = "Over Budget"
        elif pct >= 0.8:
            overall_health = "At Risk"

    return {
        "company_id": company_id,
        "active_budgets": budget_analyses,
        "overall_category_breakdown": list(overall_category_map.values()),
        "total_budget": overall_budget,
        "total_expense": overall_expense,
        "remaining": overall_budget - overall_expense,
        "health_score": overall_health
    }

async def fetch_category_breakdown(company_id: str, db_client: AsyncIOMotorClient) -> dict:
    import pandas as pd

    db = db_client.get_database("artha_analysis")
    collection = db.get_collection("budget_expenses")

    all_expenses = []
    
    # Fetch all expense histories for the company
    async for doc in collection.find({"company_id": company_id}):
        expense_history = doc.get("expense_history", [])
        for exp in expense_history:
            category = exp.get("category", "Uncategorized") or "Uncategorized"
            amount = float(exp.get("amount", 0.0))
            if amount > 0:
                all_expenses.append({"category": category, "amount": amount})

    if not all_expenses:
        return {
            "company_id": company_id,
            "total_spent_across_company": 0.0,
            "top_spending_category": "None",
            "breakdown": []
        }

    # Use Pandas for quick grouping and aggregation
    df = pd.DataFrame(all_expenses)
    
    # Group by category and sum amounts
    grouped = df.groupby("category", as_index=False)["amount"].sum()
    
    # Sort descending to find the top spender easily
    grouped = grouped.sort_values(by="amount", ascending=False)
    
    total_spent = float(grouped["amount"].sum())
    
    # Calculate percentages
    grouped["percentage"] = (grouped["amount"] / total_spent) * 100
    
    # Convert to list of dicts matching PercentageBreakdown schema
    breakdown = []
    for _, row in grouped.iterrows():
        breakdown.append({
            "category": str(row["category"]),
            "amount": float(row["amount"]),
            "percentage": float(row["percentage"])
        })
        
    top_spending_category = breakdown[0]["category"] if breakdown else "None"

    return {
        "company_id": company_id,
        "total_spent_across_company": total_spent,
        "top_spending_category": top_spending_category,
        "breakdown": breakdown
    }

async def fetch_spending_trend(company_id: str, db_client: AsyncIOMotorClient) -> dict:
    import pandas as pd
    from datetime import datetime

    db = db_client.get_database("artha_analysis")
    collection = db.get_collection("budget_expenses")

    all_expenses = []
    
    # Fetch all expense histories for the company
    async for doc in collection.find({"company_id": company_id}):
        expense_history = doc.get("expense_history", [])
        for exp in expense_history:
            date_raw = exp.get("date")
            amount = float(exp.get("amount", 0.0))
            if date_raw and amount > 0:
                # Java LocalDate often serializes to [YYYY, MM, DD] in JSON
                if isinstance(date_raw, list) and len(date_raw) >= 3:
                    date_str = f"{date_raw[0]}-{date_raw[1]:02d}-{date_raw[2]:02d}"
                else:
                    date_str = str(date_raw)
                all_expenses.append({"date": date_str, "amount": amount})

    if not all_expenses:
        return {
            "company_id": company_id,
            "current_month_spend": 0.0,
            "trend_direction": "FLAT",
            "mom_growth_percentage": 0.0,
            "trend_data": []
        }

    # Load into Pandas DataFrame
    df = pd.DataFrame(all_expenses)
    
    # Convert dates to actual datetime objects, handling various formats gracefully
    # Assuming 'spentDate' is stored as ISO string in Java Instant or LocalDate
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    
    # Drop any rows where date conversion failed
    df = df.dropna(subset=['date'])
    
    if df.empty:
        return {
            "company_id": company_id,
            "current_month_spend": 0.0,
            "trend_direction": "FLAT",
            "mom_growth_percentage": 0.0,
            "trend_data": []
        }

    # Format date to 'YYYY-MM' for monthly grouping
    df['month'] = df['date'].dt.to_period('M').astype(str)
    
    # Group by month and sum the amounts
    monthly_groupby = df.groupby('month', as_index=False)['amount'].sum()
    
    # Sort chronologically
    monthly_groupby = monthly_groupby.sort_values(by='month')
    
    # Calculate MoM percentage change
    # multiply by 100 for percentage, fill NaNs (first month) with 0.0
    monthly_groupby['growth_percentage'] = monthly_groupby['amount'].pct_change() * 100
    monthly_groupby['growth_percentage'] = monthly_groupby['growth_percentage'].fillna(0.0).round(2)
    
    # Extract the final list for JSON response
    trend_data = []
    for _, row in monthly_groupby.iterrows():
        trend_data.append({
            "month": str(row['month']),
            "amount": float(row['amount']),
            "growth_percentage": float(row['growth_percentage'])
        })
        
    # Get current month data (last element)
    current_month_spend = trend_data[-1]["amount"]
    mom_growth = trend_data[-1]["growth_percentage"]
    
    trend_direction = "FLAT"
    if mom_growth > 0:
        trend_direction = "UP"
    elif mom_growth < 0:
        trend_direction = "DOWN"

    return {
        "company_id": company_id,
        "current_month_spend": current_month_spend,
        "trend_direction": trend_direction,
        "mom_growth_percentage": mom_growth,
        "trend_data": trend_data
    }

async def fetch_top_spenders(budget_id: str, db_client: AsyncIOMotorClient) -> dict:
    import pandas as pd

    db = db_client.get_database("artha_analysis")
    collection = db.get_collection("budget_expenses")

    all_expenses = []
    
    # Fetch expense history strictly for this exact budget_id
    doc = await collection.find_one({"budget_id": budget_id})
    
    if doc:
        expense_history = doc.get("expense_history", [])
        for exp in expense_history:
            allocation_name = exp.get("category", "Uncategorized") or "Uncategorized"
            amount = float(exp.get("amount", 0.0))
            if amount > 0:
                all_expenses.append({"allocation_name": allocation_name, "amount_spent": amount})

    if not all_expenses:
        return {
            "budget_id": budget_id,
            "total_budget_spent": 0.0,
            "top_spenders": []
        }

    # Load into Pandas DataFrame
    df = pd.DataFrame(all_expenses)
    
    # Group by allocation_name and sum the amounts
    grouped = df.groupby("allocation_name", as_index=False)["amount_spent"].sum()
    
    # Sort descending to natively create the Leaderboard ranking
    grouped = grouped.sort_values(by="amount_spent", ascending=False)
    
    total_spent = float(grouped["amount_spent"].sum())
    
    # Calculate percentages
    grouped["percentage_of_total_spend"] = (grouped["amount_spent"] / total_spent) * 100
    
    # Convert to list of dicts matching SpenderData schema
    top_spenders = []
    for _, row in grouped.iterrows():
        top_spenders.append({
            "allocation_name": str(row["allocation_name"]),
            "amount_spent": float(row["amount_spent"]),
            "percentage_of_total_spend": float(row["percentage_of_total_spend"])
        })

    return {
        "budget_id": budget_id,
        "total_budget_spent": total_spent,
        "top_spenders": top_spenders
    }


