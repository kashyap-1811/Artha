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
import { getMyCompanies, getCompanyMembers, changeMemberRole, addCompanyMember } from "../api/companies";
import { getUserByEmail } from "../api/users";
import AppSidebar from "../components/AppSidebar";
import StatCard from "../components/StatCard";
import FloatingActionButton from "../components/FloatingActionButton";
import dashStyles from "./DashboardPage.module.css";
import companyStyles from "./CompanyPage.module.css";

// --- Helper UI Components ---

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
  const [companyName, setCompanyName] = useState(location.state?.companyName || "Company Overview");

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
    setIsLoading(true);
    try {
      const [membersData, budgetsData] = await Promise.all([
        getCompanyMembers(companyId).catch(() => []),
        getAllBudgets(companyId).catch(() => [])
      ]);
      setMembers(membersData);
      setBudgets(budgetsData);

      // Fetch company name if missing
      if (companyName === "Company Overview") {
        const myCompanies = await getMyCompanies().catch(() => []);
        const current = myCompanies.find(c => c.id === companyId);
        if (current) setCompanyName(current.name);
      }
      
      const userId = localStorage.getItem("artha_user_id");
      const myMembership = membersData.find(m => String(m.userId) === String(userId));
      if (myMembership?.role) {
        setCurrentUserRole(myMembership.role);
      }
    } catch (err) {
      setError(err.message || "Failed to load company data.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, companyName]);

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
      <>
        {/* ── HEADER ── */}
      <div className={companyStyles.header}>
        <div className={companyStyles.topBarLeft}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className={dashStyles.greetingLabel} style={{ fontSize: '0.65rem' }}>BUSINESS CODE: {companyId.split("-")[0].toUpperCase()}</p>
            <h1 className={dashStyles.greetingTitle}>
              {companyName} <Sparkles size={16} className={dashStyles.sparkle} />
            </h1>
          </div>
        </div>
        
        <div className={companyStyles.actions}>
          <button className={`${companyStyles.actionBtn} ${companyStyles.btnSecondary}`} onClick={() => setShowShareModal(true)}>
            <Users size={14} /> Share
          </button>
          <button className={`${companyStyles.actionBtn} ${companyStyles.btnGreen}`} onClick={() => navigate(`/company/${companyId}/analysis`)}>
            <Activity size={14} /> Analytics
          </button>
        </div>
      </div>

      {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} 
            style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', border: '1px solid #fecaca' }}>
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}

        {/* ── STATS ── */}
        <div className={dashStyles.statsRow}>
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

          <div className={dashStyles.companyList}>
            {isLoading ? [1, 2].map(i => <div key={i} className={dashStyles.skeleton} />) : activeBudgets.length === 0 ? (
              <div className={dashStyles.emptyState}><Wallet size={34} className={dashStyles.emptyIcon} /><p>No active budgets.</p></div>
            ) : activeBudgets.map(b => (
              <motion.div key={b.id} className={companyStyles.compactTile} onClick={() => navigate(`/company/${companyId}/budget/${b.id}`, { state: { budgetName: b.name, companyName, userRole: currentUserRole } })}
                whileHover={{ x: 6, backgroundColor: '#f8fafc' }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                
                <div className={companyStyles.tileMain}>
                  <div className={dashStyles.tileAvatar} style={{ background: '#e0e7ff', color: '#4f46e5' }}>AB</div>
                  <div className={dashStyles.tileInfo}>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{b.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{b.startDate} to {b.endDate}</span>
                  </div>
                </div>

                <div className={companyStyles.budgetMetaRow}>
                  <div className={companyStyles.tileFinance}>
                    <strong className={companyStyles.tileAmount}>{formatAmount(b.totalAmount)}</strong>
                    <span className={dashStyles.roleOwner}>{b.status}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPrivileged && (
                      <div className={dashStyles.tileActions} onClick={e => e.stopPropagation()}>
                        <button className={dashStyles.miniActionBtn} style={{ padding: '4px 8px' }} onClick={(e) => {
                          e.stopPropagation(); setEditingBudgetId(b.id); setBudgetName(b.name); setTotalAmount(b.totalAmount);
                          setStartDate(b.startDate); setEndDate(b.endDate); setEditBudgetStatus(b.status); setShowEditBudget(true);
                        }}><Edit3 size={14} /></button>
                        <button className={dashStyles.miniActionBtn} style={{ color: '#ef4444', borderColor: '#fee2e2', padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); handleCloseBudget(b.id); }}>Close</button>
                      </div>
                    )}
                    <ArrowUpRight size={18} className={dashStyles.tileArrow} />
                  </div>
                </div>
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
          <div className={dashStyles.companyList}>
            {isLoading ? [1].map(i => <div key={i} className={dashStyles.skeleton} />) : closedBudgets.length === 0 ? (
              <div className={dashStyles.emptyState}><Archive size={34} style={{ opacity: 0.5 }} /><p>No archived budgets.</p></div>
            ) : closedBudgets.map(b => (
              <motion.div key={b.id} className={companyStyles.compactTile} onClick={() => navigate(`/company/${companyId}/budget/${b.id}`, { state: { budgetName: b.name, companyName, userRole: currentUserRole } })}
                whileHover={{ x: 6, opacity: 0.9 }}>
                
                <div className={companyStyles.tileMain}>
                  <div className={dashStyles.tileAvatar} style={{ background: '#f1f5f9', color: '#64748b' }}>CB</div>
                  <div className={dashStyles.tileInfo}>
                    <strong style={{ fontSize: '1.05rem', color: '#475569' }}>{b.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{b.startDate} to {b.endDate}</span>
                  </div>
                </div>

                <div className={companyStyles.budgetMetaRow}>
                  <div className={companyStyles.tileFinance}>
                    <strong className={companyStyles.tileAmount}>{formatAmount(b.totalAmount)}</strong>
                    <span className={dashStyles.roleOwner} style={{ background: '#f1f5f9', color: '#475569' }}>{b.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPrivileged && (
                      <button className={dashStyles.miniActionBtn} style={{ color: '#ef4444', padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); handleDeleteBudget(b.id); }}><Trash2 size={14} /></button>
                    )}
                    <ArrowUpRight size={18} className={dashStyles.tileArrow} style={{ opacity: 0.4 }} />
                  </div>
                </div>
              </motion.div>
            ))}
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
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                  <div className={companyStyles.dateGrid}>
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
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                  <div className={companyStyles.dateGrid}>
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
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                  <form onSubmit={handleAddMember} className={companyStyles.inviteRow}>
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
                      <div className={companyStyles.memberInfo}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3b82f6', flexShrink: 0 }}>
                          { (m.fullName || m.email || "?").charAt(0).toUpperCase() }
                        </div>
                        <div className={companyStyles.memberText}>
                          <strong className={companyStyles.deviceName}>
                            {m.fullName || "User"} {String(m.userId) === String(currentUserId) ? "(you)" : ""}
                          </strong>
                          <span className={companyStyles.deviceEmail}>{m.email}</span>
                        </div>
                      </div>
                      {isPrivileged && m.userId !== currentUserId ? (
                        <select 
                          value={m.role} 
                          onChange={e => handleChangeRole(m.userId, e.target.value)} 
                          style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', outline: 'none', flexShrink: 0 }}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="OWNER">Owner</option>
                          <option value="VIEWER">Viewer</option>
                          <option value="REMOVE">Remove</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
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

      {/* ── MOBILE FAB ── */}
      {isPrivileged && !showCreateBudget && !showShareModal && !showEditBudget && (
        <FloatingActionButton 
          onClick={() => setShowCreateBudget(true)}
          label="New Budget"
          icon={Plus}
        />
      )}
      
      <style>{`
        .${dashStyles.miniActionBtn} {
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .${dashStyles.miniActionBtn}:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .${dashStyles.tileActions} {
          display: flex;
          gap: 6px;
          margin-right: 1rem;
        }
        .${dashStyles.tileArrowWrap} {
          color: #94a3b8;
          transition: transform 0.2s;
        }
        .${dashStyles.companyTile}:hover .${dashStyles.tileArrowWrap} {
          transform: translate(2px, -2px);
          color: #3b82f6;
        }
      `}</style>
      </>
    </AppSidebar>
  );
}
