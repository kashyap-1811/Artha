import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createAllocation, getBudgetDetails } from "../api/budgets";
import { getExpensesByBudget, createExpense, approveExpense, rejectExpense } from "../api/expenses";

const SELECT_STYLE = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--edge)',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  color: 'var(--text-main)',
  backgroundColor: 'var(--bg-card, #fff)'
};

function statusColor(status) {
  if (status === 'APPROVED') return '#22c55e';
  if (status === 'REJECTED') return '#ef4444';
  return '#f59e0b'; // PENDING
}

function BudgetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId, budgetId } = useParams();

  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [allocError, setAllocError] = useState("");
  const [expenseError, setExpenseError] = useState("");

  // ── Allocation creation ──────────────────────────────────────
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("80");

  // ── Expense creation ─────────────────────────────────────────
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [expenseAllocationId, setExpenseAllocationId] = useState(""); // pre-set from tile button
  const [expenseAllocationName, setExpenseAllocationName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseReference, setExpenseReference] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseType, setExpenseType] = useState("BUSINESS");

  const budgetName = location.state?.budgetName || budget?.name || "Budget";
  const companyName = location.state?.companyName || "Company";

  const allocations = useMemo(() => {
    return Array.isArray(budget?.allocations) ? budget.allocations : [];
  }, [budget]);

  const isOwner = (location.state?.userRole || localStorage.getItem("artha_user_role") || "MEMBER").toUpperCase() === "OWNER";

  function formatAmount(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return "0.00";
    return parsed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const fetchAll = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [budgetData, expensesData] = await Promise.all([
        getBudgetDetails(budgetId),
        getExpensesByBudget(budgetId).catch(() => [])
      ]);
      setBudget(budgetData);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (err) {
      setError(err.message || "Failed to load budget details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) { navigate("/auth", { replace: true }); return; }
    if (!budgetId) return;
    fetchAll();
  }, [budgetId, navigate]);

  // Close modals on Escape
  useEffect(() => {
    if (!showCreate && !showCreateExpense) return undefined;
    function handleEscape(e) {
      if (e.key === "Escape") { setShowCreate(false); setShowCreateExpense(false); }
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handleEscape); };
  }, [showCreate, showCreateExpense]);

  // ── Handlers ─────────────────────────────────────────────────
  async function handleCreateAllocation(event) {
    event.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed || !allocatedAmount || !alertThreshold) {
      setAllocError("Please fill in all allocation fields."); return;
    }
    setIsCreating(true);
    setAllocError("");
    try {
      await createAllocation(budgetId, {
        categoryName: trimmed,
        allocatedAmount: Number(allocatedAmount),
        alertThreshold: Number(alertThreshold)
      });
      await fetchAll();
      setCategoryName(""); setAllocatedAmount(""); setAlertThreshold("80");
      setShowCreate(false);
    } catch (err) {
      setAllocError(err.message || "Failed to create allocation.");
    } finally {
      setIsCreating(false);
    }
  }

  // Open expense modal pre-filled for a specific allocation
  function openAddExpense(allocation) {
    setExpenseAllocationId(allocation.id);
    setExpenseAllocationName(allocation.categoryName);
    setExpenseAmount("");
    setExpenseReference("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setExpenseType("BUSINESS");
    setShowCreateExpense(true);
  }

  async function handleCreateExpense(event) {
    event.preventDefault();
    const trimmedRef = expenseReference.trim();
    if (!expenseAllocationId || !expenseAmount || !trimmedRef || !expenseDate) {
      setExpenseError("Please fill in all expense fields."); return;
    }
    const selectedAllocation = allocations.find(a => a.id === expenseAllocationId);
    if (!selectedAllocation) { setExpenseError("Invalid allocation."); return; }

    const userRole = location.state?.userRole || localStorage.getItem("artha_user_role") || "MEMBER";
    const userId = localStorage.getItem("artha_user_id");

    setIsCreatingExpense(true);
    setExpenseError("");
    try {
      const newExpense = await createExpense({
        companyId: String(companyId),
        budgetId: String(budgetId),
        allocationId: String(selectedAllocation.id),
        amount: Number(expenseAmount),
        reference: trimmedRef,
        spentDate: expenseDate,
        type: expenseType,
        role: userRole,
        createdBy: userId,
        allocatedAmount: Number(selectedAllocation.allocatedAmount)
      });
      setExpenses(prev => [newExpense, ...prev]);
      setShowCreateExpense(false);
    } catch (err) {
      setExpenseError(err.message || "Failed to create expense.");
    } finally {
      setIsCreatingExpense(false);
    }
  }

  async function handleApproveExpense(expenseId) {
    setError("");
    try {
      const updated = await approveExpense(expenseId);
      setExpenses(prev => prev.map(e => e.id === expenseId ? updated : e));
    } catch (err) { setError(err.message || "Failed to approve expense."); }
  }

  async function handleRejectExpense(expenseId) {
    setError("");
    try {
      const updated = await rejectExpense(expenseId);
      setExpenses(prev => prev.map(e => e.id === expenseId ? updated : e));
    } catch (err) { setError(err.message || "Failed to reject expense."); }
  }

  // Group expenses by allocationId
  const expensesByAllocation = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const key = exp.allocationId || "__none";
      if (!map[key]) map[key] = [];
      map[key].push(exp);
    });
    return map;
  }, [expenses]);

  return (
    <main className="company-shell">
      <section className="company-card">
        {/* ── Header ── */}
        <header className="company-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button className="back-btn" onClick={() => navigate(`/company/${companyId}`)} type="button">Back</button>
            <h1>{budgetName}</h1>
            <p>{companyName}</p>
          </div>
          <button className="create-btn" onClick={() => setShowCreate(true)} type="button">
            + Create Allocation
          </button>
        </header>

        {error && <p className="dashboard-error">{error}</p>}

        {isLoading ? (
          <p className="dashboard-muted">Loading budget data...</p>
        ) : allocations.length === 0 ? (
          <p className="dashboard-muted">No allocations yet. Create one above.</p>
        ) : (
          <div className="budget-sections">
            {allocations.map(allocation => {
              const allocationExpenses = expensesByAllocation[allocation.id] || [];
              const totalSpent = allocationExpenses
                .filter(e => e.status === 'APPROVED')
                .reduce((sum, e) => sum + Number(e.amount), 0);
              const spentPct = allocation.allocatedAmount > 0
                ? Math.min(100, (totalSpent / Number(allocation.allocatedAmount)) * 100)
                : 0;

              return (
                <section
                  key={allocation.id}
                  style={{
                    background: 'var(--bg-card, #fff)',
                    borderRadius: '14px',
                    border: '1px solid var(--edge)',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  {/* ── Allocation Header ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{allocation.categoryName}</h3>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Budget: <strong>Rs {formatAmount(allocation.allocatedAmount)}</strong>
                        &nbsp;·&nbsp;Alert at <strong>{allocation.alertThreshold}%</strong>
                      </p>
                    </div>
                    <button
                      className="create-btn"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                      onClick={() => openAddExpense(allocation)}
                      type="button"
                    >
                      + Add Expense
                    </button>
                  </div>

                  {/* ── Spend Progress ── */}
                  <div style={{ background: '#e5e7eb', borderRadius: '6px', height: '8px', marginBottom: '0.6rem', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${spentPct}%`,
                      background: spentPct >= 80 ? '#ef4444' : '#f97316',
                      borderRadius: '6px',
                      transition: 'width 0.4s ease',
                      minWidth: spentPct > 0 ? '4px' : '0'
                    }} />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Rs {formatAmount(totalSpent)} of Rs {formatAmount(allocation.allocatedAmount)} approved &nbsp;·&nbsp; <strong style={{ color: spentPct >= 80 ? '#ef4444' : '#f97316' }}>{Math.round(spentPct)}%</strong>
                  </p>

                  {/* ── Expenses for this Allocation ── */}
                  {allocationExpenses.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No expenses yet for this allocation.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {allocationExpenses.map(expense => (
                        <div
                          key={expense.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg, #f5f0eb)',
                            borderRadius: '10px',
                            padding: '0.65rem 1rem',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {expense.reference}
                            </p>
                            <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {expense.spentDate} &nbsp;·&nbsp; {expense.type}
                            </p>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                            Rs {formatAmount(expense.amount)}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: `${statusColor(expense.status)}22`,
                            color: statusColor(expense.status),
                            whiteSpace: 'nowrap'
                          }}>
                            {expense.status || "PENDING"}
                          </span>
                          {(!expense.status || expense.status === 'PENDING') && isOwner && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '6px', border: 'none', background: '#22c55e22', color: '#16a34a', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => handleApproveExpense(expense.id)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '6px', border: 'none', background: '#ef444422', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => handleRejectExpense(expense.id)}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      {/* ── CREATE ALLOCATION MODAL ── */}
      {showCreate && createPortal(
        <div className="create-modal-overlay" onClick={() => setShowCreate(false)} role="presentation">
          <section className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-head">
              <h3>Create Allocation</h3>
              <button className="create-modal-close" onClick={() => setShowCreate(false)} type="button">×</button>
            </div>
            <form className="create-modal-form" onSubmit={handleCreateAllocation}>
              {allocError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {allocError}
                </div>
              )}
              <label className="field">
                <span className="field-label">Category Name</span>
                <input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Marketing" autoFocus required />
              </label>
              <label className="field">
                <span className="field-label">Allocated Amount</span>
                <input type="number" step="0.01" min="0" value={allocatedAmount} onChange={e => setAllocatedAmount(e.target.value)} placeholder="e.g. 50000" required />
              </label>
              <label className="field">
                <span className="field-label">Alert Threshold (%)</span>
                <input type="number" min="1" max="100" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} required />
              </label>
              <div className="create-modal-actions">
                <button className="create-cancel-btn" onClick={() => setShowCreate(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isCreating}>{isCreating ? "Creating…" : "Create"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}

      {/* ── ADD EXPENSE MODAL ── */}
      {showCreateExpense && createPortal(
        <div className="create-modal-overlay" onClick={() => setShowCreateExpense(false)} role="presentation">
          <section className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-head">
              <h3>Add Expense — <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{expenseAllocationName}</span></h3>
              <button className="create-modal-close" onClick={() => setShowCreateExpense(false)} type="button">×</button>
            </div>
            <form className="create-modal-form" onSubmit={handleCreateExpense}>
              {expenseError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {expenseError}
                </div>
              )}
              <label className="field">
                <span className="field-label">Amount</span>
                <input type="number" step="0.01" min="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="Enter amount spent" autoFocus required />
              </label>
              <label className="field">
                <span className="field-label">Reference / Description</span>
                <input type="text" value={expenseReference} onChange={e => setExpenseReference(e.target.value)} placeholder="e.g. Google Ads — March" required />
              </label>
              <label className="field">
                <span className="field-label">Type</span>
                <select value={expenseType} onChange={e => setExpenseType(e.target.value)} style={SELECT_STYLE} required>
                  <option value="BUSINESS">Business</option>
                  <option value="PERSONAL">Personal</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Spent Date</span>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
              </label>
              <div className="create-modal-actions">
                <button className="create-cancel-btn" onClick={() => setShowCreateExpense(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isCreatingExpense}>{isCreatingExpense ? "Adding…" : "Add Expense"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}
    </main>
  );
}

export default BudgetPage;
