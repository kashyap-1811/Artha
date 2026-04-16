import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, TrendingUp, Bell, AlertTriangle,
  Sparkles, X, Plus, ArrowUpRight, ChevronRight, Menu
} from "lucide-react";
import { getMyCompanies, createCompany } from "../api/companies";
import { getUserById } from "../api/users";
import AppSidebar from "../components/AppSidebar";
import styles from "./DashboardPage.module.css";
import companyStyles from "./CompaniesPage.module.css";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDateString() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

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

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("artha_user") || "{}"); }
    catch { return {}; }
  }, []);
  const [userName, setUserName] = useState(user.fullName || "");

  const loadData = async () => {
    const userId = localStorage.getItem("artha_user_id");
    try {
      const [companyData, profile] = await Promise.all([
        getMyCompanies(),
        user.fullName ? Promise.resolve(null) : getUserById(userId).catch(() => null),
      ]);
      setCompanies(Array.isArray(companyData) ? companyData : []);
      if (profile?.fullName) {
        setUserName(profile.fullName);
        const cur = JSON.parse(localStorage.getItem("artha_user") || "{}");
        localStorage.setItem("artha_user", JSON.stringify({ ...cur, fullName: profile.fullName }));
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) { navigate("/auth", { replace: true }); return; }
    loadData();
  }, [navigate]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setIsCreating(true);
    try {
      await createCompany(newCompanyName);
      setNewCompanyName("");
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to create company");
    } finally {
      setIsCreating(false);
    }
  };

  const ownedCount  = companies.filter((c) => c.role === "OWNER").length;
  const memberCount = companies.filter((c) => c.role !== "OWNER").length;

  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      <div className={companyStyles.pageContainer}>
        {/* ── HEADER ── */}
        <div className={companyStyles.headerRow}>
          <button type="button" className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className={companyStyles.titleArea}>

            <p className={styles.greetingLabel}>{getDateString()}</p>
            <h1 className={styles.greetingTitle}>
              {getGreeting()}, <span className={styles.userName}>{userName || "there"}</span>
              <Sparkles size={20} className={styles.sparkle} />
            </h1>
          </div>
          <button 
            type="button" 
            className={companyStyles.addBtn}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={20} />
            New Company
          </button>
        </div>

        {/* ── STATS ── */}
        <div className={styles.statsRow}>
          <StatCard icon={Building2}  label="Total Companies" value={isLoading ? "–" : companies.length} colorClass="cardBlue" badge={companies.length > 0 ? "Active" : undefined} />
          <StatCard icon={TrendingUp} label="Owned"           value={isLoading ? "–" : ownedCount}       colorClass="cardGreen" />
          <StatCard icon={Bell}       label="Alerts"          value="0"                                   colorClass="cardAmber"  badge="All Clear" />
          <StatCard icon={AlertTriangle} label="Member of"   value={isLoading ? "–" : memberCount}       colorClass="cardPurple" />
        </div>

        {/* ── COMPANY LIST ── */}
        <div className={styles.contentGrid} style={{ gridTemplateColumns: "1fr" }}>
          <motion.div className={styles.panel}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Your Organizations</h2>
                <p className={styles.panelSub}>Manage and switch between your companies</p>
              </div>
            </div>

            {isLoading ? (
              <div className={styles.skeletonList}>
                {[1, 2, 3, 4].map((i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : companies.length === 0 ? (
              <div className={companyStyles.emptyStateLarge}>
                <Building2 size={64} className={companyStyles.emptyIconLarge} strokeWidth={1.5} />
                <h3 className={companyStyles.emptyTitleLarge}>No companies found</h3>
                <p className={companyStyles.emptyTextLarge}>
                  You haven't created or joined any companies yet. Create your first one to start tracking budgets.
                </p>
                <button 
                  type="button" 
                  className={companyStyles.addBtn}
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus size={20} />
                  Create My First Company
                </button>
              </div>
            ) : (
              <div className={styles.companyList}>
                {companies.map((c) => {
                  const initials = c.companyName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <motion.button key={c.companyId} className={styles.companyTile} type="button"
                      whileHover={{ x: 6, backgroundColor: "rgba(248, 250, 252, 1)" }} 
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      onClick={() => navigate(`/company/${c.companyId}`, { state: { companyName: c.companyName } })}>
                      <div className={styles.tileAvatar} style={{ 
                        background: c.role === "OWNER" ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "linear-gradient(135deg, #94a3b8, #64748b)"
                      }}>{initials}</div>
                      <div className={styles.tileInfo}>
                        <strong style={{ fontSize: "1.05rem" }}>{c.companyName}</strong>
                        <span>{c.companyType || "Business Organization"}</span>
                      </div>
                      <div className={`${styles.tileRole} ${c.role === "OWNER" ? styles.roleOwner : ""}`}>
                        {c.role}
                      </div>
                      <div className={styles.tileArrowWrap}>
                        <ArrowUpRight size={18} className={styles.tileArrow} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── CREATE MODAL ── */}
        <AnimatePresence>
          {isModalOpen && (
            <div className={companyStyles.modalOverlay}>
              <motion.div 
                className={companyStyles.modalContent}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
              >
                <div className={companyStyles.modalHeader}>
                  <h2 className={companyStyles.modalTitle}>Create New Company</h2>
                  <p className={companyStyles.modalSub}>Enter a name for your organization</p>
                </div>

                <form onSubmit={handleCreateCompany}>
                  <div className={companyStyles.inputGroup}>
                    <label className={companyStyles.inputLabel}>Company Name</label>
                    <input 
                      autoFocus
                      className={companyStyles.inputField}
                      placeholder="e.g. Acme Corp"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>

                  <div className={companyStyles.modalActions}>
                    <button 
                      type="button" 
                      className={companyStyles.cancelBtn}
                      onClick={() => setIsModalOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className={companyStyles.submitBtn}
                      disabled={isCreating || !newCompanyName.trim()}
                    >
                      {isCreating ? (
                        <>
                          <div className={companyStyles.spinner} />
                          Creating...
                        </>
                      ) : (
                        "Create Company"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppSidebar>
  );
}
