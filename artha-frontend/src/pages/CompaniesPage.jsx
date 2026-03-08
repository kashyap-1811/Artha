import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Plus, TrendingUp, Clock,
  ArrowUpRight, X, LayoutDashboard,
  Wallet, BarChart2, Settings, Menu,
} from "lucide-react";
import { createCompany, getMyCompanies } from "../api/companies";
import { getUserById } from "../api/users";
import styles from "./DashboardPage.module.css";

/* ── Wavy Stat Card ── */
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

/* ── Company Tile ── */
function CompanyTile({ company, onClick }) {
  const initials = company.companyName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <motion.button
      className={styles.companyTile}
      onClick={onClick}
      type="button"
      whileHover={{ x: 4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className={styles.tileAvatar}>{initials}</div>
      <div className={styles.tileInfo}>
        <strong>{company.companyName}</strong>
        <span>{company.companyType || "Organization"}</span>
      </div>
      <div className={`${styles.tileRole} ${company.role === "OWNER" ? styles.roleOwner : ""}`}>
        {company.role}
      </div>
      <ArrowUpRight size={15} className={styles.tileArrow} />
    </motion.button>
  );
}

/* ── Sidebar Nav Link ── */
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

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("artha_user") || "{}"); }
    catch { return {}; }
  }, []);

  /* Auth + data */
  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) { navigate("/auth", { replace: true }); return; }
    async function load() {
      setIsLoading(true);
      try {
        const [companyData, profile] = await Promise.all([
          getMyCompanies(),
          user.fullName ? Promise.resolve(null) : getUserById(userId).catch(() => null),
        ]);
        setCompanies(Array.isArray(companyData) ? companyData : []);
        if (profile?.fullName) {
          try {
            const cur = JSON.parse(localStorage.getItem("artha_user") || "{}");
            localStorage.setItem("artha_user", JSON.stringify({ ...cur, fullName: profile.fullName }));
          } catch { /* ignore */ }
        }
      } catch (e) { setError(e.message || "Failed to load."); }
      finally { setIsLoading(false); }
    }
    load();
  }, [navigate, user.fullName]);

  /* Escape modal */
  useEffect(() => {
    if (!showCreate) return;
    const onKey = (e) => { if (e.key === "Escape") setShowCreate(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [showCreate]);

  async function handleCreate(e) {
    e.preventDefault();
    const name = companyName.trim();
    if (!name) { setError("Please enter a name."); return; }
    setIsCreating(true); setError("");
    try {
      const created = await createCompany(name);
      setCompanies((prev) => [
        { companyId: created.id, companyName: created.name, companyType: created.type, role: "OWNER" },
        ...prev,
      ]);
      setCompanyName(""); setShowCreate(false);
    } catch (e) { setError(e.message || "Failed."); }
    finally { setIsCreating(false); }
  }

  const sideNavLinks = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Building2,       label: "Companies",  to: "/companies" },
    { icon: Wallet,          label: "Budget",     to: "/companies" },
    { icon: BarChart2,       label: "Expenses",   to: "/companies" },
  ];

  const ownedCount  = companies.filter((c) => c.role === "OWNER").length;
  const memberCount = companies.filter((c) => c.role !== "OWNER").length;

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
        <div className={styles.topBar}>
          <button type="button" className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className={styles.topBarLeft}>
            <p className={styles.greetingLabel}>Companies</p>
            <h1 className={styles.greetingTitle}>Your <span className={styles.userName}>Organizations</span></h1>
          </div>
          <button type="button" className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={15} /> New Company
          </button>
        </div>

        {/* Stat Cards */}
        <div className={styles.statsRow}>
          <StatCard icon={Building2}  label="Total Companies" value={isLoading ? "–" : companies.length} colorClass="cardBlue"   badge={companies.length > 0 ? "Active" : undefined} />
          <StatCard icon={TrendingUp} label="Owned"           value={isLoading ? "–" : ownedCount}       colorClass="cardGreen" />
          <StatCard icon={Clock}      label="Member of"       value={isLoading ? "–" : memberCount}      colorClass="cardPurple" />
        </div>

        {/* Companies Panel */}
        <div className={styles.contentGrid}>
          <motion.div className={styles.panel}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>All Companies</h2>
                <p className={styles.panelSub}>
                  {isLoading ? "Loading…" : `${companies.length} organization${companies.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            {isLoading ? (
              <div className={styles.skeletonList}>
                {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : companies.length === 0 ? (
              <div className={styles.emptyState}>
                <Building2 size={38} className={styles.emptyIcon} />
                <p>No companies yet.</p>
                <button type="button" className={styles.createBtn} onClick={() => setShowCreate(true)}>
                  <Plus size={13} /> Create your first
                </button>
              </div>
            ) : (
              <div className={styles.companyList}>
                {companies.map((c) => (
                  <CompanyTile key={c.companyId} company={c}
                    onClick={() => navigate(`/company/${c.companyId}`, { state: { companyName: c.companyName } })} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* ═══ CREATE MODAL ═══ */}
      {showCreate && createPortal(
        <AnimatePresence>
          <motion.div className={styles.overlay} onClick={() => setShowCreate(false)} role="presentation"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modal} onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}>
              <div className={styles.modalHeader}>
                <h3>Create Company</h3>
                <button type="button" className={styles.modalClose} onClick={() => setShowCreate(false)}>
                  <X size={18} />
                </button>
              </div>
              <form className={styles.modalForm} onSubmit={handleCreate}>
                <label className={styles.modalField}>
                  <span>Company Name</span>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp" autoFocus required />
                </label>
                {error && <p className={styles.errorText}>{error}</p>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className={styles.confirmBtn} disabled={isCreating}>
                    {isCreating ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
