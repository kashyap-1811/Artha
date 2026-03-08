# Analysis Service Blueprint

The standalone **Analysis Service** (Python FastAPI) is designed to consume data from the existing Java microservices (via API or direct Data Lake access) and compute complex statistics, trends, and aggregations that present high-level financial health metrics to the frontend UI.

## Core Responsibilities
1. **Budget Health Grading**: Calculate whether a company is "On Track", "At Risk", or "Over Budget" based on current allocations versus total budget constraints.
2. **Expense Categorization Trends**: Perform aggregation algorithms on expenses to provide month-over-month (MoM) breakdowns by category.
3. **Forecasting**: Use time-series logic on historical expenses to forecast next month's expected expenditure.

## Architecture Context
Since the existing ecosystem runs on **Java Spring Boot**, doing complex data science or statistical data processing is much faster to iterate on using Python libraries like `pandas` and `numpy`. Integrating this via Netflix Eureka means the frontend doesn't need to know Python is handling these requests.

## Planned API Endpoints (Python)

All endpoints will be registered under the prefix `http://localhost:8080/analysis/` (routed via API Gateway).

### 1. `GET /analysis/company/{companyId}/health`
- **Purpose**: Returns a high-level "scorecard" for the company.
- **Output**: Total Budgets, Total Spend, Remaining Balance, and an overall `HealthScore` metric.

### 2. `GET /analysis/budget/{budgetId}/breakdown`
- **Purpose**: Generates dynamic charts data for a specific budget.
- **Output**: JSON payload structured for frontend charting libraries (e.g. `Recharts` or `Chart.js`), tracking allocations vs actual approved expenses.

### 3. `GET /analysis/company/{companyId}/expense-trends`
- **Purpose**: Tracks spending velocity over time.
- **Output**: Array of grouped spending (by day/week) to plot a line-chart revealing peak spending periods.

## Event-Driven Architecture (Performance Optimization)
To avoid recalculating complex aggregations on every frontend load, the Analysis Service uses an **Event-Driven CQRS Pattern**:
1. **MongoDB Atlas**: Used to cache the pre-calculated analysis results (e.g., total expenses per company). Since it's hosted in Atlas, all team members share the same data state.
2. **Apache Kafka (Dockerized)**: Used as the message broker. The Java `expense-service` publishes an `ExpenseApprovedEvent` to a Kafka topic.
3. **Python Kafka Listener**: The Analysis Service constantly listens to the Kafka topic. When an expense is approved, it performs an atomic update (`$inc`) in MongoDB Atlas, ensuring the dashboard data is always instantly up-to-date with O(1) read performance.

## Implementation Steps
1. **Database Setup**: Connect the FastAPI application to MongoDB Atlas using `motor` (async MongoDB driver).
2. **Kafka Infrastructure**: Spin up Apache Kafka and Zookeeper locally using Docker Compose.
3. **Java Producer**: Configure the `expense-service` to publish messages to Kafka upon expense approval.
4. **Python Consumer**: Build a background listener in the Python service to consume Kafka messages and update the MongoDB Atlas collections.
5. **API Refactor**: Update [app/routers/analysis.py](file:///Users/apple/Jasmita%20Vekariya/CE-SEM%20VI/SDP/Artha/Artha/analysis-service/app/routers/analysis.py) API routes to fetch the pre-calculated metrics directly from MongoDB Atlas instead of doing on-the-fly Pandas aggregations.

## New Feature: Spending by Category Analysis

### Endpoint Specification
**Endpoint**: `GET /analysis/company/{company_id}/category-breakdown`
**Purpose**: Provide a company-wide aggregation of all expenses grouped by category, calculate the percentage of total spending for each, and identify the top spending category.

### Proposed JSON Output Format
This format is optimized for direct use in frontend charting libraries.
```json
{
  "company_id": "test-company-id",
  "total_spent_across_company": 10000.0,
  "top_spending_category": "Software",
  "breakdown": [
    {
      "category": "Software",
      "amount": 6000.0,
      "percentage": 60.0
    },
    {
      "category": "Travel",
      "amount": 3000.0,
      "percentage": 30.0
    },
    {
      "category": "Office Supplies",
      "amount": 1000.0,
      "percentage": 10.0
    }
  ]
}
```

### Frontend Integration (React + Recharts Example)
The frontend can easily consume the [breakdown](file:///Users/apple/Jasmita%20Vekariya/CE-SEM%20VI/SDP/Artha/Artha/analysis-service/app/routers/analysis.py#53-60) array to generate a beautiful Pie Chart or Donut Chart.

```javascript
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function CategoryPieChart({ data }) {
  // data here is the JSON response from the backend
  
  return (
    <div className="chart-container">
      <h3>Top Spender: {data.top_spending_category}</h3>
      <PieChart width={400} height={400}>
        <Pie
          data={data.breakdown}
          dataKey="amount"       // The value determining the slice size
          nameKey="category"     // The label for the slice
          cx="50%"
          cy="50%"
          outerRadius={120}
          fill="#8884d8"
          label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
        >
          {data.breakdown.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${value}`} />
        <Legend />
      </PieChart>
    </div>
  );
}
```

### Backend Implementation Approach
1. **Data Source**: We will read directly from the existing `budget_expenses` collection in MongoDB Atlas. We will fetch all documents matching the `company_id`.
2. **Aggregation (Pandas)**: We will extract the `expense_history` arrays from all matched budgets, load them into a Pandas DataFrame, group by [category](file:///Users/apple/Jasmita%20Vekariya/CE-SEM%20VI/SDP/Artha/Artha/analysis-service/app/routers/analysis.py#53-60), sum the `amount`, calculate the percentage against the grand total, and sort descending to easily find the top spender.
3. **Safety Checklist**:
   - This is purely a read-only MongoDB query + Pandas processing endpoint.

## New Feature: Month-over-Month (MoM) Growth Trend

### Endpoint Specification
**Endpoint**: `GET /analysis/company/{company_id}/spending-trend`
**Purpose**: Understand if spending is accelerating or slowing down by grouping expenses by month and calculating MoM percentage changes.

### Proposed JSON Output Format
This format is perfect for a time-series Bar or Line chart.
```json
{
  "company_id": "test-company-id",
  "current_month_spend": 25000.0,
  "trend_direction": "UP", 
  "mom_growth_percentage": 15.5, 
  "trend_data": [
    {
      "month": "2026-01",
      "amount": 20000.0,
      "growth_percentage": 0.0
    },
    {
      "month": "2026-02",
      "amount": 21645.0,
      "growth_percentage": 8.2
    },
    {
      "month": "2026-03",
      "amount": 25000.0,
      "growth_percentage": 15.5
    }
  ]
}
```

### Frontend Integration (React + Recharts Example)
Use a Line Chart to visualize the spending velocity over time.

```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function SpendingTrendChart({ data }) {
  // data here is the JSON response from the backend
  
  return (
    <div className="chart-container">
      <h3>
        Spending Trend: {data.trend_direction === 'DOWN' ? '↓ Improving' : '↑ Accelerating'} 
        ({data.mom_growth_percentage}%)
      </h3>
      <LineChart width={600} height={300} data={data.trend_data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value, name) => [name === 'amount' ? `$${value}` : `${value}%`, name]} />
        <Legend />
        <Line type="monotone" dataKey="amount" stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    </div>
  );
}
```

### Backend Implementation Approach
1. **Data Source**: Re-use the existing MongoDB Atlas query fetching `budget_expenses` by `company_id`.
2. **Aggregation (Pandas)**: 
   - Extract `amount` and [date](file:///Users/apple/Jasmita%20Vekariya/CE-SEM%20VI/SDP/Artha/Artha/artha-frontend/src/api/users.js#47-60) from all `expense_history` records.
   - Convert [date](file:///Users/apple/Jasmita%20Vekariya/CE-SEM%20VI/SDP/Artha/Artha/artha-frontend/src/api/users.js#47-60) to a Pandas Datetime object and format as `YYYY-MM`.
   - Group by `YYYY-MM` and sum the amounts.
   - Use Pandas `pct_change()` function on the sorted monthly totals to automatically calculate the MoM growth percentage.
3. **Safety Checklist**: Kafka consumer and existing endpoints remain completely untouched.

## New Feature: Employee Spending Leaderboard

### Endpoint Specification
**Endpoint**: `GET /analysis/budget/{budget_id}/top-spenders`
**Purpose**: Analyze which specific allocations (departments, projects, or users) are draining a specific budget the fastest by ranking them by total amount spent.

### Proposed JSON Output Format
This format is perfect for a Bar Chart or a Top Spenders text list in the frontend.
```json
{
  "budget_id": "test-budget-id",
  "total_budget_spent": 10000.0,
  "top_spenders": [
    {
      "allocation_name": "Marketing Team",
      "amount_spent": 6000.0,
      "percentage_of_total_spend": 60.0
    },
    {
      "allocation_name": "Server Infrastructure",
      "amount_spent": 3000.0,
      "percentage_of_total_spend": 30.0
    },
    {
      "allocation_name": "John Doe",
      "amount_spent": 1000.0,
      "percentage_of_total_spend": 10.0
    }
  ]
}
```

### Frontend Integration (React + Recharts Example)
A horizontal Bar Chart is the best way to visualize a "Leaderboard" because it organically looks like rankings from 1st place to last place.

```javascript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TopSpendersLeaderboard({ data }) {
  // data here is the JSON response from the backend
  
  return (
    <div className="chart-container" style={{ width: '100%', height: 400 }}>
      <h3>Top Spenders Leaderboard</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data.top_spenders}
          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(value) => `$${value}`} />
          {/* YAxis shows the allocation name (e.g., Marketing Team) */}
          <YAxis type="category" dataKey="allocation_name" width={150} />
          <Tooltip formatter={(value, name) => [name === 'amount_spent' ? `$${value}` : `${value}%`, 'Amount']} />
          <Legend />
          <Bar dataKey="amount_spent" fill="#ff7300" name="Total Spent ($)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Backend Implementation Approach
1. **Data Source**: We query the `budget_expenses` collection in MongoDB for the specific `budget_id`.
2. **Aggregation (Pandas)**: 
   - Extract the `expense_history` array array for that specific budget.
   - Load the array into a Pandas DataFrame.
   - Group by [category](file:///Users/apple/Jasmita%20Vekariya/CE-SEM%20VI/SDP/Artha/Artha/analysis-service/app/routers/analysis.py#53-60) (which represents the `allocationName` injected by our Kafka consumer).
   - Sum the `amount`.
   - Sort the DataFrame in **descending** order (highest spenders at index 0).
   - Calculate `% of total spend` for each allocation.
3. **Safety Checklist**: Kafka consumer and Java services remain completely untouched.
