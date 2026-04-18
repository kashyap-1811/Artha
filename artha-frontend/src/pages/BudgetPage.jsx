import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, Wallet, Archive, LayoutDashboard, PieChart, DollarSign, Activity, Settings, Menu, X, ArrowUpRight, Plus, AlertTriangle, Edit3, Trash, Trash2, Star, CreditCard, BookOpen, MoreHorizontal, Receipt, Sparkles, ArrowLeft
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import AppSidebar from "../components/AppSidebar";
import { createAllocation, getBudgetDetails, removeAllocation, updateAllocation } from "../api/budgets";

import { getExpensesByBudget, createExpense, approveExpense, rejectExpense } from "../api/expenses";
import styles from "./DashboardPage.module.css";
import budStyles from "./BudgetPage.module.css";

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

// --- Helper Hook & Component for Animations ---
function useCountUp(end, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof end !== 'number' || isNaN(end) || end === 0) { setCount(end || 0); return; }
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(end * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration]);

  return count;
}

function AnimatedValue({ value, prefix = "", suffix = "", decimals }) {
  const strVal = String(value || 0).replace(/[₹,]/g, '');
  const hasDecimals = strVal.includes('.');
  const detectedDecimals = hasDecimals ? strVal.split('.')[1].length : 0;
  const decimalCount = decimals !== undefined ? decimals : (prefix === '₹' ? 2 : detectedDecimals);
  const numericVal = parseFloat(strVal);

  const animated = useCountUp(isNaN(numericVal) ? 0 : numericVal);

  if (isNaN(numericVal)) return <>{value}</>;

  return (
    <>
      {prefix}
      {animated.toLocaleString(undefined, { 
        minimumFractionDigits: decimalCount, 
        maximumFractionDigits: decimalCount 
      })}
      {suffix}
    </>
  );
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
      <div className={styles.statValue}>
        {typeof value === 'string' && value.includes('₹') ? (
          <AnimatedValue value={value.replace('₹', '')} prefix="₹" />
        ) : (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) ? (
          <AnimatedValue value={value} />
        ) : (
          value
        )}
      </div>
    </motion.div>
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
  const [expandedAllocations, setExpandedAllocations] = useState({});

  const toggleAllocation = (id) => {
    setExpandedAllocations(prev => ({ ...prev, [id]: !prev[id] }));
  };

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



    const selectedAllocationForExpense = allocations.find(a => a.id === expenseAllocationId);
    const allocationExpensesForCoach = expensesByAllocation[expenseAllocationId] || [];
    const coachSpent = allocationExpensesForCoach
      .filter(e => e.status === 'APPROVED')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const coachPct = selectedAllocationForExpense?.allocatedAmount > 0
      ? (coachSpent / Number(selectedAllocationForExpense.allocatedAmount)) * 100
      : 0;

    let coachMsg = { text: "Keep tracking your spending!", color: "#64748b", bg: "#f8fafc", icon: Activity };
    if (coachPct >= 80) {
      coachMsg = { text: "CRITICAL: You're almost out of budget! Control your money wisely. 🛑", color: "#991b1b", bg: "#fef2f2", icon: AlertTriangle };
    } else if (coachPct >= 50) {
      coachMsg = { text: "CAUTION: Budget is getting tight. Spend only if necessary. ⚠️", color: "#92400e", bg: "#fffbeb", icon: AlertTriangle };
    } else {
      coachMsg = { text: "CHILL: You're doing great! Plenty of room left in this category. 🌴", color: "#166534", bg: "#f0fdf4", icon: Star };
    }

  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      {/* Top bar */}
      <div className={budStyles.unifiedTopBar}>
        <div className={budStyles.headerRow}>
          <div className={budStyles.titleGroup}>
            <span className={budStyles.metadataLabel}>BUDGET CODE: {budgetId?.split("-")[0].toUpperCase()}</span>
            <div className={budStyles.titleRow}>
              <button 
                onClick={() => navigate(`/company/${companyId}`)} 
                className={budStyles.backBtn}
                title="Back to Company"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className={styles.greetingTitle} style={{ margin: 0, fontSize: 'clamp(1.5rem, 6vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {budgetName} <Sparkles size={22} className={budStyles.sparkle} />
              </h1>
            </div>
          </div>
          
          <div className={budStyles.actionsRow}>
            <button 
              type="button" 
              onClick={() => navigate(`/company/${companyId}/budget/${budgetId}/analysis`)} 
              className={`${budStyles.actionBtn} ${budStyles.btnGreen}`}
            >
              <Activity size={18} /> Insights
            </button>
            {isPrivileged && (
              <button 
                type="button" 
                onClick={() => setShowCreate(true)} 
                className={`${budStyles.actionBtn} ${budStyles.btnPrimary}`}
              >
                <Plus size={18} /> Allocation
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={budStyles.pageContainer}>
        {error && (
          <p className="dashboard-error" style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</p>
        )}

        {/* ── STAT CARDS ── */}
        <div className={budStyles.statsGrid}>
          <StatCard icon={Wallet} label="Budget" value={isLoading ? "–" : `₹${formatAmount(totalBudgetAmount)}`} colorClass="cardBlue" />
          <StatCard icon={PieChart} label="Allocated" value={isLoading ? "–" : `₹${formatAmount(totalAllocatedAmount)}`} colorClass="cardPurple" />
          <StatCard icon={DollarSign} label="Spent" value={isLoading ? "–" : `₹${formatAmount(totalApprovedSpent)}`} colorClass="cardGreen" />
          <StatCard icon={Activity} label="Expenses" value={isLoading ? "–" : expenses.length} colorClass="cardAmber" />
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
              <div className={styles.emptyState}>No allocations found.</div>
            ) : (
              <div className={budStyles.allocationsGrid}>
                {allocations.map(allocation => {
                  const allocationExpenses = expensesByAllocation[allocation.id] || [];
                  const totalSpent = allocationExpenses
                    .filter(e => e.status === 'APPROVED')
                    .reduce((sum, e) => sum + Number(e.amount), 0);
                  const spentPct = allocation.allocatedAmount > 0
                    ? Math.min(100, (totalSpent / Number(allocation.allocatedAmount)) * 100)
                    : 0;
                  
                  // Status color for the vault
                  const burnStatus = spentPct >= 100 ? '#ef4444' : (spentPct >= 80 ? '#f97316' : '#10b981');

                  return (
                    <motion.div
                      key={allocation.id}
                      className={budStyles.vaultCard}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className={budStyles.vaultHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '12px', background: `${burnStatus}15`, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: burnStatus 
                          }}>
                            <PieChart size={20} />
                          </div>
                          <div>
                            <h3 className={budStyles.vaultTitle}>{allocation.categoryName}</h3>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {!isViewer && (
                            <button
                              className={budStyles.miniActionBtn}
                              style={{ padding: '0.6rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              onClick={() => openAddExpense(allocation)}
                            >
                              <Plus size={14} /> Add
                            </button>
                          )}
                          {isPrivileged && (
                            <div style={{ position: 'relative' }}>
                              <button 
                                className={budStyles.miniActionBtn} 
                                style={{ padding: '0.6rem' }}
                                onClick={(e) => {
                                  // Simple toggle logic or just trigger edit for now
                                  openEditAllocation(allocation);
                                }}
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={budStyles.vaultStats}>
                        <div className={budStyles.vaultAmountRow}>
                          <span className={budStyles.vaultAmount}>
                            <AnimatedValue value={totalSpent} prefix="₹" />
                          </span>
                          <span className={budStyles.vaultLimit}>
                            of <AnimatedValue value={allocation.allocatedAmount} prefix="₹" />
                          </span>
                        </div>
                        <span className={budStyles.utilizedLabel}>utilized</span>
                      </div>

                      <div className={budStyles.burnBarContainer}>
                        <div 
                          className={budStyles.burnBar} 
                          style={{ 
                            width: `${Math.min(spentPct, 100)}%`, 
                            background: `linear-gradient(90deg, ${burnStatus}aa, ${burnStatus})`,
                            boxShadow: `0 0 12px ${burnStatus}33`
                          }} 
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>
                          ALERT AT {allocation.alertThreshold}%
                        </span>
                        <span className={budStyles.statusChip} style={{ background: `${burnStatus}15`, color: burnStatus, borderColor: `${burnStatus}25` }}>
                          {spentPct.toFixed(1)}% {spentPct >= 100 ? 'EXCEEDED' : 'BURNED'}
                        </span>
                      </div>

                      {/* Expense Ledger */}
                      <div style={{ marginTop: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                          Recent Transactions
                        </h4>
                        
                        {allocationExpenses.length === 0 ? (
                          <div className={budStyles.emptyStateWrap}>
                            <Archive size={32} className={budStyles.emptyStateIcon} />
                            <p className={budStyles.emptyStateText}>
                              No transactions yet. <br/> 
                              Tap "Add" to record an expense.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {allocationExpenses.slice(0, expandedAllocations[allocation.id] ? undefined : 3).map(expense => (
                                <div key={expense.id} className={budStyles.ledgerRow}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                      width: '36px', height: '36px', borderRadius: '10px', background: `${burnStatus}10`, 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: burnStatus 
                                    }}>
                                      <Receipt size={16} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <p className={budStyles.expTitle} title={expense.reference}>{expense.reference}</p>
                                      <p className={budStyles.expMeta}>{expense.spentDate} · {expense.type}</p>
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>₹{formatAmount(expense.amount)}</span>
                                      <span className={budStyles.statusChip} style={{ 
                                        background: statusBg(expense.status), 
                                        color: statusColor(expense.status),
                                        marginTop: '4px',
                                        fontSize: '0.6rem',
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: '6px'
                                      }}>
                                        {expense.status}
                                      </span>
                                    </div>
                                    
                                    {(!expense.status || expense.status === 'PENDING') && isPrivileged && (
                                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <button
                                          type="button"
                                          className={budStyles.miniActionBtn}
                                          style={{ color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4', fontSize: '0.7rem', padding: '0.4rem 0.6rem' }}
                                          onClick={() => handleApproveExpense(expense.id)}
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          className={budStyles.miniActionBtn}
                                          style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', fontSize: '0.7rem', padding: '0.4rem 0.6rem' }}
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

                            {allocationExpenses.length > 3 && (
                              <button 
                                className={budStyles.viewAllBtn}
                                onClick={() => toggleAllocation(allocation.id)}
                              >
                                {expandedAllocations[allocation.id] ? "View Less" : `View All (${allocationExpenses.length})`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>


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
        <div className={budStyles.modalOverlay} onClick={() => setShowCreate(false)} role="presentation">
          <section className={budStyles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={budStyles.modalHeader}>
              <h3 className={budStyles.modalTitle}>New Allocation</h3>
              <button className="create-modal-close" onClick={() => setShowCreate(false)} type="button">×</button>
            </div>
            
            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '1rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>POOL</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: (totalBudgetAmount - totalAllocatedAmount) >= 0 ? '#3b82f6' : '#ef4444' }}>
                ₹{formatAmount(Math.max(0, totalBudgetAmount - totalAllocatedAmount))}
              </span>
            </div>

            <form className="create-modal-form" onSubmit={handleCreateAllocation}>
              {allocError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {allocError}
                </div>
              )}
              <label className="field">
                <span className="field-label">Category Name</span>
                <input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Marketing" autoFocus required style={{ fontSize: '16px' }} />
              </label>
              <label className="field">
                <span className="field-label">Limit Amount</span>
                <input type="number" step="0.01" min="0" value={allocatedAmount} onChange={e => setAllocatedAmount(e.target.value)} placeholder="0.00" required style={{ fontSize: '16px' }} />
              </label>
              <label className="field">
                <span className="field-label">Alert Threshold (%)</span>
                <input type="number" min="1" max="100" value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} required style={{ fontSize: '16px' }} />
              </label>
              <div className="create-modal-actions" style={{ marginTop: '1rem' }}>
                <button className={budStyles.createCancelBtn || "create-cancel-btn"} onClick={() => setShowCreate(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isCreating} style={{ flex: 1 }}>{isCreating ? "Adding…" : "Add Category"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}

      {/* ── ADD EXPENSE MODAL ── */}
      {showCreateExpense && createPortal(
        <div className={budStyles.modalOverlay} onClick={() => setShowCreateExpense(false)} role="presentation">
          <section className={budStyles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={budStyles.modalHeader}>
              <h3 className={budStyles.modalTitle}>Add Expense — <span style={{ color: '#3b82f6' }}>{expenseAllocationName}</span></h3>
              <button className="create-modal-close" onClick={() => setShowCreateExpense(false)} type="button">×</button>
            </div>

            <div style={{ 
              background: coachMsg.bg, 
              border: `1px solid ${coachMsg.color}22`, 
              borderRadius: '12px', 
              padding: '1rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center'
            }}>
              <coachMsg.icon size={20} style={{ color: coachMsg.color, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: coachMsg.color, fontWeight: 700, lineHeight: 1.4 }}>
                {coachMsg.text}
              </p>
            </div>

            <form className="create-modal-form" onSubmit={handleCreateExpense}>
              {expenseError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {expenseError}
                </div>
              )}
              <label className="field">
                <span className="field-label">Amount Spent</span>
                <input type="number" step="0.01" min="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0.00" autoFocus required style={{ fontSize: '16px' }} />
              </label>
              <label className="field">
                <span className="field-label">Reason / Reference</span>
                <input type="text" value={expenseReference} onChange={e => setExpenseReference(e.target.value)} placeholder="e.g. Meta Ads" required style={{ fontSize: '16px' }} />
              </label>
              <label className="field">
                <span className="field-label">Date of expense</span>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required style={{ fontSize: '16px' }} />
              </label>
              
              <div style={{ 
                margin: '0.5rem 0 1rem', 
                fontSize: '0.65rem', 
                color: '#64748b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                fontWeight: 600,
                textAlign: 'center'
              }}>
                <AlertTriangle size={12} style={{ color: '#f97316', flexShrink: 0 }} />
                <span>Expenses are final once submitted.</span>
              </div>

              <div className="create-modal-actions">
                <button className={budStyles.createCancelBtn || "create-cancel-btn"} onClick={() => setShowCreateExpense(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isCreatingExpense} style={{ flex: 1 }}>{isCreatingExpense ? "Adding…" : "Add Expense"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}

      {/* ── EDIT ALLOCATION MODAL ── */}
      {showEditAllocation && createPortal(
        <div className={budStyles.modalOverlay} onClick={() => setShowEditAllocation(false)} role="presentation">
          <section className={budStyles.modalSheet} onClick={e => e.stopPropagation()}>
            <div className={budStyles.modalHeader}>
              <h3 className={budStyles.modalTitle}>Edit Allocation</h3>
              <button className="create-modal-close" onClick={() => setShowEditAllocation(false)} type="button">×</button>
            </div>

            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '1rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>POOL</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>
                ₹{formatAmount(totalBudgetAmount - (totalAllocatedAmount - (allocations.find(a => a.id === editingAllocationId)?.allocatedAmount || 0)))}
              </span>
            </div>

            <form className="create-modal-form" onSubmit={handleUpdateAllocation}>
              {allocError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  {allocError}
                </div>
              )}
              <label className="field">
                <span className="field-label">Category Name</span>
                <input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} placeholder="e.g. Marketing" autoFocus required style={{ fontSize: '16px' }} />
              </label>
              <label className="field">
                <span className="field-label">Limit Amount</span>
                <input type="number" step="0.01" min="0" value={editAllocatedAmount} onChange={e => setEditAllocatedAmount(e.target.value)} placeholder="0.00" required style={{ fontSize: '16px' }} />
              </label>
              <label className="field">
                <span className="field-label">Alert Threshold (%)</span>
                <input type="number" min="1" max="100" value={editAlertThreshold} onChange={e => setEditAlertThreshold(e.target.value)} required style={{ fontSize: '16px' }} />
              </label>
              <div className="create-modal-actions" style={{ marginTop: '1rem' }}>
                <button className={budStyles.createCancelBtn || "create-cancel-btn"} onClick={() => setShowEditAllocation(false)} type="button">Cancel</button>
                <button className="create-confirm-btn" type="submit" disabled={isUpdatingAllocation} style={{ flex: 1 }}>{isUpdatingAllocation ? "Saving…" : "Save Changes"}</button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}

    </AppSidebar>
  );
}
