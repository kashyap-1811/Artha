import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Activity, PieChart as PieChartIcon, TrendingUp, DollarSign, Wallet, Star, CreditCard, BookOpen, LayoutDashboard, Building2, Menu, X, Settings, AlertCircle, Clock, CheckCircle2, TrendingDown, AlertTriangle
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
import AppSidebar from "../components/AppSidebar";
import styles from "./DashboardPage.module.css";
import anaStyles from "./AnalysisPage.module.css";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// --- Helper Hook & Component for Animations ---
function useCountUp(end, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof end !== 'number' || isNaN(end) || end === 0) { setCount(end || 0); return; }
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(end * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration]);

  return count;
}

function AnimatedValue({ value, prefix = "", suffix = "", decimals }) {
  const strVal = String(value || 0).replace(/[₹,]/g, '');
  const hasDecimals = strVal.includes('.');
  const detectedDecimals = hasDecimals ? strVal.split('.')[1].length : 0;
  const decimalCount = decimals !== undefined ? decimals : (prefix === '₹' ? 2 : detectedDecimals);
  const numericVal = parseFloat(strVal);

  const animated = useCountUp(isNaN(numericVal) ? 0 : numericVal);

  if (isNaN(numericVal)) return <>{value}</>;

  return (
    <>
      {prefix}
      {animated.toLocaleString(undefined, {
        minimumFractionDigits: decimalCount,
        maximumFractionDigits: decimalCount
      })}
      {suffix}
    </>
  );
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
      <div className={styles.statValue}>
        {typeof value === 'string' && value.includes('₹') ? (
          <AnimatedValue value={value.replace('₹', '')} prefix="₹" />
        ) : (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) ? (
          <AnimatedValue value={value} />
        ) : (
          value
        )}
      </div>
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

  const budgetInsights = useMemo(() => {
    if (!isBudgetLevel || !budgetData?.start_date || !budgetData?.end_date) return null;

    const start = new Date(budgetData.start_date);
    const end = new Date(budgetData.end_date);
    const now = new Date();

    const totalDuration = end - start;
    const elapsed = now - start;
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    // Percentage of time elapsed
    const timePct = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;

    // Percentage of money spent
    const spentVal = budgetData.total_spent || budgetData.total_expense || 0;
    const spendPct = budgetData.total_amount > 0
      ? (spentVal / budgetData.total_amount) * 100
      : 0;

    // Daily Velocity
    const daysElapsed = Math.max(1, Math.floor(elapsed / (1000 * 60 * 60 * 24)));
    const dailyBurn = spentVal / daysElapsed;

    // Efficiency: spendPct vs timePct
    // If spendPct > timePct, we are burning faster than the clock
    const burnVelocity = timePct > 0 ? spendPct / timePct : 0;

    let status = "HEALTHY";
    let advice = "You're spending perfectly within your time index.";

    if (spendPct >= 100) {
      status = "CRITICAL";
      advice = `Critical: You have exceeded your budget by ${formatMoney(spentVal - budgetData.total_amount)}. Immediate action required!`;
    } else if (spendPct >= 90) {
      status = "WARNING";
      advice = "Caution: You've consumed over 90% of your budget. High risk of overspending.";
    } else if (burnVelocity > 1.2) {
      status = "FAST";
      advice = "Caution: You're burning budget 20% faster than the clock. Consider slowing down.";
    } else if (burnVelocity < 0.8) {
      status = "OPTIMAL";
      advice = "Great work! You've built a solid safety margin for the end of the cycle.";
    }

    return { daysLeft, timePct, spendPct, dailyBurn, burnVelocity, status, advice };
  }, [isBudgetLevel, budgetData]);

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
          setTrendData(cTrend.trend_data || []);
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
    if (val === undefined || val === null) return "₹0";
    return "₹" + Number(val).toLocaleString('en-IN');
  }

  const handleBack = () => {
    navigate(-1);
  };

  // Process categories for Pie Chart (Group small ones < 5% to avoid clutter)
  const pieData = (() => {
    if (categoryData.length === 0) return [];
    const threshold = 5; // 5%
    const mainCategories = categoryData.filter(c => c.percentage >= threshold);
    const otherCategories = categoryData.filter(c => c.percentage < threshold);

    if (otherCategories.length === 0) return categoryData;

    const otherAmount = otherCategories.reduce((sum, c) => sum + c.amount, 0);
    const otherPercentage = otherCategories.reduce((sum, c) => sum + c.percentage, 0);

    return [
      ...mainCategories,
      { category: "Other Small Categories", amount: otherAmount, percentage: otherPercentage }
    ];
  })();

  const sideNavLinks = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Building2, label: "Companies", to: "/companies" },
    { icon: Star, label: "Features", to: "/features" },
    { icon: CreditCard, label: "Pricing", to: "/pricing" },
    { icon: BookOpen, label: "Blog", to: "/blog" },
  ];

  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      {/* TOP BAR */}
      {/* TOP BAR / HEADER */}
      <div className={anaStyles.unifiedTopBar}>
        <button onClick={handleBack} className={styles.iconButton}>
          <ArrowLeft size={18} />
        </button>
        <h1 className={anaStyles.headerTitle}>
          {isBudgetLevel ? "Budget Insights" : "Company Health & Insights"}
        </h1>
        {/* The Menu explorer is handled by AppSidebar backdrop, but we provide a unified title line */}
      </div>

      <div className={anaStyles.pageContainer}>

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
                <StatCard icon={Wallet} label="Global Budget" value={formatMoney(healthData.total_budget)} colorClass="cardBlue" />
                <StatCard icon={TrendingUp} label="Total Velocity" value={formatMoney(healthData.total_expense)} colorClass="cardAmber" />
                <StatCard icon={DollarSign} label="Net Liquidity" value={formatMoney(healthData.remaining)} colorClass="cardGreen" />
                <StatCard 
                  icon={Clock} 
                  label="Fin. Runway" 
                  value={`${Number(healthData.estimated_runway_months || 0).toFixed(1)} Months`} 
                  colorClass="cardPurple" 
                  badge={healthData.estimated_runway_months > 3 ? "Healthy" : "Low"} 
                />
              </div>

              <div className={styles.contentGrid} style={{ marginTop: "2rem" }}>

                {/* Budget Portfolio Health */}
                <div className={styles.panel} style={{ gridColumn: "span 2" }}>
                  <div className={styles.chartHeader}>
                    <h2 className={styles.chartTitle}>Portfolio Distribution</h2>
                    <p className={styles.sectionSub}>Health status of {healthData.budget_stats?.total || 0} active budget cycles</p>
                  </div>
                  <div className={anaStyles.horizontalSlider}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={anaStyles.sliderItem}
                      style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '20px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)', flexShrink: 0 }}>
                        <CheckCircle2 size={24} color="#16a34a" />
                      </div>
                      <div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534', lineHeight: 1 }}>{healthData.budget_stats?.on_track || 0}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>On Track</div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4 }}
                      className={anaStyles.sliderItem}
                      style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '20px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.1)', flexShrink: 0 }}>
                        <AlertCircle size={24} color="#d97706" />
                      </div>
                      <div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#92400e', lineHeight: 1 }}>{healthData.budget_stats?.at_risk || 0}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>At Risk</div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4 }}
                      className={anaStyles.sliderItem}
                      style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', borderRadius: '20px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)', flexShrink: 0 }}>
                        <TrendingDown size={24} color="#dc2626" />
                      </div>
                      <div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#991b1b', lineHeight: 1 }}>{healthData.budget_stats?.over_budget || 0}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Overspent</div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Category Pie */}
                <div className={styles.panel} style={{ gridColumn: "span 2", minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
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
                            <Pie
                              data={pieData}
                              dataKey="amount"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              innerRadius={60}
                              paddingAngle={2}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieData.map((entry, index) => (
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
                                <td style={{ padding: "0.5rem", textAlign: "right" }}>
                                  <AnimatedValue value={c.amount} prefix="₹" />
                                </td>
                                <td style={{ padding: "0.5rem", textAlign: "right", color: "var(--accent)" }}>{c.percentage.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Spending Budgets */}
                <div className={styles.panel} style={{ gridColumn: "span 2", minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                  <div className={styles.chartHeader}>
                    <h2 className={styles.chartTitle}>Top Consuming Budgets</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(healthData.top_budgets || []).length === 0 ? (
                      <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No spending data recorded.</p>
                    ) : (
                      healthData.top_budgets.map(b => (
                        <div key={b.budget_id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '0.9rem' }}>{b.name}</strong>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3b82f6' }}>{formatMoney(b.spent_amount)}</span>
                          </div>
                          <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(b.usage_percentage, 100)}%` }}
                              style={{
                                height: '100%',
                                background: b.usage_percentage > 90
                                  ? 'linear-gradient(90deg, #fca5a5, #ef4444)'
                                  : 'linear-gradient(90deg, #93c5fd, #3b82f6)',
                                borderRadius: '5px'
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val}`} />
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
                            {(trendData || []).slice().reverse().map((t, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid var(--edge)" }}>
                                <td style={{ padding: "0.5rem", fontWeight: "600", color: "var(--text-main)" }}>{t.month}</td>
                                <td style={{ padding: "0.5rem", textAlign: "right" }}>
                                  <AnimatedValue value={t.amount} prefix="₹" />
                                </td>
                                <td style={{ padding: "0.5rem", textAlign: "right", color: t.growth_percentage >= 0 ? "var(--accent)" : "#ef4444" }}>
                                  {t.growth_percentage > 0 ? "+" : ""}{t.growth_percentage}%
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
              {/* 1. Executive Summary Narrator */}
              {budgetInsights && (
                <motion.div
                  className={styles.insightBanner}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={`${styles.insightIcon}`} style={{
                    background:
                      budgetInsights.status === 'CRITICAL' ? '#fef2f2' :
                        budgetInsights.status === 'WARNING' ? '#fff7ed' :
                          budgetInsights.status === 'OPTIMAL' ? '#f0fdf4' :
                            (budgetInsights.status === 'FAST' ? '#fffbeb' : '#f8fafc')
                  }}>
                    {budgetInsights.status === 'CRITICAL' ? <AlertCircle color="#dc2626" /> :
                      budgetInsights.status === 'WARNING' ? <AlertTriangle color="#ea580c" /> :
                        budgetInsights.status === 'OPTIMAL' ? <Star color="#16a34a" /> :
                          (budgetInsights.status === 'FAST' ? <AlertTriangle color="#d97706" /> : <Activity color="#3b82f6" />)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={styles.insightTitle}>
                      Budget Health: <span style={{
                        color:
                          budgetInsights.status === 'CRITICAL' ? '#dc2626' :
                            budgetInsights.status === 'WARNING' ? '#ea580c' :
                              budgetInsights.status === 'OPTIMAL' ? '#16a34a' :
                                (budgetInsights.status === 'FAST' ? '#d97706' : '#3b82f6')
                      }}>{budgetInsights.status}</span>
                    </div>
                    <p className={styles.insightText}>{budgetInsights.advice}</p>
                  </div>
                  {budgetInsights.status === 'FAST' && (
                    <div className={styles.velocityBadge} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                      <TrendingUp size={14} /> {((budgetInsights.burnVelocity - 1) * 100).toFixed(0)}% Faster Burn
                    </div>
                  )}
                </motion.div>
              )}

              {/* 2. Velocity HUD Cards */}
              {budgetInsights && (
                <div className={styles.velocityHud}>
                  <div className={styles.velocityCard}>
                    <span className={styles.velocityLabel}>Days Remaining</span>
                    <span className={styles.velocityMain}>
                      <AnimatedValue value={budgetInsights.daysLeft} />
                    </span>
                    <span className={styles.velocitySub}>until cycle ends</span>
                  </div>
                  <div className={styles.velocityCard}>
                    <span className={styles.velocityLabel}>Avg. Daily Burn</span>
                    <span className={styles.velocityMain}>
                      <AnimatedValue value={budgetInsights.dailyBurn} prefix="₹" />
                    </span>
                    <span className={styles.velocitySub}>based on last {Math.round(budgetInsights.timePct)}% of period</span>
                  </div>
                  <div className={styles.velocityCard}>
                    <span className={styles.velocityLabel}>Burn Index</span>
                    <span className={styles.velocityMain} style={{
                      color: budgetInsights.burnVelocity > 1.1 ? '#dc2626' : (budgetInsights.burnVelocity > 0.9 ? '#3b82f6' : '#16a34a')
                    }}>
                      <AnimatedValue value={budgetInsights.burnVelocity.toFixed(2)} suffix="x" />
                    </span>
                    <span className={styles.velocitySub}>Spend vs. Time Elapsed</span>
                  </div>
                </div>
              )}

              <div className={styles.statsRow}>
                <StatCard icon={Wallet} label="Budgeted Limit" value={formatMoney(budgetData.total_amount)} colorClass="cardBlue" />
                <StatCard icon={TrendingUp} label="Actual Burned" value={formatMoney(budgetData.total_spent)} colorClass="cardAmber" />
                <StatCard icon={DollarSign} label="Safety Margin" value={formatMoney(budgetData.remaining)} colorClass={budgetData.remaining < 0 ? "cardRed" : "cardGreen"} />
              </div>

              <div className={styles.contentGrid} style={{ marginTop: "2rem" }}>

                {/* Budget Category Progress */}
                <div className={styles.panel} style={{ gridColumn: "span 2", minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
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
                            <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val}`} />
                            <Tooltip formatter={(val) => formatMoney(val)} cursor={{ fill: 'transparent' }} />
                            <Legend />
                            <Bar dataKey="allocated" name="Assigned Capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="spent" name="Consumed Value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className={styles.mirrorTrackContainer}>
                        {budgetData.category_breakdown.map((c, i) => {
                          const pct = c.allocated > 0 ? Math.min(100, (c.spent / c.allocated) * 100) : 0;
                          const isOver = c.spent > c.allocated;
                          return (
                            <div key={i} className={styles.mirrorRow}>
                              <div className={styles.mirrorLabelRow}>
                                <span className={styles.mirrorLabel}>{c.name}</span>
                                <span className={styles.mirrorValue}>
                                  <span style={{ color: isOver ? '#ef4444' : '#0f172a' }}>{formatMoney(c.spent)}</span>
                                  <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                                  <span>{formatMoney(c.allocated)}</span>
                                </span>
                              </div>
                              <div className={styles.mirrorTrackBase}>
                                <motion.div
                                  className={styles.mirrorFill}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  style={{
                                    background: isOver ? 'linear-gradient(90deg, #ef4444, #b91c1c)' : 'linear-gradient(90deg, #3b82f6, #2563eb)'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Top Categories Leaderboard */}
                <div className={styles.panel} style={{ gridColumn: "span 2", minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                  <div className={styles.chartHeader}>
                    <h2 className={styles.chartTitle}>Consumption Leaderboard</h2>
                    <p className={styles.sectionSub}>Categories ranked by absolute burn</p>
                  </div>
                  {topSpenders.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>No consumption data found.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: '1.5rem' }}>
                      {topSpenders.slice(0, 8).map((u, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ x: 4 }}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "white", borderRadius: "16px", border: "1px solid #f1f5f9" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%', background: i < 3 ? '#3b82f615' : '#f8fafc',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, color: i < 3 ? '#3b82f6' : '#94a3b8'
                            }}>
                              {i + 1}
                            </div>
                            <div style={{ fontWeight: "700", color: "#334155", fontSize: '0.9rem' }}>{u.allocation_name}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ fontWeight: "800", color: "#0f172a", fontSize: '0.95rem' }}>
                              <AnimatedValue value={u.amount_spent} prefix="₹" />
                            </div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Total Spent</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </>
      )}
      </div>
    </AppSidebar>
  );
}
