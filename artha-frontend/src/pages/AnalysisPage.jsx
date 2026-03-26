import { useEffect, useState } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Activity, PieChart as PieChartIcon, TrendingUp, DollarSign, Wallet, Star, CreditCard, BookOpen, LayoutDashboard, Building2, Menu, X, Settings
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend
} from "recharts";
import {
  getCompanyHealth, getCompanyCategoryBreakdown, getCompanySpendingTrend,
  getBudgetAnalysis, getBudgetTopSpenders
} from "../api/analysis";
import styles from "./DashboardPage.module.css";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

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

export default function AnalysisPage() {
  const { companyId, budgetId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Company Data
  const [healthData, setHealthData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);

  // Budget Data
  const [budgetData, setBudgetData] = useState(null);
  const [topSpenders, setTopSpenders] = useState([]);

  const isBudgetLevel = !!budgetId;

  useEffect(() => {
    async function fetchInsights() {
      setIsLoading(true);
      setError("");
      try {
        if (isBudgetLevel) {
          const [bAnalysis, bSpenders] = await Promise.all([
            getBudgetAnalysis(budgetId),
            getBudgetTopSpenders(budgetId)
          ]);
          setBudgetData(bAnalysis);
          setTopSpenders(bSpenders.top_spenders || []);
        } else {
          const [cHealth, cCategories, cTrend] = await Promise.all([
            getCompanyHealth(companyId),
            getCompanyCategoryBreakdown(companyId),
            getCompanySpendingTrend(companyId)
          ]);
          setHealthData(cHealth);
          setCategoryData(cCategories.breakdown || []);
          
          // Reverse trend so oldest is first
          const revTrend = [...(cTrend.trend_data || [])].reverse();
          setTrendData(revTrend);
        }
      } catch (err) {
        setError(err.message || "Failed to load analytics.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsights();
  }, [companyId, budgetId, isBudgetLevel]);

  function formatMoney(val) {
    if (val === undefined || val === null) return "$0";
    return "$" + Number(val).toLocaleString();
  }
  
  const handleBack = () => {
    if (isBudgetLevel) navigate(`/company/${companyId}/budget/${budgetId}`);
    else navigate(`/company/${companyId}`);
  };

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
        
        {/* TOP BAR */}
        <div className={styles.topBar}>
          <button type="button" className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className={styles.topBarLeft} style={{ display: 'flex', alignItems: 'center' }}>
             <button onClick={handleBack} className={styles.iconButton} style={{ marginBottom: "1rem", float: "left", marginRight: "1rem" }}>
               <ArrowLeft size={20} />
             </button>
             <h1 className={styles.greetingTitle} style={{marginTop: "0.5rem"}}>
               {isBudgetLevel ? "Budget Insights" : "Company Health & Insights"}
             </h1>
          </div>
        </div>

        {error && (
          <div className={styles.errorAlert} style={{ marginBottom: "2rem" }}>{error}</div>
        )}

        {isLoading ? (
           <div className={styles.emptyState}>
             <Activity size={40} className={styles.emptyIcon} style={{ animation: "pulse 1.5s infinite" }} />
             <p>Generating deep analytics...</p>
           </div>
        ) : (
          <>
            {/* ── COMPANY LEVEL VIEW ── */}
            {!isBudgetLevel && healthData && (
              <>
                <div className={styles.statsRow}>
                  <StatCard icon={Wallet} label="Total Budgeted" value={formatMoney(healthData.total_budget)} colorClass="cardBlue" />
                  <StatCard icon={TrendingUp} label="Total Spent" value={formatMoney(healthData.total_expense)} colorClass="cardAmber" />
                  <StatCard icon={DollarSign} label="Remaining" value={formatMoney(healthData.remaining)} colorClass="cardGreen" />
                  <StatCard icon={Activity} label="Health Score" value={healthData.health_score || "Unknown"} colorClass="cardPurple" badge={healthData.health_score === "On Track" ? "Good" : "Warning"} />
                </div>

                <div className={styles.contentGrid} style={{ marginTop: "2rem" }}>
                  
                  {/* Category Pie */}
                  <div className={styles.panel} style={{ gridColumn: "span 1" }}>
                    <div className={styles.chartHeader}>
                      <h2 className={styles.chartTitle}>Categorical Burn</h2>
                    </div>
                    {categoryData.length === 0 ? (
                       <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>No category details recorded yet.</p>
                    ) : (
                      <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
                        <div style={{ flex: "1 1 300px", height: 320 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={categoryData} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val) => formatMoney(val)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ flex: "1 1 300px" }}>
                          <h4 style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Detailed Breakdown</h4>
                          <table style={{ width: "100%", fontSize: "0.9rem", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--edge)", textAlign: "left", color: "var(--text-muted)" }}>
                                <th style={{ padding: "0.5rem" }}>Category</th>
                                <th style={{ padding: "0.5rem", textAlign: "right" }}>Amount</th>
                                <th style={{ padding: "0.5rem", textAlign: "right" }}>%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryData.map((c, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--edge)" }}>
                                  <td style={{ padding: "0.5rem", fontWeight: "600", color: "var(--text-main)" }}>{c.category}</td>
                                  <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatMoney(c.amount)}</td>
                                  <td style={{ padding: "0.5rem", textAlign: "right", color: "var(--accent)" }}>{c.percentage.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trend Area Chart */}
                  <div className={styles.panel} style={{ gridColumn: "span 2" }}>
                    <div className={styles.chartHeader}>
                      <h2 className={styles.chartTitle}>6-Month Spending Trajectory</h2>
                    </div>
                    {trendData.length === 0 ? (
                       <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>No trend details recorded yet.</p>
                    ) : (
                      <div style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap", width: "100%" }}>
                        <div style={{ flex: "1 1 300px", height: 320 }}>
                          <ResponsiveContainer>
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="month" stroke="#94a3b8" />
                              <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val}`} />
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <Tooltip formatter={(val) => formatMoney(val)} />
                              <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSpend)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ flex: "1 1 300px" }}>
                          <h4 style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Monthly Digest</h4>
                          <table style={{ width: "100%", fontSize: "0.9rem", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--edge)", textAlign: "left", color: "var(--text-muted)" }}>
                                <th style={{ padding: "0.5rem" }}>Period</th>
                                <th style={{ padding: "0.5rem", textAlign: "right" }}>Spend Equivalent</th>
                                <th style={{ padding: "0.5rem", textAlign: "right" }}>MoM Impact</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trendData.map((c, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--edge)" }}>
                                  <td style={{ padding: "0.5rem", fontWeight: "600", color: "var(--text-main)" }}>{c.month}</td>
                                  <td style={{ padding: "0.5rem", textAlign: "right" }}>{formatMoney(c.amount)}</td>
                                  <td style={{ padding: "0.5rem", textAlign: "right", color: c.growth_percentage > 0 ? "var(--danger)" : "var(--accent)" }}>
                                    {c.growth_percentage > 0 ? "+" : ""}{c.growth_percentage}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}

            {/* ── BUDGET LEVEL VIEW ── */}
            {isBudgetLevel && budgetData && (
              <>
                <div className={styles.statsRow}>
                  <StatCard icon={Wallet} label="Budgeted Limit" value={formatMoney(budgetData.total_amount)} colorClass="cardBlue" />
                  <StatCard icon={TrendingUp} label="Actual Burned" value={formatMoney(budgetData.total_spent)} colorClass="cardAmber" />
                  <StatCard icon={DollarSign} label="Safety Margin" value={formatMoney(budgetData.remaining)} colorClass={budgetData.remaining < 0 ? "cardRed" : "cardGreen"} />
                </div>

                <div className={styles.contentGrid} style={{ marginTop: "2rem" }}>
                  
                  {/* Budget Category Progress */}
                  <div className={styles.panel} style={{ gridColumn: "span 2" }}>
                    <div className={styles.chartHeader}>
                      <h2 className={styles.chartTitle}>Allocation Performance vs Capacity</h2>
                    </div>
                    {(!budgetData.category_breakdown || budgetData.category_breakdown.length === 0) ? (
                       <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>No categorical utilization.</p>
                    ) : (
                      <>
                        <div style={{ width: '100%', height: 350 }}>
                          <ResponsiveContainer>
                            <BarChart data={budgetData.category_breakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" stroke="#94a3b8" />
                              <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val}`} />
                              <Tooltip formatter={(val) => formatMoney(val)} cursor={{ fill: 'transparent' }} />
                              <Legend />
                              <Bar dataKey="allocated" name="Assigned Capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="spent" name="Consumed Value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--edge)", paddingTop: "1rem" }}>
                          <h4 style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Categorical Log</h4>
                          <table style={{ width: "100%", fontSize: "0.9rem", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--edge)", textAlign: "left", color: "var(--text-muted)" }}>
                                <th style={{ padding: "0.5rem" }}>Category Layer</th>
                                <th style={{ padding: "0.5rem", textAlign: "right" }}>Limit Capacity</th>
                                <th style={{ padding: "0.5rem", textAlign: "right" }}>Consumed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {budgetData.category_breakdown.map((c, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--edge)" }}>
                                  <td style={{ padding: "0.5rem", fontWeight: "600", color: "var(--text-main)" }}>{c.name}</td>
                                  <td style={{ padding: "0.5rem", textAlign: "right", color: "var(--text-muted)" }}>{formatMoney(c.allocated)}</td>
                                  <td style={{ padding: "0.5rem", textAlign: "right", color: c.spent > c.allocated ? "var(--danger)" : "var(--accent)" }}>
                                    {formatMoney(c.spent)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Top Spenders */}
                  <div className={styles.chartPanel} style={{ gridColumn: "span 1" }}>
                    <div className={styles.chartHeader}>
                      <h2 className={styles.chartTitle}>Top Velocity Spenders</h2>
                    </div>
                    {topSpenders.length === 0 ? (
                       <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>No spenders found.</p>
                    ) : (
                       <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                         {topSpenders.slice(0, 5).map((u, i) => (
                           <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "var(--surface-soft)", borderRadius: "12px", border: "1px solid var(--edge)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <div style={{ fontWeight: "800", color: "var(--text-muted)", fontSize: "1.2rem", width: "24px" }}>#{i+1}</div>
                                <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{u.allocation_name}</div>
                              </div>
                              <div style={{ fontWeight: "700", color: "var(--danger)" }}>{formatMoney(u.amount_spent)}</div>
                           </li>
                         ))}
                       </ul>
                    )}
                  </div>
                </div>
              </>
            )}

          </>
        )}
      </main>
    </div>
  );
}
