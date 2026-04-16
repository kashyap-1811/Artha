import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, Wallet, Archive,
  Plus, AlertTriangle, Edit3, Trash2, Activity,
  ArrowUpRight, X, Sparkles, CheckCircle2, Menu
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import { createBudget, getAllBudgets, updateBudget, closeBudget, removeBudget } from "../api/budgets";
import { getCompanyMembers, addCompanyMember, removeCompanyMember, changeMemberRole } from "../api/companies";
import { getUserByEmail } from "../api/users";
import AppSidebar from "../components/AppSidebar";
import styles from "./DashboardPage.module.css";
import companyStyles from "./CompanyPage.module.css";

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

// --- Main Page Component ---
export default function CompanyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useParams();

  const [budgets, setBudgets] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isCreatingBudget, setIsCreatingBudget] = useState(false);

  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editBudgetStatus, setEditBudgetStatus] = useState("");

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: null, isProcessing: false });

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("MEMBER");

  const requestConfirm = (title, message, actionFn) => {
    setConfirmConfig({
      isOpen: true, title, message, isProcessing: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isProcessing: true }));
        await actionFn();
        setConfirmConfig(prev => ({ ...prev, isOpen: false, isProcessing: false }));
      }
    });
  };

  const fetchData = useCallback(async () => {
    const userId = localStorage.getItem("artha_user_id");
    setIsLoading(true);
    setError("");
    try {
      const [budgetsData, membersData] = await Promise.all([
        getAllBudgets(companyId).catch(() => []),
        getCompanyMembers(companyId).catch(() => [])
      ]);
      
      const budgetsList = Array.isArray(budgetsData) ? budgetsData : [];
      setBudgets(budgetsList);
      
      const membersList = Array.isArray(membersData) ? membersData : [];
      setMembers(membersList);
      
      const myMembership = membersList.find(m => String(m.userId) === String(userId));
      if (myMembership?.role) {
        setCurrentUserRole(myMembership.role);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load company data.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) {
      navigate("/auth", { replace: true });
      return;
    }
    setCurrentUserId(userId);
    if (!companyId) return;
    fetchData();
  }, [companyId, navigate, fetchData]);

  // Logic to auto-close expired budgets on the backend
  useEffect(() => {
    if (budgets.length === 0 || isLoading) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredActiveBudgets = budgets.filter(b => {
      const end = new Date(b.endDate);
      return end < today && b.status === "ACTIVE";
    });

    if (expiredActiveBudgets.length > 0) {
      const autoCloseAll = async () => {
        try {
          await Promise.all(expiredActiveBudgets.map(b => closeBudget(b.id)));
          // Refresh list to show them as CLOSED
          fetchData();
        } catch (err) {
          console.error("Auto-close failed:", err);
        }
      };
      autoCloseAll();
    }
  }, [budgets, isLoading, fetchData]);

  useEffect(() => {
    if (!showCreateBudget && !showShareModal && !showEditBudget) return undefined;
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setShowCreateBudget(false);
        setShowShareModal(false);
        setShowEditBudget(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showCreateBudget, showShareModal, showEditBudget]);

  const companyName = location.state?.companyName || "Company Overview";
  const isPrivileged = currentUserRole === 'OWNER';

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [budgets]);

  const activeBudgets = sortedBudgets.filter(b => b.status === "ACTIVE");
  const closedBudgets = sortedBudgets.filter(b => b.status !== "ACTIVE");

  const formatAmount = (val) => {
    if (val === undefined || val === null) return "₹0";
    return "₹" + Number(val).toLocaleString('en-IN');
  };

  // --- Handlers ---
  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!budgetName.trim() || !totalAmount || !startDate || !endDate) {
      setError("Fill in all fields.");
      return;
    }
    setIsCreatingBudget(true);
    try {
      await createBudget({ companyId, name: budgetName.trim(), totalAmount: Number(totalAmount), startDate, endDate });
      fetchData();
      setShowCreateBudget(false);
      setBudgetName(""); setTotalAmount(""); setStartDate(""); setEndDate("");
    } catch (err) { setError(err.message || "Failed to create budget."); }
    finally { setIsCreatingBudget(false); }
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    setIsUpdatingBudget(true);
    try {
      await updateBudget(editingBudgetId, { name: budgetName.trim(), totalAmount: Number(totalAmount), startDate, endDate, status: editBudgetStatus });
      fetchData();
      setShowEditBudget(false);
      setError(""); // Clear error on success
    } catch (err) { setError(err.message || "Failed to update."); }
    finally { setIsUpdatingBudget(false); }
  };

  const handleCloseBudget = (id) => {
    requestConfirm("Close Budget", "Archive this budget? It will stop active tracking.", async () => {
      try { await closeBudget(id); fetchData(); }
      catch (err) { setError(err.message || "Failed to close."); }
    });
  };

  const handleDeleteBudget = (id) => {
    requestConfirm("Delete Budget", "Permanently delete this budget? All expense records will be lost.", async () => {
      try { await removeBudget(id); fetchData(); }
      catch (err) { setError(err.message || "Failed to delete."); }
    });
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setIsAddingMember(true);
    try {
      const foundUser = await getUserByEmail(memberEmail.trim());
      await addCompanyMember(companyId, { userId: foundUser.id || foundUser.userId, role: memberRole });
      const updated = await getCompanyMembers(companyId);
      setMembers(updated);
      setMemberEmail("");
    } catch (err) { setError(err.message || "User not found or add failed."); }
    finally { setIsAddingMember(false); }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (newRole === "REMOVE") {
      requestConfirm("Remove Member", "Revoke access for this user?", async () => {
        try { await removeCompanyMember(companyId, userId); setMembers(prev => prev.filter(m => m.userId !== userId)); }
        catch (err) { setError(err.message || "Failed to remove."); }
      });
      return;
    }
    try { await changeMemberRole(companyId, userId, newRole); fetchData(); }
    catch (err) { setError(err.message || "Failed to change role."); }
  };

  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      <div className={companyStyles.container}>
        {/* ── HEADER ── */}
        <div className={companyStyles.header}>
          <button type="button" className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          <div className={companyStyles.titleBox}>

            <p className={styles.greetingLabel}>Business Code: {companyId.split("-")[0].toUpperCase()}</p>
            <h1 className={styles.greetingTitle}>{companyName} <Sparkles size={20} className={styles.sparkle} /></h1>
          </div>
          <div className={companyStyles.actions}>
            <button className={`${companyStyles.actionBtn} ${companyStyles.btnSecondary}`} onClick={() => setShowShareModal(true)}>
              <Users size={16} /> Share
            </button>
            <button className={`${companyStyles.actionBtn} ${companyStyles.btnGreen}`} onClick={() => navigate(`/company/${companyId}/analysis`)}>
              <Activity size={16} /> Analytics
            </button>
            {isPrivileged && (
              <button className={`${companyStyles.actionBtn} ${companyStyles.btnPrimary}`} onClick={() => setShowCreateBudget(true)}>
                <Plus size={18} /> New Budget
              </button>
            )}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} 
            style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', border: '1px solid #fecaca' }}>
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}

        {/* ── STATS ── */}
        <div className={styles.statsRow}>
          <StatCard icon={Wallet} label="Total Budgets" value={isLoading ? "–" : budgets.length} colorClass="cardBlue" />
          <StatCard icon={Building2} label="Active" value={isLoading ? "–" : activeBudgets.length} colorClass="cardGreen" badge={activeBudgets.length > 0 ? "Running" : undefined} />
          <StatCard icon={Archive} label="Closed" value={isLoading ? "–" : closedBudgets.length} colorClass="cardPurple" />
          <StatCard icon={Users} label="Members" value={isLoading ? "–" : members.length} colorClass="cardAmber" />
        </div>

        {/* ── BUDGETS ── */}
        <div className={companyStyles.section}>
          <div className={companyStyles.sectionHeader}>
            <div>
              <h2 className={companyStyles.sectionTitle}>Active Budgets</h2>
              <p className={companyStyles.sectionSub}>Currently tracked and accessible for expenses</p>
            </div>
          </div>

          <div className={styles.companyList}>
            {isLoading ? [1, 2].map(i => <div key={i} className={styles.skeleton} />) : activeBudgets.length === 0 ? (
              <div className={styles.emptyState}><Wallet size={34} className={styles.emptyIcon} /><p>No active budgets.</p></div>
            ) : activeBudgets.map(b => (
              <motion.div key={b.id} className={styles.companyTile} onClick={() => navigate(`/company/${companyId}/budget/${b.id}`, { state: { budgetName: b.name, companyName, userRole: currentUserRole } })}
                whileHover={{ x: 6, backgroundColor: '#f8fafc' }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <div className={styles.tileAvatar} style={{ background: '#e0e7ff', color: '#4f46e5' }}>AB</div>
                <div className={styles.tileInfo}>
                  <strong style={{ fontSize: '1.05rem' }}>{b.name}</strong>
                  <span>{b.startDate} to {b.endDate}</span>
                </div>
                <div style={{ textAlign: "right", marginRight: "1.5rem" }}>
                  <strong style={{ display: "block", color: '#0f172a' }}>{formatAmount(b.totalAmount)}</strong>
                  <span className={styles.roleOwner}>{b.status}</span>
                </div>
                {isPrivileged && (
                  <div className={styles.tileActions} onClick={e => e.stopPropagation()}>
                    <button className={styles.miniActionBtn} onClick={(e) => {
                      e.stopPropagation(); setEditingBudgetId(b.id); setBudgetName(b.name); setTotalAmount(b.totalAmount);
                      setStartDate(b.startDate); setEndDate(b.endDate); setEditBudgetStatus(b.status); setShowEditBudget(true);
                    }}><Edit3 size={15} /></button>
                    <button className={styles.miniActionBtn} style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={(e) => { e.stopPropagation(); handleCloseBudget(b.id); }}>Close</button>
                  </div>
                )}
                <ArrowUpRight size={18} className={styles.tileArrow} />
              </motion.div>
            ))}
          </div>
        </div>

        <div className={companyStyles.section}>
          <div className={companyStyles.sectionHeader}>
            <div>
              <h2 className={companyStyles.sectionTitle}>Past Budgets</h2>
              <p className={companyStyles.sectionSub}>Closed, historical, or auto-expired records</p>
            </div>
          </div>
          <div className={styles.companyList}>
            {isLoading ? [1].map(i => <div key={i} className={styles.skeleton} />) : closedBudgets.length === 0 ? (
              <div className={styles.emptyState}><Archive size={34} style={{ opacity: 0.5 }} /><p>No archived budgets.</p></div>
            ) : closedBudgets.map(b => (
              <motion.div key={b.id} className={styles.companyTile} onClick={() => navigate(`/company/${companyId}/budget/${b.id}`, { state: { budgetName: b.name, companyName, userRole: currentUserRole } })}
                whileHover={{ x: 6, opacity: 0.9 }}>
                <div className={styles.tileAvatar} style={{ background: '#f1f5f9', color: '#64748b' }}>CB</div>
                <div className={styles.tileInfo}>
                  <strong>{b.name}</strong>
                  <span>{b.startDate} to {b.endDate}</span>
                </div>
                <div style={{ textAlign: "right", marginRight: "1.5rem" }}>
                  <strong style={{ display: "block", color: '#64748b' }}>{formatAmount(b.totalAmount)}</strong>
                  <span className={styles.roleOwner} style={{ background: '#f1f5f9', color: '#475569' }}>{b.status}</span>
                </div>
                {isPrivileged && (
                  <button className={styles.miniActionBtn} style={{ color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDeleteBudget(b.id); }}><Trash2 size={15} /></button>
                )}
                <ArrowUpRight size={18} className={styles.tileArrow} style={{ opacity: 0.4 }} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE BUDGET MODAL */}
      {createPortal(
        <AnimatePresence>
          {showCreateBudget && (
            <motion.div 
              className={companyStyles.modalOverlay} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateBudget(false)}
            >
              <motion.div 
                className={companyStyles.modal} 
                onClick={e => e.stopPropagation()} 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className={companyStyles.modalHead}>
                  <h3 className={companyStyles.modalTitle}>New Budget</h3>
                  <button type="button" className={companyStyles.closeBtn} onClick={() => { setShowCreateBudget(false); setError(""); }}>
                    <X size={18}/>
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <AlertTriangle size={14} /> {error}
                  </motion.div>
                )}

                <form className={companyStyles.form} onSubmit={handleCreateBudget}>
                  <div className={companyStyles.field}>
                    <label className={companyStyles.label}>Budget Name</label>
                    <input 
                      autoFocus 
                      required 
                      className={companyStyles.input} 
                      value={budgetName} 
                      onChange={e => setBudgetName(e.target.value)} 
                      placeholder="e.g. Q2 Marketing"
                    />
                  </div>
                  <div className={companyStyles.field}>
                    <label className={companyStyles.label}>Total Allocation (₹)</label>
                    <input 
                      type="number" 
                      required 
                      className={companyStyles.input} 
                      value={totalAmount} 
                      onChange={e => setTotalAmount(e.target.value)} 
                      placeholder="50,000"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={companyStyles.field}>
                      <label className={companyStyles.label}>Start Date</label>
                      <input 
                        type="date" 
                        required 
                        className={companyStyles.input} 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className={companyStyles.field}>
                      <label className={companyStyles.label}>End Date</label>
                      <input 
                        type="date" 
                        required 
                        className={companyStyles.input} 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={companyStyles.modalActions}>
                    <button type="button" className={companyStyles.btnModalCancel} onClick={() => { setShowCreateBudget(false); setError(""); }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={isCreatingBudget} className={companyStyles.btnModalSubmit}>
                      {isCreatingBudget ? "Creating..." : "Create Budget"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* EDIT BUDGET MODAL */}
      {createPortal(
        <AnimatePresence>
          {showEditBudget && (
            <motion.div 
              className={companyStyles.modalOverlay} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditBudget(false)}
            >
              <motion.div 
                className={companyStyles.modal} 
                onClick={e => e.stopPropagation()} 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className={companyStyles.modalHead}>
                  <h3 className={companyStyles.modalTitle}>Edit Budget</h3>
                  <button type="button" className={companyStyles.closeBtn} onClick={() => { setShowEditBudget(false); setError(""); }}>
                    <X size={18}/>
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <AlertTriangle size={14} /> {error}
                  </motion.div>
                )}

                <form className={companyStyles.form} onSubmit={handleUpdateBudget}>
                  <div className={companyStyles.field}>
                    <label className={companyStyles.label}>Budget Name</label>
                    <input required className={companyStyles.input} value={budgetName} onChange={e => setBudgetName(e.target.value)}/>
                  </div>
                  <div className={companyStyles.field}>
                    <label className={companyStyles.label}>Total Amount (₹)</label>
                    <input type="number" required className={companyStyles.input} value={totalAmount} onChange={e => setTotalAmount(e.target.value)}/>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={companyStyles.field}>
                      <label className={companyStyles.label}>Start Date</label>
                      <input type="date" required className={companyStyles.input} value={startDate} onChange={e => setStartDate(e.target.value)}/>
                    </div>
                    <div className={companyStyles.field}>
                      <label className={companyStyles.label}>End Date</label>
                      <input type="date" required className={companyStyles.input} value={endDate} onChange={e => setEndDate(e.target.value)}/>
                    </div>
                  </div>
                  <div className={companyStyles.field}>
                    <label className={companyStyles.label}>Status</label>
                    <select value={editBudgetStatus} onChange={e => setEditBudgetStatus(e.target.value)} className={companyStyles.input}>
                      <option value="ACTIVE">Active</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div className={companyStyles.modalActions}>
                    <button type="button" className={companyStyles.btnModalCancel} onClick={() => { setShowEditBudget(false); setError(""); }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={isUpdatingBudget} className={companyStyles.btnModalSubmit}>
                      {isUpdatingBudget ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* SHARE MODAL */}
      {createPortal(
        <AnimatePresence>
          {showShareModal && (
            <motion.div 
              className={companyStyles.modalOverlay} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
            >
              <motion.div 
                className={companyStyles.modal} 
                onClick={e => e.stopPropagation()} 
                style={{ maxWidth: '500px' }} 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className={companyStyles.modalHead}>
                  <h3 className={companyStyles.modalTitle}>Manage Access</h3>
                  <button type="button" className={companyStyles.closeBtn} onClick={() => { setShowShareModal(false); setError(""); }}>
                    <X size={18}/>
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <AlertTriangle size={14} /> {error}
                  </motion.div>
                )}
                
                {isPrivileged && (
                  <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
                    <input 
                      type="email" 
                      required 
                      className={companyStyles.input} 
                      style={{ flex: 1 }} 
                      placeholder="Invite via email..." 
                      value={memberEmail} 
                      onChange={e => setMemberEmail(e.target.value)}
                    />
                    <select 
                      value={memberRole} 
                      onChange={e => setMemberRole(e.target.value)} 
                      className={companyStyles.input} 
                      style={{ width: 'auto' }}
                    >
                      <option value="MEMBER">Member</option>
                      <option value="OWNER">Owner</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button 
                      type="submit" 
                      disabled={isAddingMember} 
                      className={companyStyles.btnPrimary} 
                      style={{ padding: '0 1rem', borderRadius: '12px' }}
                    >
                      {isAddingMember ? "..." : "Add"}
                    </button>
                  </form>
                )}

                <div className={companyStyles.memberList}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Members with access
                  </h4>
                  {members.map(m => (
                    <div key={m.userId} className={companyStyles.memberItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3b82f6' }}>
                          { (m.fullName || m.email || "?").charAt(0).toUpperCase() }
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '0.95rem' }}>
                            {m.fullName || "User"} {String(m.userId) === String(currentUserId) ? "(you)" : ""}
                          </strong>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.email}</span>
                        </div>
                      </div>
                      {isPrivileged && m.userId !== currentUserId ? (
                        <select 
                          value={m.role} 
                          onChange={e => handleChangeRole(m.userId, e.target.value)} 
                          style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', outline: 'none' }}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="OWNER">Owner</option>
                          <option value="VIEWER">Viewer</option>
                          <option value="REMOVE">Remove</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                          {m.role}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isProcessing={confirmConfig.isProcessing} />
      
      <style>{`
        .${styles.miniActionBtn} {
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .${styles.miniActionBtn}:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .${styles.tileActions} {
          display: flex;
          gap: 6px;
          margin-right: 1rem;
        }
        .${styles.tileArrowWrap} {
          color: #94a3b8;
          transition: transform 0.2s;
        }
        .${styles.companyTile}:hover .${styles.tileArrowWrap} {
          transform: translate(2px, -2px);
          color: #3b82f6;
        }
      `}</style>
    </AppSidebar>
  );
}
