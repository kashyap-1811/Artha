import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Building2, TrendingUp, Bell, AlertTriangle,
  Sparkles, X, LayoutDashboard, PieChart,
  Wallet, BarChart2, Settings, Menu, ChevronRight, ArrowUpRight,
  Star, CreditCard, BookOpen, ArrowUp, ArrowDown, ExternalLink
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area,
  LineChart, Line, PieChart as RePieChart, Pie
} from "recharts";
import AppSidebar from "../components/AppSidebar";
import { getMyPersonalCompany } from "../api/companies";
import FloatingActionButton from "../components/FloatingActionButton";
import StatCard from "../components/StatCard";

import { getUserById } from "../api/users";
import { getActiveBudget } from "../api/budgets";
import { getCompanyExpenses, getExpenseChart, getDailyExpenseTrend } from "../api/expenses";
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

// ── Budget Progress Ring ──
function BudgetRing({ spent, total, isLoading: loading }) {
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const animatedPct = useCountUp(loading ? 0 : pct, 1400);
  
  const formatMoney = (val) => {
    if (val === undefined || val === null) return "₹0";
    return "₹" + Number(val).toLocaleString('en-IN');
  };
  const getStatus = (p) => {
    if (p < 60) return 'On Track';
    if (p < 80) return 'Careful';
    return 'Over Budget';
  };

  const color = getColor(pct);
  const status = getStatus(pct);
  const radius = 52;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animatedPct / 100) * circumference;

  return (
    <motion.div
      className={`${styles.statCard} ${styles.cardBlue} ${styles.ringCard}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
    >
      <div className={styles.statCardGlass} />
      <svg className={styles.cardWave} viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,30 C40,10 80,50 120,30 C160,10 180,40 200,25 L200,60 L0,60 Z" />
      </svg>
      <div className={styles.ringContent}>
        <div className={styles.ringWrap}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.ringPct}>{loading ? '–' : `${Math.round(pct)}%`}</span>
            <span className={styles.ringUsed}>used</span>
          </div>
        </div>
        <div className={styles.ringInfo}>
          <p className={styles.statLabel}>BUDGET HEALTH</p>
          <p className={styles.ringSpent}>{formatMoney(loading ? 0 : spent)}</p>
          <p className={styles.ringTotal}>of {formatMoney(loading ? 0 : total)}</p>
          <span className={styles.ringStatus} style={{ background: `${color}18`, color }}>{status}</span>
        </div>
      </div>
    </motion.div>
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

  const DONUT_COLORS = [
    "#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", 
    "#8b5cf6", "#ec4899", "#f43f5e", "#14b8a6", "#3b82f6"
  ];

  // Merge duplicate category names
  const merged = data.reduce((acc, item) => {
    const name = (item.categoryName || 'Other').trim();
    const existing = acc.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.value += Number(item.totalAmount) || 0;
    } else {
      acc.push({ name, value: Number(item.totalAmount) || 0 });
    }
    return acc;
  }, []);

  const total = merged.reduce((s, d) => s + d.value, 0);

  const DonutTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const pct = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className={styles.chartTooltip}>
          <p className={styles.tooltipLabel}>{payload[0].name}</p>
          <p className={styles.tooltipValue}>₹{payload[0].value.toLocaleString('en-IN')}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{pct}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer for outside labels — only show for slices > 5%
  const renderOutsideLabel = ({ name, value, cx, cy, midAngle, outerRadius }) => {
    const pct = (value / total) * 100;
    if (pct < 5) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" fontSize={12} fontWeight={600}>
        {pct.toFixed(0)}%
      </text>
    );
  };

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.donutContainer}>
        {/* Donut Chart */}
        <div className={styles.donutChartWrap}>
          <ResponsiveContainer width="100%" height={260}>
            <RePieChart>
              <Pie
                data={merged}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={1000}
                label={renderOutsideLabel}
                labelLine={false}
              >
                {merged.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
            </RePieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className={styles.donutCenter}>
            <span className={styles.donutCenterAmount}>₹{total.toLocaleString('en-IN')}</span>
            <span className={styles.donutCenterLabel}>Total Spent</span>
          </div>
        </div>

        {/* Legend */}
        <div className={styles.donutLegend}>
          {merged.map((item, i) => (
            <div key={item.name} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className={styles.legendName}>{item.name}</span>
              <span className={styles.legendValue}>₹{item.value.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Data States
  const [personalCompany, setPersonalCompany] = useState(null);
  const [activeBudgets, setActiveBudgets] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [dailyTrendData, setDailyTrendData] = useState([]);
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
          
          // Fetch Daily Trend
          const trendData = await getDailyExpenseTrend(cid);
          
          // Fill in missing days for current month (1 to today)
          const today = new Date();
          const currentYear = today.getFullYear();
          const currentMonth = today.getMonth();
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          
          const filledData = [];
          for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const existing = trendData.find(d => d.date === dateStr);
            filledData.push({
              day: i,
              amount: existing ? existing.amount : 0
            });
          }
          setDailyTrendData(filledData);
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



  const totalBudgetAmount = activeBudgets.reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  const totalSpent30Days = chartData.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalExpensesCount = recentExpenses.filter(e => {
    const d = new Date(e.spentDate || e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  const calculateTrends = () => {
    if (!recentExpenses || recentExpenses.length === 0) return { spentTrend: 0, transactionTrend: 0 };
    
    const now = new Date();
    const p1Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const p2Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const period1 = recentExpenses.filter(e => new Date(e.spentDate || e.date) >= p1Start);
    const period2 = recentExpenses.filter(e => {
      const d = new Date(e.spentDate || e.date);
      return d >= p2Start && d < p1Start;
    });

    const spent1 = period1.reduce((sum, e) => sum + (e.amount || 0), 0);
    const spent2 = period2.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const count1 = period1.length;
    const count2 = period2.length;

    const sTrend = spent2 === 0 ? null : ((spent1 - spent2) / spent2) * 100;
    const tTrend = count2 === 0 ? null : ((count1 - count2) / count2) * 100;

    return {
      spentTrend: sTrend !== null ? Number(sTrend.toFixed(0)) : null,
      transactionTrend: tTrend !== null ? Number(tTrend.toFixed(0)) : null
    };
  };

  const { spentTrend, transactionTrend } = calculateTrends();

  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <p className={styles.greetingLabel}>{getDateString()}</p>
          <h1 className={styles.greetingTitle}>
            {getGreeting()}, <span className={styles.userName}>{userName.split(' ')[0] || "there"}</span>
            <Sparkles size={18} className={styles.sparkle} />
          </h1>
        </div>
        
        {/* Only show Desktop Action button if on desktop. On mobile it's handled by FAB */}
        <div className={styles.desktopOnly}>
          {personalCompany && (
            <button
               className={styles.createBtn}
               onClick={() => navigate(`/company/${personalCompany.companyId || personalCompany.id}`)}
            >
               <ArrowUpRight size={18} /> Personal Space
            </button>
          )}
        </div>
      </div>

        {/* ── STAT CARDS ── */}
        <div className={styles.statsRow}>
          <StatCard 
            icon={Wallet}     
            label="Personal Budget"     
            value={isLoading ? "–" : `₹${totalBudgetAmount.toLocaleString()}`} 
            colorClass="cardBlue"   
            badge={activeBudgets.length > 0 ? "Active" : undefined} 
          />
          <StatCard 
            icon={TrendingUp} 
            label={`Spent (${currentMonthName})`}     
            value={isLoading ? "–" : `₹${totalSpent30Days.toLocaleString()}`}  
            colorClass="cardAmber" 
            trendLabel={isLoading ? null : `${totalBudgetAmount > 0 ? Math.round((totalSpent30Days / totalBudgetAmount) * 100) : 0}% Used`}
          />
          <StatCard 
            icon={BarChart2}  
            label="Total Transactions"  
            value={isLoading ? "–" : totalExpensesCount}                  
            colorClass="cardGreen" 
            trend={isLoading ? null : transactionTrend} 
          />
          <StatCard 
            icon={Bell}       
            label="Alerts"              
            value="0"                                                     
            colorClass="cardPurple"  
            badge="All Clear" 
          />
        </div>

        {/* ── CONTENT GRID ── */}
        <div className={styles.contentGrid}>
          {/* Main Content Area */}
          <div className={styles.contentArea}>
            {/* Daily Trend Chart (NEW) */}
            <motion.div className={styles.panel}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Daily Spending Trend</h2>
                  <p className={styles.panelSub}>Spending pattern for {new Date().toLocaleString('default', { month: 'long' })}</p>
                </div>
              </div>
              {isLoading ? (
                <div className={styles.trendSkeleton}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonAxis} />
                </div>
              ) : (
                <div style={{ height: "250px", marginTop: "1rem" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData}>
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f43f5e" /> {/* Rose/Red */}
                          <stop offset="33%" stopColor="#8b5cf6" /> {/* Violet */}
                          <stop offset="66%" stopColor="#3b82f6" /> {/* Blue */}
                          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan */}
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}}
                        tickFormatter={(v) => `₹${v}`} 
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                          padding: '12px'
                        }}
                        formatter={(v) => [`₹${v.toLocaleString()}`, "Spent"]}
                        labelFormatter={(l) => `Day ${l}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="url(#lineGradient)" 
                        strokeWidth={5}
                        dot={{ r: 5, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                        activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3, fill: '#6366f1' }}
                        fillOpacity={1} 
                        fill="url(#areaGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>

            {/* Expenses by Category */}
            <motion.div className={styles.panel}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Expenses by Category</h2>
                  <p className={styles.panelSub}>{currentMonthName} overview</p>
                </div>
              </div>
              {isLoading ? (
                <div className={styles.donutSkeleton}>
                  <div className={styles.skeletonRing} />
                  <div className={styles.skeletonLegendGrid}>
                    {[1,2,3,4].map(i => (
                      <div key={i} className={styles.skeletonLegendRow}>
                        <div className={styles.skeleton} style={{width: '10px', height: '10px', borderRadius: '50%'}} />
                        <div className={styles.skeleton} style={{height: '14px', flex: 1}} />
                        <div className={styles.skeleton} style={{height: '14px', width: '50px'}} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ExpenseChart data={chartData} />
              )}
            </motion.div>
          </div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            {/* Quick Actions */}
            <motion.div className={styles.panel}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className={styles.panelTitle}>Quick Actions</h2>
              <div className={styles.quickActions} style={{marginTop: "1rem"}}>
                <button 
                  type="button" 
                  className={styles.quickBtnOutline} 
                  onClick={() => personalCompany && navigate(`/company/${personalCompany.companyId || personalCompany.id}`)}
                >
                  Manage Budgets <ArrowUpRight size={14}/>
                </button>
                <button type="button" className={styles.quickBtnOutline} onClick={() => navigate("/companies")}>
                  View All Companies <ArrowUpRight size={14}/>
                </button>
              </div>
            </motion.div>

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
                  recentExpenses.slice(0, 5).map((exp, idx) => {
                    // Category color dot
                    const CAT_COLORS = ["#6366f1","#06b6d4","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#f43f5e","#14b8a6","#3b82f6"];
                    const catHash = (exp.categoryName || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0);
                    const dotColor = CAT_COLORS[catHash % CAT_COLORS.length];
                    // Date formatting
                    const expDate = new Date(exp.spentDate || exp.date || exp.createdAt);
                    const today = new Date();
                    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
                    const isToday = expDate.toDateString() === today.toDateString();
                    const isYesterday = expDate.toDateString() === yesterday.toDateString();
                    const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                    return (
                      <div key={exp.id} className={styles.overviewItem}>
                        <div className={styles.expIconWrap} style={{ background: `${dotColor}15` }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, display: 'block' }} />
                        </div>
                        <div className={styles.expInfo}>
                          <p className={styles.expTitle}>{exp.reference || exp.description || 'Expense'}</p>
                          <p className={styles.expMeta}>{exp.categoryName ? `${exp.categoryName} · ${dateLabel}` : dateLabel}</p>
                        </div>
                        <div className={styles.expAmount}>₹{exp.amount.toLocaleString()}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── MOBILE FAB ── */}
        {personalCompany && (
          <FloatingActionButton 
            onClick={() => navigate(`/company/${personalCompany.companyId || personalCompany.id}`)}
            label="Personal Space"
            icon={ArrowUpRight}
          />
        )}
    </AppSidebar>
  );
}
