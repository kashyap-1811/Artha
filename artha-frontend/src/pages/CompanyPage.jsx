import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, Wallet, Archive, LayoutDashboard,
  Settings, Menu, X, ArrowUpRight, Plus, AlertTriangle, Edit3, Trash2, Activity,
  Star, CreditCard, BookOpen
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import { createBudget, getAllBudgets, updateBudget, closeBudget, removeBudget } from "../api/budgets";
import { getCompanyMembers, addCompanyMember, removeCompanyMember, changeMemberRole } from "../api/companies";
import { getUserByEmail } from "../api/users";
import styles from "./DashboardPage.module.css";

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

// --- Main Page Component ---
export default function CompanyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useParams();

  const [budgets, setBudgets] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);

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
  const [editBudgetStatus, setEditBudgetStatus] = useState("");

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("MEMBER");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) {
      navigate("/auth", { replace: true });
      return;
    }
    setCurrentUserId(userId);
    if (!companyId) return;

    async function fetchData() {
      setIsLoading(true);
      setError("");
      try {
        const [budgetsData, membersData] = await Promise.all([
          getAllBudgets(companyId).catch(() => []),
          getCompanyMembers(companyId).catch(() => [])
        ]);
        setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
        const membersList = Array.isArray(membersData) ? membersData : [];
        setMembers(membersList);
        // Find current user's role in this company
        const myMembership = membersList.find(m => String(m.userId) === String(userId));
        if (myMembership?.role) {
          setCurrentUserRole(myMembership.role);
          localStorage.setItem("artha_user_role", myMembership.role);
        }
      } catch (requestError) {
        setError(requestError.message || "Failed to load company data.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [companyId, navigate]);

  useEffect(() => {
    if (!showCreateBudget && !showShareModal && !showEditBudget) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowCreateBudget(false);
        setShowShareModal(false);
        setShowEditBudget(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showCreateBudget, showShareModal, showEditBudget]);

  const companyName = location.state?.companyName || "Company Overview";

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const aDate = new Date(a.startDate || 0).getTime();
      const bDate = new Date(b.startDate || 0).getTime();
      return bDate - aDate;
    });
  }, [budgets]);

  const activeBudgets = sortedBudgets.filter((budget) => budget.status === "ACTIVE");
  const closedBudgets = sortedBudgets.filter((budget) => budget.status !== "ACTIVE");

  const isPrivileged = currentUserRole === 'OWNER';

  function formatAmount(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return "0.00";
    return parsed.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Action Handlers
  async function handleCreateBudget(event) {
    event.preventDefault();
    const trimmedName = budgetName.trim();
    if (!trimmedName || !totalAmount || !startDate || !endDate) {
      setError("Please fill in all budget fields.");
      return;
    }

    setIsCreatingBudget(true);
    setError("");
    try {
      const created = await createBudget({
        companyId,
        name: trimmedName,
        totalAmount: Number(totalAmount),
        startDate,
        endDate
      });
      setBudgets((previous) => [created, ...previous]);
      setBudgetName("");
      setTotalAmount("");
      setStartDate("");
      setEndDate("");
      setShowCreateBudget(false);
    } catch (requestError) {
      setError(requestError.message || "Failed to create budget.");
    } finally {
      setIsCreatingBudget(false);
    }
  }

  function openEditBudget(event, budget) {
    event.stopPropagation();
    setEditingBudgetId(budget.id);
    setBudgetName(budget.name);
    setTotalAmount(budget.totalAmount);
    setStartDate(budget.startDate);
    setEndDate(budget.endDate);
    setEditBudgetStatus(budget.status);
    setShowEditBudget(true);
  }

  async function handleUpdateBudget(event) {
    event.preventDefault();
    const trimmedName = budgetName.trim();
    if (!trimmedName || !totalAmount || !startDate || !endDate) {
      setError("Please fill in all budget fields.");
      return;
    }

    setIsUpdatingBudget(true);
    setError("");
    try {
      const updated = await updateBudget(editingBudgetId, {
        name: trimmedName,
        totalAmount: Number(totalAmount),
        startDate: startDate,
        endDate: endDate,
        status: editBudgetStatus
      });
      setBudgets((prev) => prev.map(b => b.id === editingBudgetId ? updated : b));
      setShowEditBudget(false);
      setEditingBudgetId(null);
    } catch (requestError) {
      setError(requestError.message || "Failed to update budget.");
    } finally {
      setIsUpdatingBudget(false);
    }
  }

  function handleCloseBudget(event, budgetId) {
    event.stopPropagation();
    requestConfirm("Close Budget", "Are you sure you want to close this budget? It will become read-only.", async () => {
      setError("");
      try {
        await closeBudget(budgetId);
        setBudgets((prev) => prev.map(b => b.id === budgetId ? { ...b, status: 'CLOSED' } : b));
      } catch (requestError) {
        setError(requestError.message || "Failed to close budget.");
      }
    });
  }

  function handleDeleteBudget(event, budgetId) {
    event.stopPropagation();
    requestConfirm("Delete Budget", "Are you sure you want to delete this budget permanently? This action cannot be undone.", async () => {
      setError("");
      try {
        await removeBudget(budgetId);
        setBudgets((prev) => prev.filter(b => b.id !== budgetId));
      } catch (requestError) {
        setError(requestError.message || "Failed to delete budget.");
      }
    });
  }

  async function handleAddMember(event) {
    event.preventDefault();
    const trimmedEmail = memberEmail.trim();
    if (!trimmedEmail) {
      setError("Please enter an email address.");
      return;
    }

    setIsAddingMember(true);
    setError("");
    try {
      const user = await getUserByEmail(trimmedEmail);
      if (!user || (!user.id && !user.userId)) {
        throw new Error("User not found.");
      }

      const userIdToAdd = user.id || user.userId;

      await addCompanyMember(companyId, {
        userId: userIdToAdd,
        role: memberRole
      });

      const updatedMembers = await getCompanyMembers(companyId);
      setMembers(updatedMembers);

      setMemberEmail("");
      setMemberRole("MEMBER");
    } catch (requestError) {
      setError(requestError.message || "Failed to add member. Double check the email address.");
    } finally {
      setIsAddingMember(false);
    }
  }

  function handleRemoveMember(memberUserId) {
    requestConfirm("Remove Member", "Are you sure you want to remove this member? They will lose access to this company.", async () => {
      setError("");
      try {
        await removeCompanyMember(companyId, memberUserId);
        setMembers((prev) => prev.filter((m) => m.userId !== memberUserId));
      } catch (requestError) {
        setError(requestError.message || "Failed to remove member.");
      }
    });
  }

  async function handleChangeRole(memberUserId, newRole) {
    if (newRole === "REMOVE") {
      handleRemoveMember(memberUserId);
      return;
    }

    setError("");
    try {
      const updatedMember = await changeMemberRole(companyId, memberUserId, newRole);
      setMembers((prev) => prev.map(m => m.userId === memberUserId ? updatedMember : m));
    } catch (requestError) {
      setError(requestError.message || "Failed to change member role.");
    }
  }

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
            <NavLink to="/" className={styles.brandLink}>
              <img src="/logo2.svg" alt="Artha Logo" className={styles.brandLogo} />
              <span className={styles.brandText}>Artha</span>
            </NavLink>
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
            <p className={styles.greetingLabel}>Business Code: {companyId.split("-")[0].toUpperCase()}</p>
            <h1 className={styles.greetingTitle}>
              {companyName}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={() => setShowShareModal(true)} 
              style={{ padding: '0.4rem 1rem', background: 'var(--surface)', border: '1px solid var(--edge)', borderRadius: 'var(--radius-sm)', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}
            >
              Share
            </button>
            <button 
              type="button" 
              onClick={() => navigate(`/company/${companyId}/analysis`)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
            >
              <Activity size={16} /> Analytics
            </button>
            {isPrivileged && (
              <button 
                type="button" 
                onClick={() => setShowCreateBudget(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
              >
                <Plus size={16} /> New Budget
              </button>
            )}
          </div>
        </div>

        {error && !showShareModal && !showCreateBudget && !showEditBudget && (
          <p className="dashboard-error" style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</p>
        )}

        {/* ── STAT CARDS ── */}
        <div className={styles.statsRow}>
          <StatCard icon={Wallet} label="Total Budgets" value={isLoading ? "–" : budgets.length} colorClass="cardBlue" />
          <StatCard icon={Building2} label="Active Budgets" value={isLoading ? "–" : activeBudgets.length} colorClass="cardGreen" badge={activeBudgets.length > 0 ? "Running" : undefined} />
          <StatCard icon={Archive} label="Closed Budgets" value={isLoading ? "–" : closedBudgets.length} colorClass="cardPurple" />
          <StatCard icon={Users} label="Members" value={isLoading ? "–" : members.length} colorClass="cardAmber" />
        </div>

        {/* ── CONTENT GRID ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1200px' }}>
          {/* Active Budgets Panel */}
          <motion.div className={styles.panel} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Active Budgets</h2>
                <p className={styles.panelSub}>Currenctly executing budgets</p>
              </div>
            </div>
            {isLoading ? (
              <div className={styles.skeletonList}>
                {[1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : activeBudgets.length === 0 ? (
              <div className={styles.emptyState}>
                <Wallet size={38} className={styles.emptyIcon} />
                <p>No active budgets found.</p>
              </div>
            ) : (
              <div className={styles.companyList}>
                {activeBudgets.map((b) => (
                  <motion.div key={b.id} className={styles.companyTile} role="button" tabIndex={0}
                    whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => navigate(`/company/${companyId}/budget/${b.id}`, { state: { budgetName: b.name, companyName, userRole: currentUserRole } })}>
                    <div className={styles.tileAvatar} style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>AB</div>
                    <div className={styles.tileInfo}>
                      <strong>{b.name}</strong>
                      <span>{b.startDate} to {b.endDate}</span>
                    </div>
                    <div style={{ textAlign: "right", marginRight: "1rem" }}>
                      <strong style={{ color: "var(--text-main)", display: "block", fontSize: "0.95rem" }}>₹{formatAmount(b.totalAmount)}</strong>
                      <span className={styles.roleOwner} style={{ marginTop: "4px" }}>{b.status}</span>
                    </div>
                    
                    {isPrivileged && (
                      <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => openEditBudget(e, b)} style={{ background: 'var(--surface-hover)', border: '1px solid var(--edge)', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}>
                           <Edit3 size={14} />
                        </button>
                        <button onClick={(e) => handleCloseBudget(e, b.id)} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                           Close
                        </button>
                      </div>
                    )}
                    <ArrowUpRight size={15} className={styles.tileArrow} style={{ marginLeft: "0.5rem" }}/>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Past Budgets Panel */}
          <motion.div className={styles.panel} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Past Budgets</h2>
                <p className={styles.panelSub}>Closed and historical records</p>
              </div>
            </div>
            {isLoading ? (
              <div className={styles.skeletonList}>
                {[1].map((i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : closedBudgets.length === 0 ? (
              <div className={styles.emptyState}>
                <Archive size={38} className={styles.emptyIcon} style={{ opacity: 0.5 }}/>
                <p>No closed budgets.</p>
              </div>
            ) : (
              <div className={styles.companyList}>
                {closedBudgets.map((b) => (
                  <motion.div key={b.id} className={styles.companyTile} role="button" tabIndex={0}
                    whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => navigate(`/company/${companyId}/budget/${b.id}`, { state: { budgetName: b.name, companyName, userRole: currentUserRole } })}>
                    <div className={styles.tileAvatar} style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>CB</div>
                    <div className={styles.tileInfo}>
                      <strong>{b.name}</strong>
                      <span>{b.startDate} to {b.endDate}</span>
                    </div>
                    <div style={{ textAlign: "right", marginRight: "1rem" }}>
                      <strong style={{ color: "var(--text-muted)", display: "block", fontSize: "0.95rem" }}>₹{formatAmount(b.totalAmount)}</strong>
                      <span className={styles.roleOwner} style={{ marginTop: "4px" }}>{b.status}</span>
                    </div>
                    
                    {isPrivileged && (
                      <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        <button onClick={(e) => handleDeleteBudget(e, b.id)} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px', padding: '0.2rem 0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                           <Trash2 size={14} style={{ marginRight: '0.2rem' }}/> Delete
                        </button>
                      </div>
                    )}
                    <ArrowUpRight size={15} className={styles.tileArrow} style={{ marginLeft: "0.5rem", opacity: 0.5 }}/>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* CREATE BUDGET MODAL */}
      {showCreateBudget &&
        createPortal(
          <div className="create-modal-overlay" onClick={() => setShowCreateBudget(false)} role="presentation">
            <section className="create-modal" onClick={(event) => event.stopPropagation()}>
              <div className="create-modal-head">
                <h3>Create Budget</h3>
                <button className="create-modal-close" onClick={() => setShowCreateBudget(false)} type="button">X</button>
              </div>

              <form className="create-modal-form" onSubmit={handleCreateBudget}>
                <label className="field">
                  <span className="field-label">Budget Name</span>
                  <input
                    value={budgetName}
                    onChange={(event) => setBudgetName(event.target.value)}
                    placeholder="e.g. Q1 Marketing"
                    autoFocus
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Total Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalAmount}
                    onChange={(event) => setTotalAmount(event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </label>
                <div className="create-modal-actions">
                  <button className="create-cancel-btn" onClick={() => setShowCreateBudget(false)} type="button">Cancel</button>
                  <button className="create-confirm-btn" type="submit" disabled={isCreatingBudget}>
                    {isCreatingBudget ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body
        )}

      {/* EDIT BUDGET MODAL */}
      {showEditBudget &&
        createPortal(
          <div className="create-modal-overlay" onClick={() => setShowEditBudget(false)} role="presentation">
            <section className="create-modal" onClick={(event) => event.stopPropagation()}>
              <div className="create-modal-head">
                <h3>Edit Budget</h3>
                <button className="create-modal-close" onClick={() => setShowEditBudget(false)} type="button">X</button>
              </div>

              <form className="create-modal-form" onSubmit={handleUpdateBudget}>
                <label className="field">
                  <span className="field-label">Budget Name</span>
                  <input
                    value={budgetName}
                    onChange={(event) => setBudgetName(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Total Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalAmount}
                    onChange={(event) => setTotalAmount(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Status</span>
                  <select
                    value={editBudgetStatus}
                    onChange={(event) => setEditBudgetStatus(event.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid var(--edge)',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      background: 'var(--surface)'
                    }}
                    required
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </label>
                <div className="create-modal-actions">
                  <button className="create-cancel-btn" onClick={() => setShowEditBudget(false)} type="button">Cancel</button>
                  <button className="create-confirm-btn" type="submit" disabled={isUpdatingBudget}>
                    {isUpdatingBudget ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body
        )}

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isProcessing={confirmConfig.isProcessing}
      />

      {/* SHARE (MEMBERS) MODAL */}
      {showShareModal &&
        createPortal(
          <div className="create-modal-overlay" onClick={() => setShowShareModal(false)} role="presentation">
            <section className="create-modal share-modal" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 32rem)' }}>
              <div className="create-modal-head" style={{ marginBottom: '1rem', borderBottom: 'none', paddingBottom: 0 }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Share & Members</h3>
                <button className="create-modal-close" onClick={() => setShowShareModal(false)} type="button">×</button>
              </div>

              {error && <p className="dashboard-error" style={{ marginTop: 0, marginBottom: '1rem' }}>{error}</p>}

              {/* Only Privileged users see the "Add People" form */}
              {isPrivileged && (
                <form
                  className="share-add-form"
                  onSubmit={handleAddMember}
                  style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--edge)' }}
                >
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="Add people via email"
                    required
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem' }}
                  />
                  <select
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, paddingRight: '0.25rem' }}
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: isAddingMember ? 'wait' : 'pointer', opacity: isAddingMember ? 0.7 : 1 }}
                  >
                    {isAddingMember ? "..." : "Invite"}
                  </button>
                </form>
              )}

              {/* People with access list */}
              <div className="share-access-list">
                <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem', color: 'var(--text-main)', fontWeight: 600 }}>People with access</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '18rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {members.map((member) => (
                    <div key={member.userId} className="share-user-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="share-avatar" style={{ width: '2.4rem', height: '2.4rem', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                          {(member.fullName || member.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {member.fullName || "User"} {String(member.userId) === String(currentUserId) ? "(you)" : ""}
                          </strong>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{member.email}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isPrivileged && member.userId !== currentUserId && member.role !== 'OWNER' ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'right' }}
                          >
                            <option value="VIEWER">Viewer</option>
                            <option value="MEMBER">Member</option>
                            <option value="OWNER">Owner</option>
                            <option disabled>──────────</option>
                            <option value="REMOVE" style={{ color: 'var(--danger)' }}>Remove</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {member.role === 'OWNER' ? 'Owner' : member.role === 'MEMBER' ? 'Member' : 'Viewer'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>,
          document.body
        )}

    </div>
  );
}
