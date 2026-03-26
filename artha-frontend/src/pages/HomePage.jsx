import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil, Star, Sparkles } from "lucide-react";
import { CreativePricing } from "../components/ui/CreativePricing";
import Footer from "../components/Footer";

/* ─── Animation phases ─────────────────────────────────────
   0 → giant word fills screen, scales down to heading size
   1 → "शास्त्र" softly fades & slides right, "Artha" stays centred
   2 → page content fades in
──────────────────────────────────────────────────────────── */

/* ─── Feature Stack Cards (from FeaturesPage) ──────────────── */
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

const PRICING_TIERS = [
  {
      name: "Creator",
      icon: <Pencil className="w-6 h-6" />,
      price: 0,
      description: "Perfect for financial exploration",
      color: "#f59e0b",
      features: [
          "1 Personal Company",
          "5 Budget Categories",
          "Basic Analytics",
          "Community Support",
      ],
  },
  {
      name: "Professional",
      icon: <Star className="w-6 h-6" />,
      price: 49,
      description: "For serious business control",
      color: "#3b82f6",
      features: [
          "5 Managed Companies",
          "Unlimited Categories",
          "Real-time Email Alerts",
          "AI Health Scoring",
      ],
      popular: true,
  },
  {
      name: "Enterprise",
      icon: <Sparkles className="w-6 h-6" />,
      price: 199,
      description: "For scaling global teams",
      color: "#8b5cf6",
      features: [
          "Unlimited Everything",
          "Priority API Access",
          "Dedicated Success Manager",
          "SAML / SSO Integration",
      ],
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    document.body.style.backgroundColor = "#f8fafc";
    document.body.style.color = "#0f172a";
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
      document.body.style.overflowX = "";
    };
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1400);
    const t2 = setTimeout(() => setPhase(2), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, rgba(255, 255, 255, 0.8) 0%, rgba(241, 245, 249, 0.8) 60%, rgba(232, 240, 254, 0.8) 100%)",
      fontFamily: "'Inter','Outfit',sans-serif",
    }}>

      {/* ══ HERO / INTRO ══ */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>

        {/* Blue glow behind heading */}
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%, -55%)",
          pointerEvents: "none",
        }} />

        {/* ── THE BIG → SMALL WORD ── */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
          <div style={{ position: "relative", height: "clamp(5rem, 11vw, 8.5rem)", width: "100vw", transform: "translateX(-50%)", left: "50%" }}>

            {/* LAYER 1: Arthaशास्त्र */}
            <motion.div
              initial={{ scale: 7, opacity: 1 }}
              animate={{
                scale: phase === 0 ? 1 : 1,
                opacity: phase >= 1 ? 0 : 1,
              }}
              transition={{
                scale: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.7, ease: "easeInOut", delay: phase >= 1 ? 0 : 0 },
              }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                transformOrigin: "50% 50%",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{
                fontSize: "clamp(3.5rem, 9vw, 7rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}>
                <span style={{
                  background: "linear-gradient(135deg, #0f172a 20%, #1e40af 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>Artha</span>
                <span style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  marginLeft: "0.1em",
                }}>शास्त्र</span>
              </span>
            </motion.div>

            {/* LAYER 2: Artha only */}
            <motion.div
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: phase >= 1 ? 1 : 0 }}
              transition={{ duration: 0.75, ease: "easeInOut", delay: phase >= 1 ? 0.15 : 0 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{
                fontSize: "clamp(3.5rem, 9vw, 7rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                background: "linear-gradient(135deg, #0f172a 20%, #1e40af 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>Artha</span>
            </motion.div>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 8 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            style={{
              marginTop: "1.1rem",
              fontSize: "clamp(0.85rem, 1.8vw, 1.05rem)",
              color: "#64748b",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Smart Financial Management
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 16 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{ display: "flex", gap: "0.8rem", justifyContent: "center", marginTop: "2.5rem", flexWrap: "wrap" }}
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 32px rgba(79,70,229,0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/auth")}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #4f46e5)",
                color: "#fff", border: "none", borderRadius: 999,
                padding: "0.8rem 2.2rem", fontSize: "1rem", fontWeight: 700,
                cursor: "pointer", boxShadow: "0 4px 18px rgba(79,70,229,0.25)",
              }}
            >
              Get Started Free →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              style={{
                background: "#fff", color: "#0f172a",
                border: "1px solid #e2e8f0", borderRadius: 999,
                padding: "0.8rem 2.2rem", fontSize: "1rem", fontWeight: 600,
                cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
              }}
            >
              Explore Features
            </motion.button>
          </motion.div>
        </div>

        {/* Animated scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 0.6 : 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          <span style={{ fontSize: "0.65rem", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" }}>Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1.5, height: 30, background: "linear-gradient(to bottom, #3b82f6, transparent)", borderRadius: 99 }}
          />
        </motion.div>
      </section>

      {/* ══ COMBINED CONTENT — fades in with phase 2 ══ */}
      <div style={{
        opacity: phase >= 2 ? 1 : 0,
        transition: "opacity 0.8s ease-in-out",
        visibility: phase >= 2 ? "visible" : "hidden",
      }}>
        {/* ── STATS STRIP ── */}
        <section style={{
          padding: "3rem 2rem",
          background: "rgba(255, 255, 255, 0.4)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}>
            {[
              { val: "7", label: "Microservices", color: "#3b82f6" },
              { val: "∞", label: "Budget Periods", color: "#6366f1" },
              { val: "O(1)", label: "Dashboard Reads", color: "#10b981" },
              { val: "100%", label: "Event-Driven", color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{
                flex: "1 1 160px", textAlign: "center",
                background: "rgba(255, 255, 255, 0.6)", border: "1px solid rgba(226, 232, 240, 0.8)",
                borderRadius: 16, padding: "1.2rem 1.4rem",
              }}>
                <div style={{ fontSize: "2.2rem", fontWeight: 900, color: s.color, letterSpacing: "-0.03em" }}>{s.val}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STICKY CARD STACK (from FeaturesPage) ── */}
        <section style={{ padding: "5rem 0", background: "transparent" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem", padding: "0 2rem" }}>
            <span style={{ display: "inline-block", background: "linear-gradient(135deg, #dbeafe, #ede9fe)", border: "1px solid #c7d2fe", borderRadius: 999, padding: "0.3rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#4f46e5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
              Everything in one platform
            </span>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              Unified Financial Intelligence
            </h2>
            <p style={{ color: "#64748b", marginTop: "0.75rem", fontSize: "1rem", maxWidth: 460, margin: "0.75rem auto 0", lineHeight: 1.65 }}>
              From budget creation to real-time analytics — every tool your team needs in one place.
            </p>
          </div>

          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem" }}>
            {CARDS.map((card, i) => (
              <div
                key={i}
                style={{
                  position: "sticky",
                  top: 50 + i * 20, 
                  zIndex: 10 + i,
                  marginBottom: "1.5rem",
                  transform: `scale(${1 - (CARDS.length - 1 - i) * 0.012})`,
                  transformOrigin: "top center",
                  transition: "transform 0.4s easeOut",
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
                  border: "1px solid rgba(255, 255, 255, 0.4)",
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
        </section>

        {/* ── COMPANY LEVEL DETAIL SECTION (from FeaturesPage) ── */}
        <section style={{ padding: "5rem 2rem 4rem", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ display: "inline-block", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "0.3rem 0.9rem", fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Company Level
            </span>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em", marginBottom: "0.75rem" }}>
              Comprehensive Control
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.97rem", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
              Once inside a company dashboard, you're in full control. Explore the core actions available to your team.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.1rem" }}>
            {COMPANY_ACTIONS.map((action, i) => (
              <motion.div key={action.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: (i % 4) * 0.07, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: `0 12px 32px ${action.color}18` }}
                style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(5px)", border: "1px solid #e2e8f0", borderRadius: 18, padding: "1.4rem", position: "relative", overflow: "hidden", transition: "box-shadow 0.25s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${action.color}, transparent)` }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: action.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "0.9rem" }}>
                  {action.emoji}
                </div>
                <h3 style={{ fontSize: "0.97rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>{action.title}</h3>
                <p style={{ fontSize: "0.84rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>{action.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PRICING SECTION ── */}
        <section id="pricing" style={{ padding: "4rem 0", background: "transparent", position: "relative", overflow: "hidden" }}>
           <CreativePricing 
              tag="Artha Growth Plans"
              title="Secure Your Financial Future"
              description="Transparent pricing for teams of all sizes. No hidden fees, just pure fiscal intelligence."
              tiers={PRICING_TIERS} 
           />
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ textAlign: "center", padding: "6rem 2rem 8rem" }}>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, rgba(239, 246, 255, 0.8), rgba(238, 242, 255, 0.8))",
            backdropFilter: "blur(10px)",
            border: "1px solid #c7d2fe", borderRadius: 24,
            padding: "2.5rem 3rem", maxWidth: 520,
            boxShadow: "0 4px 24px rgba(79,70,229,0.08)",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚀</div>
            <h2 style={{ fontWeight: 800, fontSize: "1.6rem", color: "#0f172a", marginBottom: "0.6rem", letterSpacing: "-0.02em" }}>
              Start managing smarter
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.93rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Create a free account and set up your first company budget in minutes.
            </p>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 8px 28px rgba(79,70,229,0.35)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/auth")}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #4f46e5)", color: "#fff",
                border: "none", borderRadius: 999, padding: "0.8rem 2.2rem",
                fontSize: "0.98rem", fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(79,70,229,0.28)",
              }}
            >
              Create Free Account →
            </motion.button>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
