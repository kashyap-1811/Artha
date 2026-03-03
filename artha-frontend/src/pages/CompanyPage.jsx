import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getAllBudgets } from "../api/budgets";

function CompanyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useParams();
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!companyId) return;

    async function loadBudgets() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getAllBudgets(companyId);
        setBudgets(Array.isArray(data) ? data : []);
      } catch (requestError) {
        setError(requestError.message || "Failed to load budgets.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBudgets();
  }, [companyId, navigate]);

  const companyName = location.state?.companyName || "Company";

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const aDate = new Date(a.startDate || 0).getTime();
      const bDate = new Date(b.startDate || 0).getTime();
      return bDate - aDate;
    });
  }, [budgets]);

  const activeBudgets = sortedBudgets.filter((budget) => budget.status === "ACTIVE");
  const closedBudgets = sortedBudgets.filter((budget) => budget.status !== "ACTIVE");

  function formatAmount(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return "0.00";
    return parsed.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return (
    <main className="company-shell">
      <section className="company-card">
        <header className="company-header">
          <button className="back-btn" onClick={() => navigate("/dashboard")} type="button">
            Back
          </button>
          <h1>{companyName}</h1>
          <p>Company ID: {companyId}</p>
        </header>

        {error && <p className="dashboard-error">{error}</p>}

        {isLoading ? (
          <p className="dashboard-muted">Loading budgets...</p>
        ) : (
          <div className="budget-sections">
            <section className="budget-group">
              <h2>Active Budgets</h2>
              {activeBudgets.length === 0 ? (
                <p className="dashboard-muted">No active budgets found.</p>
              ) : (
                <div className="budget-grid">
                  {activeBudgets.map((budget) => (
                    <button
                      className="budget-tile active"
                      key={budget.id}
                      onClick={() =>
                        navigate(`/company/${companyId}/budget/${budget.id}`, {
                          state: { budgetName: budget.name, companyName }
                        })
                      }
                      type="button"
                    >
                      <div className="budget-tile-head">
                        <strong>{budget.name}</strong>
                        <span>{budget.status}</span>
                      </div>
                      <p>Rs {formatAmount(budget.totalAmount)}</p>
                      <small>
                        {budget.startDate} to {budget.endDate}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="budget-group">
              <h2>Closed Budgets</h2>
              {closedBudgets.length === 0 ? (
                <p className="dashboard-muted">No closed budgets found.</p>
              ) : (
                <div className="budget-grid">
                  {closedBudgets.map((budget) => (
                    <button
                      className="budget-tile"
                      key={budget.id}
                      onClick={() =>
                        navigate(`/company/${companyId}/budget/${budget.id}`, {
                          state: { budgetName: budget.name, companyName }
                        })
                      }
                      type="button"
                    >
                      <div className="budget-tile-head">
                        <strong>{budget.name}</strong>
                        <span>{budget.status}</span>
                      </div>
                      <p>Rs {formatAmount(budget.totalAmount)}</p>
                      <small>
                        {budget.startDate} to {budget.endDate}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export default CompanyPage;
