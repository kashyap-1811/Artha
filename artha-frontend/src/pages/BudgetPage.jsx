import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBudgetDetails } from "../api/budgets";

function BudgetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId, budgetId } = useParams();
  const [budget, setBudget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!budgetId) return;

    async function loadBudgetDetails() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getBudgetDetails(budgetId);
        setBudget(data);
      } catch (requestError) {
        setError(requestError.message || "Failed to load budget details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadBudgetDetails();
  }, [budgetId, navigate]);

  const budgetName = location.state?.budgetName || budget?.name || "Budget";
  const companyName = location.state?.companyName || "Company";

  const allocations = useMemo(() => {
    return Array.isArray(budget?.allocations) ? budget.allocations : [];
  }, [budget]);

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
          <button className="back-btn" onClick={() => navigate(`/company/${companyId}`)} type="button">
            Back
          </button>
          <h1>{budgetName}</h1>
          <p>{companyName}</p>
        </header>

        {error && <p className="dashboard-error">{error}</p>}

        {isLoading ? (
          <p className="dashboard-muted">Loading allocations...</p>
        ) : allocations.length === 0 ? (
          <p className="dashboard-muted">No allocations found for this budget.</p>
        ) : (
          <section className="budget-group">
            <h2>Allocations</h2>
            <div className="allocation-grid">
              {allocations.map((allocation) => (
                <article className="allocation-tile" key={allocation.id}>
                  <div className="allocation-head">
                    <strong>{allocation.categoryName}</strong>
                    <span>{allocation.alertThreshold}%</span>
                  </div>
                  <p>Rs {formatAmount(allocation.allocatedAmount)}</p>
                  <small>Alert threshold</small>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default BudgetPage;
