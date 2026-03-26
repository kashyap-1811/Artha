import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, Wallet, Archive, LayoutDashboard, PieChart, DollarSign, Activity, Settings, Menu, X, ArrowUpRight, Plus, AlertTriangle, Edit3, Trash, Trash2, Star, CreditCard, BookOpen
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import { createAllocation, getBudgetDetails, removeAllocation, updateAllocation } from "../api/budgets";
import { getExpensesByBudget, createExpense, approveExpense, rejectExpense } from "../api/expenses";
import styles from "./DashboardPage.module.css";

const SELECT_STYLE = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--edge)',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  color: 'var(--text-main)',
  backgroundColor: 'var(--surface)'
};

function statusColor(status) {
  if (status === 'APPROVED') return '#16a34a';
  if (status === 'REJECTED') return '#dc2626';
  return '#ea580c'; // PENDING
}

function statusBg(status) {
  if (status === 'APPROVED') return '#22c55e22';
  if (status === 'REJECTED') return '#ef444422';
  return '#f9731622'; // PENDING
}

// --- Helper UI Components ---
function StatCard({ icon: Icon, label, value, colorClass, badge }) {
  return (
    <motion.div
      className={`${styles.statCard} ${styles[colorClass]}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 18 } }}
    >
      <svg className={styles.cardWave} viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,30 C40,10 80,50 120,30 C160,10 180,40 200,25 L200,60 L0,60 Z" />
      </svg>
      <div className={styles.statCardTop}>
        <div className={styles.statIconWrap}><Icon size={18} /></div>
        {badge && <span className={styles.cardBadge}>{badge}</span>}
      </div>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </motion.div>
  );
}

function SideNavItem({ icon: Icon, label, to, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${styles.sideNavItem} ${isActive ? styles.sideNavActive : ""}`}
      onClick={onClick}
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function BudgetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId, budgetId } = useParams();

  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [allocError, setAllocError] = useState("");
  const [expenseError, setExpenseError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Allocation creation ──────────────────────────────────────
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("80");

  const [isUpdatingAllocation, setIsUpdatingAllocation] = useState(false);
  const [showEditAllocation, setShowEditAllocation] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editAllocatedAmount, setEditAllocatedAmount] = useState("");
  const [editAlertThreshold, setEditAlertThreshold] = useState("");

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: null, isProcessing: false });

  function requestConfirm(title, message, actionFn) {
    setConfirmConfig({
      isOpen: true, title, message, isProcessing: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isProcessing: true }));
        await actionFn();
        setConfirmConfig(prev => ({ ...prev, isOpen: false, isProcessing: false }));
      }
    });
  }

  // ── Expense creation ─────────────────────────────────────────
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [expenseAllocationId, setExpenseAllocationId] = useState(""); 
  const [expenseAllocationName, setExpenseAllocationName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseReference, setExpenseReference] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseType, setExpenseType] = useState("BUSINESS");

  const budgetName = location.state?.budgetName || budget?.name || "Budget Details";
  const companyName = location.state?.companyName || "Company Overview";

  const allocations = useMemo(() => {
    return Array.isArray(budget?.allocations) ? budget.allocations : [];
  }, [budget]);

  const userRole = (location.state?.userRole || localStorage.getItem("artha_user_role") || "MEMBER").toUpperCase();
  const isPrivileged = userRole === 'OWNER';
  const isViewer = userRole === 'VIEWER';

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

  useEffect(() => {
    if (!showCreate && !showCreateExpense && !showEditAllocation) return undefined;
    function handleEscape(e) {
      if (e.key === "Escape") { setShowCreate(false); setShowCreateExpense(false); setShowEditAllocation(false); }
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handleEscape); };
  }, [showCreate, showCreateExpense, showEditAllocation]);

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

  function openEditAllocation(allocation) {
    setEditingAllocationId(allocation.id);
    setEditCategoryName(allocation.categoryName);
    setEditAllocatedAmount(allocation.allocatedAmount);
    setEditAlertThreshold(allocation.alertThreshold);
    setShowEditAllocation(true);
  }

  async function handleUpdateAllocation(event) {
    event.preventDefault();
    const trimmed = editCategoryName.trim();
    if (!trimmed || !editAllocatedAmount || !editAlertThreshold) {
      setAllocError("Please fill in all allocation fields."); return;
    }
    setIsUpdatingAllocation(true);
    setAllocError("");
    try {
      await updateAllocation(budgetId, editingAllocationId, {
        categoryName: trimmed,
        allocatedAmount: Number(editAllocatedAmount),
        alertThreshold: Number(editAlertThreshold)
      });
      await fetchAll();
      setShowEditAllocation(false);
      setEditingAllocationId(null);
    } catch (err) {
      setAllocError(err.message || "Failed to update allocation.");
    } finally {
      setIsUpdatingAllocation(false);
    }
  }

  function handleDeleteAllocation(allocationId) {
    requestConfirm("Delete Allocation", "Are you sure you want to permanently delete this allocation and all recorded expenses?", async () => {
      setAllocError("");
      try {
        await removeAllocation(budgetId, allocationId);
        await fetchAll();
      } catch (err) {
        setAllocError(err.message || "Failed to delete allocation.");
      }
    });
  }

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

  const expensesByAllocation = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const key = exp.allocationId || "__none";
      if (!map[key]) map[key] = [];
      map[key].push(exp);
    });
    return map;
  }, [expenses]);

  // Derived Summary Metrics
  const totalBudgetAmount = budget?.totalAmount || 0;
  const totalAllocatedAmount = allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
  const totalApprovedSpent = expenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0);

  const sideNavLinks = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Building2,       label: "Companies",  to: "/companies" },
      { icon: Star, label: "Features", to: "/features" },
    { icon: CreditCard, label: "Pricing", to: "/pricing" },
    { icon: BookOpen, label: "Blog", to: "/blog" },
  ];

  return (
    <div className={styles.appShell}>
      {/* ═══ LEFT SIDEBAR ═══ */}
      <>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div className={styles.sidebarBackdrop}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)} />
          )}
        </AnimatePresence>
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarBrand}>
            <div className={styles.brandCircle}>A</div>
            <span className={styles.brandText}>Artha</span>
            <button type="button" className={styles.sidebarCloseBtn} onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className={styles.sideNav}>
            {sideNavLinks.map((link) => (
              <SideNavItem key={link.label} {...link} onClick={() => setSidebarOpen(false)} />
            ))}
          </nav>
          <div className={styles.sidebarBottom}>
            <SideNavItem icon={Settings} label="Settings" to="/profile" onClick={() => setSidebarOpen(false)} />
          </div>
        </aside>
      </>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={styles.mainContent}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <button type="button" className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className={styles.topBarLeft}>
            <p className={styles.greetingLabel} onClick={() => navigate(`/company/${companyId}`)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
               &larr; Back to Company
            </p>
            <h1 className={styles.greetingTitle}>
              {budgetName}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={() => navigate(`/company/${companyId}/budget/${budgetId}/analysis`)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
            >
              <Activity size={16} /> Insights
            </button>
            {isPrivileged && (
              <button 
                type="button" 
                onClick={() => setShowCreate(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
              >
                <Plus size={16} /> New Allocation
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="dashboard-error" style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</p>
        )}

        {/* ── STAT CARDS ── */}
        <div className={styles.statsRow}>
          <StatCard icon={Wallet} label="Total Budget" value={isLoading ? "–" : `₹${formatAmount(totalBudgetAmount)}`} colorClass="cardBlue" />
          <StatCard icon={PieChart} label="Total Allocated" value={isLoading ? "–" : `₹${formatAmount(totalAllocatedAmount)}`} colorClass="cardPurple" />
          <StatCard icon={DollarSign} label="Approved Spend" value={isLoading ? "–" : `₹${formatAmount(totalApprovedSpent)}`} colorClass="cardGreen" />
          <StatCard icon={Activity} label="Total Expenses" value={isLoading ? "–" : expenses.length} colorClass="cardAmber" />
        </div>

        {/* ── CONTENT GRID ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1200px' }}>
          
          <motion.div className={styles.panel} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={styles.panelHeader} style={{ marginBottom: '1.5rem' }}>
              <div>
                <h2 className={styles.panelTitle}>Allocations</h2>
                <p className={styles.panelSub}>Expense categories and tracking for this budget</p>
              </div>
            </div>
            
            {isLoading ? (
              <div className={styles.skeletonList}>
                {[1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : allocations.length === 0 ? (
              <div className={styles.emptyState}>
                <PieChart size={38} className={styles.emptyIcon} style={{ opacity: 0.5 }}/>
                <p>No allocations yet. Create one to start tracking spending!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {allocations.map(allocation => {
                  const allocationExpenses = expensesByAllocation[allocation.id] || [];
                  const totalSpent = allocationExpenses
                    .filter(e => e.status === 'APPROVED')
                    .reduce((sum, e) => sum + Number(e.amount), 0);
                  const spentPct = allocation.allocatedAmount > 0
                    ? Math.min(100, (totalSpent / Number(allocation.allocatedAmount)) * 100)
                    : 0;

                  return (
                    <motion.section
                      key={allocation.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: 'var(--surface)',
                        borderRadius: '12px',
                        border: '1px solid var(--edge)',
                        padding: '1.25rem'
                      }}
                    >
                      {/* Allocation Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{allocation.categoryName}</h3>
                            {isPrivileged && (
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button
                                  style={{ border: '1px solid var(--edge)', background: 'var(--surface-hover)', borderRadius: '4px', cursor: 'pointer', padding: '0.15rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                                  onClick={() => openEditAllocation(allocation)}
                                >
                                  <Edit3 size={11} style={{ marginRight: '2px' }}/> Edit
                                </button>
                                <button
                                  style={{ border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: '4px', cursor: 'pointer', padding: '0.15rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', color: '#ef4444' }}
                                  onClick={() => handleDeleteAllocation(allocation.id)}
                                >
                                  <Trash2 size={11} style={{ marginRight: '2px' }}/> Del
                                </button>
                              </div>
                            )}
                          </div>
                          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Max Limit: <strong>₹{formatAmount(allocation.allocatedAmount)}</strong> &nbsp;·&nbsp; Alert Warning at <strong>{allocation.alertThreshold}%</strong>
                          </p>
                        </div>
                        {!isViewer && (
                          <button
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem' }}
                            onClick={() => openAddExpense(allocation)}
                            type="button"
                          >
                            <Plus size={14} /> Add Expense
                          </button>
                        )}
                      </div>

                      {/* Spend Progress Bar */}
                      <div style={{ background: 'var(--edge)', borderRadius: '6px', height: '10px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${spentPct}%`,
                          background: spentPct >= 80 ? '#ef4444' : (spentPct > 50 ? '#f97316' : '#22c55e'),
                          borderRadius: '6px',
                          transition: 'width 0.4s ease',
                          minWidth: spentPct > 0 ? '4px' : '0'
                        }} />
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', fontWeight: 500 }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>₹{formatAmount(totalSpent)}</span> of ₹{formatAmount(allocation.allocatedAmount)} approved &nbsp;·&nbsp; <strong style={{ color: spentPct >= 80 ? '#ef4444' : (spentPct > 50 ? '#f97316' : '#22c55e') }}>{Math.round(spentPct)}% Utilized</strong>
                      </p>

                      {/* Expense List inside Allocation */}
                      {allocationExpenses.length === 0 ? (
                        <div style={{ background: 'var(--surface-hover)', border: '1px dashed var(--edge)', padding: '1rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                           No expenses recorded for this category yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {allocationExpenses.map(expense => (
                            <div
                              key={expense.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--surface-hover)',
                                border: '1px solid var(--edge)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                transition: 'transform 0.2s',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {expense.reference}
                                </p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  {expense.spentDate} &nbsp;·&nbsp; {expense.type}
                                </p>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                    ₹{formatAmount(expense.amount)}
                                  </span>
                                  <span style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    marginTop: '0.2rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '12px',
                                    background: statusBg(expense.status),
                                    color: statusColor(expense.status),
                                    letterSpacing: '0.5px'
                                  }}>
                                    {(expense.status || "PENDING").toUpperCase()}
                                  </span>
                                </div>
                                
                                {(!expense.status || expense.status === 'PENDING') && isPrivileged && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginLeft: '0.5rem' }}>
                                    <button
                                      type="button"
                                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #86efac', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontWeight: 600 }}
                                      onClick={() => handleApproveExpense(expense.id)}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}
                                      onClick={() => handleRejectExpense(expense.id)}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.section>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isProcessing={confirmConfig.isProcessing}
      />

      {/* ── CREATE ALLOCATION MODAL ── */}
      {showCreate && createPortal(
        <div className="create-modal-overlay" onClick={() => setShowCreate(false)} role="presentation" style={{ zIndex: 99999 }}>
          <section className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-head" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>New Allocation</h3>
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
                <span className="field-label">Allocated Limit Amount</span>
                <input type="number" step="0.01" min="0" value={allocatedAmount} onChange={e => setAllocatedAmount(e.target.value)} placeholder="0.00" required />
              </label>
              <label className="field">
                <span className="field-label">Alert Threshold (%)</span>
                <input type="number" min="1" max="100" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} required />
              </label>
              <div className="create-modal-actions">
                <button className="create-cancel-btn" onClick={() => setShowCreate(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isCreating}>{isCreating ? "Adding…" : "Add Category"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}

      {/* ── ADD EXPENSE MODAL ── */}
      {showCreateExpense && createPortal(
        <div className="create-modal-overlay" onClick={() => setShowCreateExpense(false)} role="presentation" style={{ zIndex: 99999 }}>
          <section className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-head" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Expense — <span style={{ color: 'var(--accent)' }}>{expenseAllocationName}</span></h3>
              <button className="create-modal-close" onClick={() => setShowCreateExpense(false)} type="button">×</button>
            </div>
            <form className="create-modal-form" onSubmit={handleCreateExpense}>
              {expenseError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {expenseError}
                </div>
              )}
              <label className="field">
                <span className="field-label">Amount Spent</span>
                <input type="number" step="0.01" min="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0.00" autoFocus required />
              </label>
              <label className="field">
                <span className="field-label">Reason / Reference description</span>
                <input type="text" value={expenseReference} onChange={e => setExpenseReference(e.target.value)} placeholder="e.g. Meta Ads Invoice" required />
              </label>
              <label className="field">
                <span className="field-label">Date of expense</span>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
              </label>
              <div className="create-modal-actions">
                <button className="create-cancel-btn" onClick={() => setShowCreateExpense(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isCreatingExpense}>{isCreatingExpense ? "Adding…" : "Submit Expense"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}

      {/* ── EDIT ALLOCATION MODAL ── */}
      {showEditAllocation && createPortal(
        <div className="create-modal-overlay" onClick={() => setShowEditAllocation(false)} role="presentation" style={{ zIndex: 99999 }}>
          <section className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-head" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Edit Allocation</h3>
              <button className="create-modal-close" onClick={() => setShowEditAllocation(false)} type="button">×</button>
            </div>
            <form className="create-modal-form" onSubmit={handleUpdateAllocation}>
              {allocError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {allocError}
                </div>
              )}
              <label className="field">
                <span className="field-label">Category Name</span>
                <input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} placeholder="e.g. Marketing" autoFocus required />
              </label>
              <label className="field">
                <span className="field-label">Allocated Limit Amount</span>
                <input type="number" step="0.01" min="0" value={editAllocatedAmount} onChange={e => setEditAllocatedAmount(e.target.value)} placeholder="e.g. 50000" required />
              </label>
              <label className="field">
                <span className="field-label">Alert Threshold (%)</span>
                <input type="number" min="1" max="100" value={editAlertThreshold} onChange={e => setEditAlertThreshold(e.target.value)} required />
              </label>
              <div className="create-modal-actions">
                <button className="create-cancel-btn" onClick={() => setShowEditAllocation(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isUpdatingAllocation}>{isUpdatingAllocation ? "Updating…" : "Save Changes"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}
