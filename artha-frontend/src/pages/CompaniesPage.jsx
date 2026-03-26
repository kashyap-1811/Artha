import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Building2, TrendingUp, Bell, AlertTriangle,
  Sparkles, X, LayoutDashboard,
  Wallet, BarChart2, Settings, Menu, ChevronRight, ArrowUpRight,
  Star, CreditCard, BookOpen
} from "lucide-react";
import { getMyCompanies } from "../api/companies";
import { getUserById } from "../api/users";
import styles from "./DashboardPage.module.css";

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("artha_user") || "{}"); }
    catch { return {}; }
  }, []);
  const [userName, setUserName] = useState(user.fullName || "");

  /* Confetti */
  useEffect(() => {
    if (!location.state?.justLoggedIn) return;
    const duration = 3000, end = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    const rand = (a, b) => Math.random() * (b - a) + a;
    const iv = setInterval(() => {
      const left = end - Date.now();
      if (left <= 0) return clearInterval(iv);
      const count = 50 * (left / duration);
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.1, 0.3), y: -0.2 } });
      confetti({ ...defaults, particleCount: count, origin: { x: rand(0.7, 0.9), y: -0.2 } });
    }, 250);
    window.history.replaceState({}, document.title);
  }, [location.state]);

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
          setUserName(profile.fullName);
          try {
            const cur = JSON.parse(localStorage.getItem("artha_user") || "{}");
            localStorage.setItem("artha_user", JSON.stringify({ ...cur, fullName: profile.fullName }));
          } catch { /* ignore */ }
        }
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    }
    load();
  }, [navigate, user.fullName]);

  const sideNavLinks = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Building2,       label: "Companies",  to: "/companies" },
      { icon: Star, label: "Features", to: "/" },
    { icon: CreditCard, label: "Pricing", to: "/pricing" },
    { icon: BookOpen, label: "Blog", to: "/blog" },
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
        {/* Top bar */}
        <div className={styles.topBar}>
          <button type="button" className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className={styles.topBarLeft}>
            <p className={styles.greetingLabel}>{getDateString()}</p>
            <h1 className={styles.greetingTitle}>
              {getGreeting()}, <span className={styles.userName}>{userName || "there"}</span>
              <Sparkles size={20} className={styles.sparkle} />
            </h1>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className={styles.statsRow}>
          <StatCard icon={Building2}  label="Total Companies" value={isLoading ? "–" : companies.length} colorClass="cardBlue"   badge={companies.length > 0 ? "Active" : undefined} />
          <StatCard icon={TrendingUp} label="Owned"           value={isLoading ? "–" : ownedCount}       colorClass="cardGreen" />
          <StatCard icon={Bell}       label="Alerts"          value="0"                                   colorClass="cardAmber"  badge="All Clear" />
          <StatCard icon={AlertTriangle} label="Member of"   value={isLoading ? "–" : memberCount}       colorClass="cardPurple" />
        </div>

        {/* ── CONTENT GRID ── */}
        <div className={styles.contentGrid}>
          {/* Recent Companies Panel */}
          <motion.div className={styles.panel}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Recent Companies</h2>
                <p className={styles.panelSub}>Quick access to your organizations</p>
              </div>
              <button type="button" className={styles.viewAllBtn} onClick={() => navigate("/companies")}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            {isLoading ? (
              <div className={styles.skeletonList}>
                {[1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
              </div>
            ) : companies.length === 0 ? (
              <div className={styles.emptyState}>
                <Building2 size={38} className={styles.emptyIcon} />
                <p>No companies yet. <button type="button" className={styles.inlineLink} onClick={() => navigate("/companies")}>Create one →</button></p>
              </div>
            ) : (
              <div className={styles.companyList}>
                {companies.slice(0, 5).map((c) => {
                  const initials = c.companyName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <motion.button key={c.companyId} className={styles.companyTile} type="button"
                      whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      onClick={() => navigate(`/company/${c.companyId}`, { state: { companyName: c.companyName } })}>
                      <div className={styles.tileAvatar}>{initials}</div>
                      <div className={styles.tileInfo}>
                        <strong>{c.companyName}</strong>
                        <span>{c.companyType || "Organization"}</span>
                      </div>
                      <div className={`${styles.tileRole} ${c.role === "OWNER" ? styles.roleOwner : ""}`}>{c.role}</div>
                      <ArrowUpRight size={15} className={styles.tileArrow} />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            {/* Alerts */}
            <motion.div className={styles.panel}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className={styles.panelTitle}>Alerts</h2>
              <div className={styles.alertItem}>
                <AlertTriangle size={15} className={styles.alertIcon} />
                <p className={styles.alertText}>All systems healthy. No pending alerts!</p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
