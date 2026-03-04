import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { createCompany, getMyCompanies } from "../api/companies";
import { getUserById } from "../api/users";

function DashboardPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("artha_user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const [userName, setUserName] = useState(user.fullName || "");

  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) {
      navigate("/auth", { replace: true });
      return;
    }

    async function loadDashboardData() {
      setIsLoading(true);
      setError("");
      try {
        const [companyData, profile] = await Promise.all([
          getMyCompanies(),
          user.fullName ? Promise.resolve(null) : getUserById(userId).catch(() => null)
        ]);

        setCompanies(Array.isArray(companyData) ? companyData : []);

        if (profile?.fullName) {
          setUserName(profile.fullName);
          try {
            const current = JSON.parse(localStorage.getItem("artha_user") || "{}");
            localStorage.setItem(
              "artha_user",
              JSON.stringify({
                ...current,
                fullName: profile.fullName
              })
            );
          } catch {
            // ignore localStorage parse/update issues
          }
        }
      } catch (requestError) {
        setError(requestError.message || "Failed to load companies.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [navigate, user.fullName]);

  useEffect(() => {
    if (!showCreate) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowCreate(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showCreate]);

  async function handleCreateCompany(event) {
    event.preventDefault();
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setError("Please enter a company name.");
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const created = await createCompany(trimmedName);
      setCompanies((previous) => [
        {
          companyId: created.id,
          companyName: created.name,
          companyType: created.type,
          role: "OWNER"
        },
        ...previous
      ]);
      setCompanyName("");
      setShowCreate(false);
    } catch (requestError) {
      setError(requestError.message || "Failed to create company.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-layout">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-overline">Overview</p>
            <h1>Good evening {userName || "User"}</h1>
          </div>

        </header>

        <section className="balance-card">
          <p>Total companies</p>
          <h2>{companies.length}</h2>
          <span>Manage your organizations in one place.</span>
        </section>

        <section className="companies-section">
          <div className="companies-header">
            <h3>Your Companies</h3>
            <button className="create-btn" onClick={() => setShowCreate(true)} type="button">
              Create Company
            </button>
          </div>

          {error && <p className="dashboard-error">{error}</p>}

          {isLoading ? (
            <p className="dashboard-muted">Loading companies...</p>
          ) : companies.length === 0 ? (
            <p className="dashboard-muted">No companies found. Create your first company.</p>
          ) : (
            <div className="company-grid">
              {companies.map((company) => (
                <button
                  className="company-tile"
                  key={company.companyId}
                  onClick={() =>
                    navigate(`/company/${company.companyId}`, {
                      state: { companyName: company.companyName }
                    })
                  }
                  type="button"
                >
                  <div className="company-tile-head">
                    <strong>{company.companyName}</strong>
                    <span>&gt;</span>
                  </div>
                  <p>{company.companyType}</p>
                  <small>{company.role}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      {showCreate &&
        createPortal(
          <div className="create-modal-overlay" onClick={() => setShowCreate(false)} role="presentation">
            <section className="create-modal" onClick={(event) => event.stopPropagation()}>
              <div className="create-modal-head">
                <h3>Create Company</h3>
                <button className="create-modal-close" onClick={() => setShowCreate(false)} type="button">
                  x
                </button>
              </div>

              <form className="create-modal-form" onSubmit={handleCreateCompany}>
                <label className="field">
                  <span className="field-label">Company Name</span>
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Enter company name"
                    autoFocus
                    required
                  />
                </label>
                <div className="create-modal-actions">
                  <button className="create-cancel-btn" onClick={() => setShowCreate(false)} type="button">
                    Cancel
                  </button>
                  <button className="create-confirm-btn" type="submit" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create"}
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

export default DashboardPage;
