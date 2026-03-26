import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Building2, TrendingUp, Bell, AlertTriangle,
  Sparkles, X, LayoutDashboard, PieChart,
  Wallet, BarChart2, Settings, Menu, ChevronRight, ArrowUpRight,
  Star, CreditCard, BookOpen
} from "lucide-react";
import { getMyPersonalCompany } from "../api/companies";
import { getUserById } from "../api/users";
import { getActiveBudget } from "../api/budgets";
import { getCompanyExpenses, getExpenseChart } from "../api/expenses";
import styles from "./DashboardPage.module.css";

// Helper components & functions defined at the top
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

function ExpenseChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <PieChart size={38} className={styles.emptyIcon} />
        <p>No expenses in the last 30 days.</p>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.totalAmount));

  return (
    <div className={styles.chartContainer}>
      {data.map((item, idx) => {
        const heightPct = (item.totalAmount / maxAmount) * 100;
        return (
          <div key={item.categoryName} className={styles.chartBarWrapper}>
            <div className={styles.chartValue}>${item.totalAmount.toFixed(0)}</div>
            <motion.div 
              className={styles.chartBar}
              initial={{ height: 0 }}
              animate={{ height: `${heightPct}%` }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
              style={{ backgroundColor: `hsl(${idx * 40 + 200}, 70%, 60%)` }}
            />
            <div className={styles.chartLabel}>{item.categoryName}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data States
  const [personalCompany, setPersonalCompany] = useState(null);
  const [activeBudgets, setActiveBudgets] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [chartData, setChartData] = useState([]);

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

  /* Auth + data fetches */
  useEffect(() => {
    const token = localStorage.getItem("artha_jwt");
    const userId = localStorage.getItem("artha_user_id");
    if (!token || !userId) { navigate("/auth", { replace: true }); return; }
    
    async function load() {
      setIsLoading(true);
      try {
        const [personalCo, profile] = await Promise.all([
          getMyPersonalCompany().catch(() => null),
          user.fullName ? Promise.resolve(null) : getUserById(userId).catch(() => null),
        ]);
        
        if (personalCo) {
          setPersonalCompany(personalCo);
          const cid = personalCo.companyId || personalCo.id;
          
          const [budgetsRes, expensesRes, chartRes] = await Promise.all([
            getActiveBudget(cid).catch(() => []),
            getCompanyExpenses(cid).catch(() => []),
            getExpenseChart(cid, 30).catch(() => []),
          ]);
          
          setActiveBudgets(Array.isArray(budgetsRes) ? budgetsRes : []);
          const sortedExps = Array.isArray(expensesRes) 
            ? expensesRes.sort((a,b) => new Date(b.spentDate || b.date) - new Date(a.spentDate || a.date)) 
            : [];
          setRecentExpenses(sortedExps);
          setChartData(Array.isArray(chartRes) ? chartRes : []);
        }

        if (profile?.fullName) {
          setUserName(profile.fullName);
          try {
            const cur = JSON.parse(localStorage.getItem("artha_user") || "{}");
            localStorage.setItem("artha_user", JSON.stringify({ ...cur, fullName: profile.fullName }));
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error("Dashboard block fail", err);
      } finally {
        setIsLoading(false);
      }
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

  const totalBudgetAmount = activeBudgets.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalSpent30Days = chartData.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalExpensesCount = recentExpenses.length;

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
          {personalCompany && (
            <button
               className={styles.createBtn}
               onClick={() => navigate(`/company/${personalCompany.companyId || personalCompany.id}`)}
               title="Open your Personal Company Dashboard"
            >
               <ArrowUpRight size={18} /> Personal Space
            </button>
          )}
        </div>

        {/* ── STAT CARDS ── */}
        <div className={styles.statsRow}>
          <StatCard icon={Wallet}     label="Personal Budget"     value={isLoading ? "–" : `$${totalBudgetAmount.toFixed(0)}`} colorClass="cardBlue"   badge={activeBudgets.length > 0 ? "Active" : undefined} />
          <StatCard icon={TrendingUp} label="Spent (30 Days)"     value={isLoading ? "–" : `$${totalSpent30Days.toFixed(0)}`}  colorClass="cardAmber" />
          <StatCard icon={BarChart2}  label="Total Transactions"  value={isLoading ? "–" : totalExpensesCount}                  colorClass="cardGreen" />
          <StatCard icon={Bell}       label="Alerts"              value="0"                                                     colorClass="cardPurple"  badge="All Clear" />
        </div>

        {/* ── CONTENT GRID ── */}
        <div className={styles.contentGrid}>
          {/* Main Chart Panel */}
          <motion.div className={styles.panel}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Expenses by Category</h2>
                <p className={styles.panelSub}>Last 30 days overview</p>
              </div>
            </div>
            {isLoading ? (
              <div className={styles.skeletonList}>
                <div className={styles.skeleton} style={{height: "200px"}} />
              </div>
            ) : (
              <ExpenseChart data={chartData} />
            )}
          </motion.div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            {/* Recent Expenses List */}
            <motion.div className={styles.panel}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className={styles.panelHeader} style={{ marginBottom: "0.5rem" }}>
                <h2 className={styles.panelTitle}>Recent Expenses</h2>
              </div>
              <div className={styles.companyList}>
                {isLoading ? (
                  [1,2,3].map(i => <div key={i} className={styles.skeleton} style={{height: "40px"}}/>)
                ) : recentExpenses.length === 0 ? (
                  <p className={styles.panelSub}>No recent expenses.</p>
                ) : (
                  recentExpenses.slice(0, 4).map((exp) => (
                    <div key={exp.id} className={styles.overviewItem} style={{ padding: "0.5rem 0" }}>
                      <span className={styles.overviewDot} style={{ background: "#3b82f6" }} />
                      <div style={{ flex: 1 }}>
                        <p className={styles.overviewLabel} style={{ color: "#0f172a", fontWeight: "600" }}>{exp.description}</p>
                        <p className={styles.overviewLabel} style={{ fontSize: "0.7rem", marginTop: "-2px" }}>{exp.categoryName}</p>
                      </div>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>${exp.amount.toFixed(0)}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div className={styles.panel}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className={styles.panelTitle}>Quick Actions</h2>
              <div className={styles.quickActions} style={{marginTop: "1rem"}}>
                <button type="button" className={styles.quickBtnOutline} onClick={() => navigate("/companies")}>
                  Manage Budgets <ArrowUpRight size={14}/>
                </button>
                <button type="button" className={styles.quickBtnOutline} onClick={() => navigate("/companies")}>
                  View All Companies <ArrowUpRight size={14}/>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
