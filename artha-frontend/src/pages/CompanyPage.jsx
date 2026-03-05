import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createBudget, getAllBudgets, updateBudget, closeBudget, removeBudget } from "../api/budgets";
import { getCompanyMembers, addCompanyMember, removeCompanyMember, changeMemberRole } from "../api/companies";
import { getUserByEmail } from "../api/users";

function CompanyPage() {
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
  const [editBudgetStatus, setEditBudgetStatus] = useState("");

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("MEMBER");

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
          getAllBudgets(companyId),
          getCompanyMembers(companyId)
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
    if (!showCreateBudget && !showAddMember) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowCreateBudget(false);
        setShowAddMember(false);
        setShowEditBudget(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showCreateBudget, showAddMember]);

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

  const isPrivileged = currentUserRole === 'OWNER';

  function formatAmount(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return "0.00";
    return parsed.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

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
    // Handle specific date/time format mapping if needed, assuming YYYY-MM-DD
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

  async function handleCloseBudget(event, budgetId) {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to close this budget?")) return;

    setError("");
    try {
      await closeBudget(budgetId);
      // Update local state by refetching or modifying
      setBudgets((prev) => prev.map(b => b.id === budgetId ? { ...b, status: 'CLOSED' } : b));
    } catch (requestError) {
      setError(requestError.message || "Failed to close budget.");
    }
  }

  async function handleDeleteBudget(event, budgetId) {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this budget permanently?")) return;

    setError("");
    try {
      await removeBudget(budgetId);
      setBudgets((prev) => prev.filter(b => b.id !== budgetId));
    } catch (requestError) {
      setError(requestError.message || "Failed to delete budget.");
    }
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
      setShowAddMember(false);
    } catch (requestError) {
      setError(requestError.message || "Failed to add member. Double check the email address.");
    } finally {
      setIsAddingMember(false);
    }
  }

  async function handleRemoveMember(memberUserId) {
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    setError("");
    try {
      await removeCompanyMember(companyId, memberUserId);
      setMembers((prev) => prev.filter((m) => m.userId !== memberUserId));
    } catch (requestError) {
      setError(requestError.message || "Failed to remove member.");
    }
  }

  async function handleChangeRole(memberUserId, newRole) {
    setError("");
    try {
      const updatedMember = await changeMemberRole(companyId, memberUserId, newRole);
      setMembers((prev) => prev.map(m => m.userId === memberUserId ? updatedMember : m));
    } catch (requestError) {
      setError(requestError.message || "Failed to change member role.");
    }
  }

  return (
    <main className="company-shell">
      <section className="company-card">
        <header className="company-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button className="back-btn" onClick={() => navigate("/dashboard")} type="button">
              Back
            </button>
            <h1>{companyName}</h1>
            <p>Company ID: {companyId}</p>
          </div>
          {isPrivileged && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="create-btn" onClick={() => setShowAddMember(true)} type="button">
                Add Member
              </button>
              <button className="create-btn" onClick={() => setShowCreateBudget(true)} type="button">
                Create Budget
              </button>
            </div>
          )}
        </header>

        {error && <p className="dashboard-error">{error}</p>}

        {isLoading ? (
          <p className="dashboard-muted">Loading company data...</p>
        ) : (
          <div className="budget-sections">
            <section className="budget-group">
              <h2>Company Members</h2>
              {members.length === 0 ? (
                <p className="dashboard-muted">No members found.</p>
              ) : (
                <div className="budget-grid">
                  {members.map((member) => (
                    <article className="budget-tile active" key={member.userId} style={{ cursor: 'default' }}>
                      <div className="budget-tile-head">
                        <strong>{member.fullName || member.email}</strong>
                        {isPrivileged && member.userId !== currentUserId && member.role !== 'OWNER' ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                            style={{ padding: '0.1rem 0.3rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--edge)', background: 'var(--bg-card)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <option value="VIEWER">VIEWER</option>
                            <option value="MEMBER">MEMBER</option>
                            <option value="OWNER">OWNER</option>
                          </select>
                        ) : (
                          <span>{member.role === 'OWNER' && !isPrivileged ? 'OWNER' : member.role}</span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{member.email}</p>
                      {isPrivileged && member.userId !== currentUserId && member.role !== 'OWNER' && (
                        <button
                          className="status-inactive profile-status"
                          style={{ border: 'none', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          Remove
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

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
                          state: { budgetName: budget.name, companyName, userRole: currentUserRole }
                        })
                      }
                      type="button"
                    >
                      <div className="budget-tile-head">
                        <strong>{budget.name}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span>{budget.status}</span>
                          {isPrivileged && (
                            <div style={{ display: 'flex', gap: '0.3rem' }} onClick={e => e.stopPropagation()}>
                              <button
                                className="status-inactive profile-status"
                                style={{ border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                onClick={(e) => openEditBudget(e, budget)}
                              >
                                Edit
                              </button>
                              <button
                                className="status-inactive profile-status"
                                style={{ border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444' }}
                                onClick={(e) => handleCloseBudget(e, budget.id)}
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </div>
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
                          state: { budgetName: budget.name, companyName, userRole: currentUserRole }
                        })
                      }
                      type="button"
                    >
                      <div className="budget-tile-head">
                        <strong>{budget.name}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span>{budget.status}</span>
                          {isPrivileged && (
                            <button
                              className="status-inactive profile-status"
                              style={{ border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444' }}
                              onClick={(e) => handleDeleteBudget(e, budget.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
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

      {/* CREATE BUDGET MODAL */}
      {showCreateBudget &&
        createPortal(
          <div className="create-modal-overlay" onClick={() => setShowCreateBudget(false)} role="presentation">
            <section className="create-modal" onClick={(event) => event.stopPropagation()}>
              <div className="create-modal-head">
                <h3>Create Budget</h3>
                <button className="create-modal-close" onClick={() => setShowCreateBudget(false)} type="button">
                  x
                </button>
              </div>

              <form className="create-modal-form" onSubmit={handleCreateBudget}>
                <label className="field">
                  <span className="field-label">Budget Name</span>
                  <input
                    value={budgetName}
                    onChange={(event) => setBudgetName(event.target.value)}
                    placeholder="Enter budget name"
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
                    placeholder="Enter total amount"
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
                  <button className="create-cancel-btn" onClick={() => setShowCreateBudget(false)} type="button">
                    Cancel
                  </button>
                  <button className="create-confirm-btn" type="submit" disabled={isCreatingBudget}>
                    {isCreatingBudget ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body
        )}

      {/* ADD MEMBER MODAL */}
      {showAddMember &&
        createPortal(
          <div className="create-modal-overlay" onClick={() => setShowAddMember(false)} role="presentation">
            <section className="create-modal" onClick={(event) => event.stopPropagation()}>
              <div className="create-modal-head">
                <h3>Add Company Member</h3>
                <button className="create-modal-close" onClick={() => setShowAddMember(false)} type="button">
                  x
                </button>
              </div>

              <form className="create-modal-form" onSubmit={handleAddMember}>
                <label className="field">
                  <span className="field-label">User Email</span>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="Enter user's email address"
                    autoFocus
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Role</span>
                  <select
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid var(--edge)',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      color: 'var(--text-main)',
                      backgroundColor: 'transparent'
                    }}
                    required
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </label>
                <div className="create-modal-actions">
                  <button className="create-cancel-btn" onClick={() => setShowAddMember(false)} type="button">
                    Cancel
                  </button>
                  <button className="create-confirm-btn" type="submit" disabled={isAddingMember}>
                    {isAddingMember ? "Adding..." : "Add Member"}
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
                <button className="create-modal-close" onClick={() => setShowEditBudget(false)} type="button">
                  x
                </button>
              </div>

              <form className="create-modal-form" onSubmit={handleUpdateBudget}>
                <label className="field">
                  <span className="field-label">Budget Name</span>
                  <input
                    value={budgetName}
                    onChange={(event) => setBudgetName(event.target.value)}
                    placeholder="Enter budget name"
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
                    placeholder="Enter total amount"
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
                      color: 'var(--text-main)',
                      backgroundColor: 'transparent'
                    }}
                    required
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </label>
                <div className="create-modal-actions">
                  <button className="create-cancel-btn" onClick={() => setShowEditBudget(false)} type="button">
                    Cancel
                  </button>
                  <button className="create-confirm-btn" type="submit" disabled={isUpdatingBudget}>
                    {isUpdatingBudget ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body
        )}
    </main>
  );
}

export default CompanyPage;
