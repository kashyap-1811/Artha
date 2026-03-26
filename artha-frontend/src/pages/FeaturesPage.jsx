import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/* ─── Feature Stack Cards ──────────────────────────────────── */
const CARDS = [
  {
    tag: "Identity & Access",
    title: "Secure Authentication",
    body: "Sign up with email and password or use Google OAuth 2.0 for one-click access. Every session is guarded by signed JWT tokens — your data stays yours.",
    bullets: ["Email / Password registration", "Google OAuth 2.0 sign-in", "JWT-secured sessions", "Per-user Redis rate limiting"],
    emoji: "🔐",
    gradient: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)",
    accent: "#3b82f6", accentSoft: "#dbeafe",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 280 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", boxShadow: "0 2px 14px rgba(59,130,246,0.12)", border: "1px solid #e0e7ff" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Sign in with</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 700 }}>📧 Email</div>
            <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 700 }}>🔵 Google</div>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "12px 18px", boxShadow: "0 2px 14px rgba(59,130,246,0.08)", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>K</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Welcome back, Kashyap</div>
            <div style={{ fontSize: 11, color: "#10b981" }}>✓ Authenticated</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    tag: "Workspace",
    title: "Multi-Company Management",
    body: "Run finances for multiple companies under one login. Each company has its own budgets, members, and expense history — totally isolated.",
    bullets: ["Create unlimited companies", "Invite members by email", "Owner / Member roles", "Personal workspace auto-created on signup"],
    emoji: "🏢",
    gradient: "linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)",
    accent: "#10b981", accentSoft: "#dcfce7",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        {[
          { name: "Acme Corp", role: "Owner", members: 5, color: "#3b82f6" },
          { name: "Personal Space", role: "Owner", members: 1, color: "#10b981" },
          { name: "StartupXYZ", role: "Member", members: 8, color: "#6366f1" },
        ].map(c => (
          <div key={c.name} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{c.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{c.members} members</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: c.role === "Owner" ? "#dbeafe" : "#f1f5f9", color: c.role === "Owner" ? "#2563eb" : "#64748b" }}>{c.role}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: "Budgeting",
    title: "Fiscal Budgets & Category Allocations",
    body: "Create time-bounded budgets for any fiscal period. Slice the total across categories like Marketing, Payroll, and Travel and track each independently.",
    bullets: ["Date-range budget periods", "Named category allocations", "Configurable alert thresholds", "Active / Closed budget tracking"],
    emoji: "📅",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%)",
    accent: "#f59e0b", accentSoft: "#fef3c7",
    visual: (
      <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #e2e8f0", width: "100%", maxWidth: 280 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Q1 Marketing 2026</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#0f172a" }}>₹1,20,000</div>
          <div style={{ height: 8, borderRadius: 99, background: "#f1f5f9", marginTop: 6 }}>
            <div style={{ width: "54%", height: "100%", borderRadius: 99, background: "linear-gradient(to right, #f59e0b, #ef4444)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
            <span>₹64,800 spent</span><span>₹55,200 left</span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
          {[{ cat: "Marketing", pct: 78, color: "#f59e0b" }, { cat: "Travel", pct: 42, color: "#3b82f6" }, { cat: "Payroll", pct: 35, color: "#10b981" }].map(a => (
            <div key={a.cat} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>{a.cat}</span>
                <span style={{ color: a.pct >= 70 ? "#ef4444" : "#10b981" }}>{a.pct}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9" }}>
                <div style={{ width: `${a.pct}%`, height: "100%", borderRadius: 99, background: a.color, opacity: 0.85 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: "Expense Tracking",
    title: "Log & Track Expenses in Real Time",
    body: "Submit expenses against any allocation and watch your balance update live. Filter by category, date, or status — history is always one click away.",
    bullets: ["Attach expenses to any category", "Pending / Approved / Rejected states", "Real-time balance updates", "Monthly history grouping"],
    emoji: "💸",
    gradient: "linear-gradient(135deg, #fce7f3 0%, #fdf4ff 100%)",
    accent: "#ec4899", accentSoft: "#fce7f3",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 280 }}>
        {[
          { desc: "Team Lunch", cat: "Marketing", amt: "₹2,400", status: "APPROVED", sc: "#10b981", sb: "#f0fdf4" },
          { desc: "Flight BOM-DEL", cat: "Travel", amt: "₹12,800", status: "PENDING", sc: "#ea580c", sb: "#fff7ed" },
          { desc: "AWS Invoice", cat: "IT Ops", amt: "₹6,100", status: "APPROVED", sc: "#10b981", sb: "#f0fdf4" },
          { desc: "Freelance Design", cat: "Marketing", amt: "₹8,500", status: "REJECTED", sc: "#ef4444", sb: "#fef2f2" },
        ].map((e, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}>{e.desc}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>{e.cat}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{e.amt}</div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: e.sb, color: e.sc }}>{e.status}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: "Governance",
    title: "Owner Approval Workflow",
    body: "No expense goes through without oversight. Company owners review submissions and approve or reject them — keeping budgets auditable and teams accountable.",
    bullets: ["One-click approve or reject", "Instant status updates", "Full audit trail per expense", "Owner-only permission enforcement"],
    emoji: "✅",
    gradient: "linear-gradient(135deg, #ede9fe 0%, #dde9fe 100%)",
    accent: "#6366f1", accentSoft: "#ede9fe",
    visual: (
      <div style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid #e2e8f0", width: "100%", maxWidth: 280 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Pending Review (3)</div>
        {[{ name: "Rahul", desc: "Flight Ticket", amt: "₹14,200" }, { name: "Priya", desc: "SaaS Subscription", amt: "₹3,500" }].map((exp, i) => (
          <div key={i} style={{ borderBottom: "1px solid #f8fafc", paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}>{exp.name} — {exp.desc}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "4px 0 8px" }}>{exp.amt}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 8, background: "#dcfce7", color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✓ Approve</div>
              <div style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 8, background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: 12 }}>✗ Reject</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: "Alerts",
    title: "Automated Email Budget Alerts",
    body: "Artha watches your spending automatically. When a category hits 80%, owners get an email alert. If it exceeds 100%, a critical alert fires — deduplicated, so no spam.",
    bullets: ["Configurable per-category thresholds", "80% Threshold & 100% Exceeded alerts", "Deduplication — no spam, ever", "Instant email via SMTP"],
    emoji: "🔔",
    gradient: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
    accent: "#f97316", accentSoft: "#fff7ed",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        <div style={{ background: "#fff7ed", borderRadius: 12, padding: "12px 16px", border: "1px solid #fed7aa" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#c2410c" }}>THRESHOLD_ALERT</div>
              <div style={{ fontSize: 11, color: "#7c2d12", marginTop: 2 }}>Marketing hit 80% of ₹30,000 limit. Spend: ₹24,300.</div>
            </div>
          </div>
        </div>
        <div style={{ background: "#fef2f2", borderRadius: 12, padding: "12px 16px", border: "1px solid #fecaca" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#b91c1c" }}>EXCEED_ALERT</div>
              <div style={{ fontSize: 11, color: "#7f1d1d", marginTop: 2 }}>Travel exceeded! ₹26,200 spent of ₹25,000 limit.</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    tag: "Analytics",
    title: "Smart Analytics Dashboard",
    body: "A dedicated Python analytics engine computes health scores, category breakdowns, month-over-month trends, and top spender leaderboards — all in O(1) reads.",
    bullets: ["Health Score: On Track / At Risk / Over Budget", "Pie chart category breakdown", "6-month spending trend", "Top spenders leaderboard"],
    emoji: "📊",
    gradient: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
    accent: "#06b6d4", accentSoft: "#e0f2fe",
    visual: (
      <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", border: "1px solid #e2e8f0", width: "100%", maxWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Company Health</span>
          <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 }}>On Track ✓</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 55, marginBottom: 12 }}>
          {[65, 40, 88, 30, 75, 55].map((h, i) => (
            <div key={i} style={{ flex: 1, height: h * 0.62, borderRadius: "3px 3px 0 0", background: `linear-gradient(to top, #3b82f6, #06b6d4)`, opacity: 0.85 }} />
          ))}
        </div>
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
          {[{ cat: "Travel", pct: 78 }, { cat: "Food", pct: 22 }].map(c => (
            <div key={c.cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", color: "#64748b" }}>
              <span>{c.cat}</span><span style={{ fontWeight: 700, color: "#06b6d4" }}>{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

/* ─── Company Detail Actions ──────────────────────────────── */
const COMPANY_ACTIONS = [
  { emoji: "✨", title: "Create a Company", body: "Start fresh with a new company workspace. Name it, set it up, and you're the owner. Invite team members any time.", color: "#3b82f6", bg: "#eff6ff" },
  { emoji: "👥", title: "Invite Team Members", body: "Add collaborators by email. Assign them an Owner or Member role to control what they can approve and view.", color: "#10b981", bg: "#f0fdf4" },
  { emoji: "📋", title: "Create Fiscal Budgets", body: "Define a budget period with start & end dates and a total spending cap for the whole fiscal cycle.", color: "#f59e0b", bg: "#fffbeb" },
  { emoji: "🗂️", title: "Allocate Categories", body: "Divide budget money into named categories (Marketing, Payroll, Travel). Set individual alert thresholds per category.", color: "#8b5cf6", bg: "#faf5ff" },
  { emoji: "🧾", title: "Submit Expenses", body: "Team members log expenses against any active allocation. Each expense gets a unique ID, status, and linked category.", color: "#ec4899", bg: "#fdf4ff" },
  { emoji: "✅", title: "Approve or Reject", body: "As owner, review all pending expenses in one panel. Approve to trigger payments and analytics, or reject with a reason.", color: "#6366f1", bg: "#eef2ff" },
  { emoji: "📊", title: "View Analytics", body: "Open the Analytics page from any company or budget to see health score, category trends, and month-over-month trajectory.", color: "#06b6d4", bg: "#ecfeff" },
  { emoji: "🔔", title: "Receive Alerts", body: "Email alerts fire automatically when allocations hit 80% or 100%. No configuration needed — Artha handles it all.", color: "#f97316", bg: "#fff7ed" },
];

/* ─── Main Page ────────────────────────────────────────────── */
export default function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "rgba(241, 245, 249, 0.8)", minHeight: "100vh", fontFamily: "'Inter','Outfit',sans-serif" }}>

      {/* ── HERO ── */}
      <section style={{ textAlign: "center", padding: "3.5rem 2rem 2rem", maxWidth: 680, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <span style={{ display: "inline-block", background: "linear-gradient(135deg, #dbeafe, #ede9fe)", border: "1px solid #c7d2fe", borderRadius: 999, padding: "0.3rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#4f46e5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
              Everything in one platform
            </span>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "0.9rem" }}>
              Explore the Features<br />
              <span style={{ background: "linear-gradient(90deg, #3b82f6, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Powering Artha
              </span>
            </h1>
            <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.65, maxWidth: 500, margin: "0 auto 1.5rem" }}>
              Scroll through every capability — from secure login to AI-driven analytics. Built for modern financial operations.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {["7 Core Features", "Multi-Company", "AI Analytics", "Real-Time Alerts"].map(tag => (
                <span key={tag} style={{ fontSize: "0.76rem", fontWeight: 600, color: "#475569", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, padding: "0.28rem 0.8rem" }}>{tag}</span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── STICKY CARD STACK ── */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem 4rem" }}>
          {CARDS.map((card, i) => (
            <div
              key={i}
              style={{
                position: "sticky",
                top: 72 + i * 18,          /* 72px = navbar height, 18px offset per card */
                zIndex: 10 + i,
                marginBottom: "1.5rem",
                transform: `scale(${1 - (CARDS.length - 1 - i) * 0.012})`, /* subtle depth scale */
                transformOrigin: "top center",
                transition: "transform 0.3s ease",
              }}
            >
              <div style={{
                minHeight: "22rem",
                background: card.gradient,
                display: "flex",
                alignItems: "stretch",
                overflow: "hidden",
                borderRadius: 24,
                boxShadow: `0 ${4 + i * 3}px ${24 + i * 8}px rgba(15,23,42,${0.06 + i * 0.02})`,
              }}>
                {/* Left: content */}
                <div style={{ flex: "1 1 55%", padding: "2.5rem 2.5rem 2.5rem 3rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
                    <span style={{ fontSize: "1.8rem" }}>{card.emoji}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: card.accent, background: card.accentSoft, border: `1px solid ${card.accent}44`, borderRadius: 999, padding: "0.22rem 0.7rem" }}>{card.tag}</span>
                  </div>
                  <h2 style={{ fontSize: "clamp(1.2rem, 2vw, 1.75rem)", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.65rem", lineHeight: 1.2 }}>{card.title}</h2>
                  <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1.2rem", maxWidth: 400 }}>{card.body}</p>
                  <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {card.bullets.map((b, bi) => (
                      <li key={bi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", color: "#334155" }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: card.accentSoft, border: `1px solid ${card.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: card.accent, flexShrink: 0 }}>✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "#94a3b8" }}>{i + 1} / {CARDS.length}</div>
                </div>

                {/* Right: visual mockup */}
                <div style={{ flex: "0 0 38%", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.75rem", background: "rgba(255,255,255,0.35)", borderLeft: "1px solid rgba(255,255,255,0.5)" }}>
                  {card.visual}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── COMPANY LEVEL DETAIL SECTION ── */}
        <section style={{ padding: "5rem 2rem 4rem", maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ display: "inline-block", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "0.3rem 0.9rem", fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Company Level
            </span>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em", marginBottom: "0.75rem" }}>
              Everything you can do with a Company
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.97rem", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
              Once inside a company dashboard, you're in full control. Here's a complete tour of every action available at the company level.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.1rem" }}>
            {COMPANY_ACTIONS.map((action, i) => (
              <motion.div key={action.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: (i % 4) * 0.07, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: `0 12px 32px ${action.color}18` }}
                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: "1.4rem", position: "relative", overflow: "hidden", transition: "box-shadow 0.25s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${action.color}, transparent)` }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: action.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "0.9rem" }}>
                  {action.emoji}
                </div>
                <h3 style={{ fontSize: "0.97rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>{action.title}</h3>
                <p style={{ fontSize: "0.84rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{action.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick action strip */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            style={{ marginTop: "3rem", background: "linear-gradient(135deg, #eff6ff, #ede9fe)", border: "1px solid #c7d2fe", borderRadius: 20, padding: "2rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a", marginBottom: "0.3rem" }}>Ready to run your first company?</h3>
              <p style={{ color: "#475569", fontSize: "0.9rem", margin: 0 }}>Head to your dashboard and create or select a company to get started immediately.</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/companies")}
                style={{ background: "linear-gradient(135deg, #3b82f6, #4f46e5)", color: "#fff", border: "none", borderRadius: 999, padding: "0.7rem 1.6rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(79,70,229,0.28)" }}>
                My Companies →
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/dashboard")}
                style={{ background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 999, padding: "0.7rem 1.6rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
                Dashboard
              </motion.button>
            </div>
          </motion.div>
        </section>

    </div>
  );
}
