import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import styles from "./PricingPage.module.css";
import commonStyles from "./DashboardPage.module.css";


/* ═══ Tier Data ═══ */
const TIERS = [
  {
    name: "Creator",
    emoji: "✏️",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For individuals exploring personal finance tracking.",
    iconBg: "#fef3c7",
    accent: "#f59e0b",
    features: [
      { text: "1 Personal Company workspace", included: true },
      { text: "Up to 5 budget categories", included: true },
      { text: "Basic spending analytics", included: true },
      { text: "Community support", included: true },
      { text: "Email budget alerts", included: false },
      { text: "Team member invitations", included: false },
    ],
    cta: "Start Free",
    ctaStyle: "outline",
  },
  {
    name: "Professional",
    emoji: "⭐",
    monthlyPrice: 999,
    yearlyPrice: 799,
    description: "For freelancers and small teams who need complete control over company budgets.",
    iconBg: "#dbeafe",
    accent: "#3b82f6",
    popular: true,
    features: [
      { text: "Up to 5 managed companies", included: true },
      { text: "Unlimited budget categories", included: true },
      { text: "Real-time email alerts at 80% & 100%", included: true },
      { text: "AI-powered health scoring", included: true },
      { text: "Invite up to 15 team members", included: true },
      { text: "Advanced analytics dashboard", included: true },
    ],
    cta: "Get Professional",
    ctaStyle: "primary",
  },
  {
    name: "Enterprise",
    emoji: "🏢",
    monthlyPrice: 2999,
    yearlyPrice: 2499,
    description: "For scaling organizations needing full financial governance across global teams.",
    iconBg: "#ede9fe",
    accent: "#8b5cf6",
    features: [
      { text: "Unlimited companies & budgets", included: true },
      { text: "Priority API access & webhooks", included: true },
      { text: "Dedicated success manager", included: true },
      { text: "SAML / SSO integration", included: true },
      { text: "Custom approval workflows", included: true },
      { text: "SLA-backed 99.99% uptime", included: true },
    ],
    cta: "Contact Sales",
    ctaStyle: "outline",
  },
];

/* ═══ Comparison Table ═══ */
const COMP_FEATURES = [
  { name: "Personal workspace", creator: true, pro: true, enterprise: true },
  { name: "Multiple companies", creator: "1", pro: "5", enterprise: "∞" },
  { name: "Budget categories", creator: "5", pro: "∞", enterprise: "∞" },
  { name: "Team members", creator: "—", pro: "15", enterprise: "∞" },
  { name: "Expense tracking", creator: true, pro: true, enterprise: true },
  { name: "Approval workflow", creator: false, pro: true, enterprise: true },
  { name: "Email budget alerts", creator: false, pro: true, enterprise: true },
  { name: "AI health scoring", creator: false, pro: true, enterprise: true },
  { name: "Advanced analytics", creator: false, pro: true, enterprise: true },
  { name: "API access", creator: false, pro: false, enterprise: true },
  { name: "SSO / SAML", creator: false, pro: false, enterprise: true },
  { name: "Dedicated support", creator: false, pro: false, enterprise: true },
];

/* ═══ FAQ Data ═══ */
const FAQS = [
  { q: "Can I try Artha before paying?", a: "Absolutely. The Creator plan is free forever — no credit card required. You can upgrade to Professional any time to unlock team features, alerts, and AI analytics." },
  { q: "What happens when I exceed my plan limits?", a: "We'll notify you gracefully. Your data is never deleted. You can choose to upgrade your plan or remove extra resources at your own pace." },
  { q: "Can I switch between monthly and yearly billing?", a: "Yes. You can switch at any time from your account settings. When switching to yearly, you'll receive a prorated credit for the remaining monthly period." },
  { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee on all paid plans. If Artha isn't the right fit, we'll refund you — no questions asked." },
  { q: "Is my financial data secure?", a: "Bank-level security. All data is encrypted at rest and in transit. We use JWT authentication, Redis-backed rate limiting, and role-based access control across all services." },
  { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period." },
];

/* ═══ Trust Bar Data ═══ */
const TRUST = [
  { val: "10,000+", label: "Teams Trust Artha", color: "#3b82f6" },
  { val: "99.9%", label: "Uptime SLA", color: "#10b981" },
  { val: "₹2.4Cr+", label: "Tracked Monthly", color: "#f59e0b" },
  { val: "4.9★", label: "User Rating", color: "#8b5cf6" },
];

/* ═══ Component ═══ */
export default function PricingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);


  const renderCell = (val) => {
    if (val === true) return <span className={styles.compCheck}>✓</span>;
    if (val === false) return <span className={styles.compCross}>—</span>;
    return <span style={{ fontWeight: 700, color: "#0f172a" }}>{val}</span>;
  };

  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>

      <div className={commonStyles.topBar} style={{ padding: '1rem 1.5rem', border: 'none', background: 'transparent' }}>
        <button type="button" className={commonStyles.hamburger} onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
        </button>
      </div>

    <div className={styles.page}>

      {/* ── Hero ── */}
      <motion.section className={styles.hero}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <span className={styles.badge}>Simple, Transparent Pricing</span>
        <h1 className={styles.heroTitle}>
          Plans that grow<br />
          <span className={styles.heroGradient}>with your business</span>
        </h1>
        <p className={styles.heroSub}>
          Start free. Upgrade when you need team collaboration, smart alerts, and AI-driven financial insights.
        </p>
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${!annual ? styles.active : ""}`}
            onClick={() => setAnnual(false)}
          >Monthly</button>
          <button
            className={`${styles.toggleBtn} ${annual ? styles.active : ""}`}
            onClick={() => setAnnual(true)}
          >
            Yearly<span className={styles.saveTag}>Save 20%</span>
          </button>
        </div>
      </motion.section>

      {/* ── Tier Cards ── */}
      <div className={styles.tiersRow}>
        {TIERS.map((tier, i) => {
          const price = annual ? tier.yearlyPrice : tier.monthlyPrice;
          return (
            <motion.div
              key={tier.name}
              className={`${styles.tierCard} ${tier.popular ? styles.tierPopular : ""}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              {tier.popular && <div className={styles.popularRibbon}>Popular</div>}
              <div className={styles.tierIcon} style={{ background: tier.iconBg }}>
                {tier.emoji}
              </div>
              <h3 className={styles.tierName}>{tier.name}</h3>
              <p className={styles.tierDesc}>{tier.description}</p>
              <div className={styles.tierPrice}>
                <span className={styles.priceCurrency}>₹</span>
                <span className={styles.priceAmount}>{price.toLocaleString()}</span>
                <span className={styles.pricePeriod}>/mo</span>
              </div>
              {annual && tier.monthlyPrice > 0 && (
                <div className={styles.strikePrice}>₹{tier.monthlyPrice.toLocaleString()}/mo</div>
              )}
              {price === 0 && <div className={styles.strikePrice}>Free forever</div>}
              <ul className={styles.tierFeatures}>
                {tier.features.map((f, fi) => (
                  <li key={fi}>
                    <span
                      className={styles.checkIcon}
                      style={{
                        background: f.included ? `${tier.accent}15` : "#f1f5f9",
                        color: f.included ? tier.accent : "#cbd5e1",
                        border: `1px solid ${f.included ? `${tier.accent}44` : "#e2e8f0"}`,
                      }}
                    >
                      {f.included ? "✓" : "✗"}
                    </span>
                    <span style={{ color: f.included ? "#334155" : "#94a3b8" }}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`${styles.tierCta} ${tier.ctaStyle === "primary" ? styles.ctaPrimary : styles.ctaOutline}`}
                onClick={() => navigate("/auth")}
              >
                {tier.cta}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* ── Trust Bar ── */}
      <motion.div className={styles.trustBar}
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
        {TRUST.map(t => (
          <div key={t.label} className={styles.trustItem}>
            <div className={styles.trustVal} style={{ color: t.color }}>{t.val}</div>
            <div className={styles.trustLabel}>{t.label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Guarantee ── */}
      <div className={styles.guaranteeStrip}>
        <p className={styles.guaranteeText}>
          💳 <strong>No credit card required</strong> for the free plan. All paid plans include a <strong>14-day money-back guarantee</strong>. Cancel anytime — your data stays safe.
        </p>
      </div>

      {/* ── Feature Comparison ── */}
      <motion.section className={styles.compSection}
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2 className={styles.compTitle}>Compare Plans</h2>
        <p className={styles.compSub}>A detailed look at what each plan includes</p>
        <table className={styles.compTable}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Creator</th>
              <th style={{ color: "#3b82f6" }}>Professional ⭐</th>
              <th>Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {COMP_FEATURES.map(f => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td>{renderCell(f.creator)}</td>
                <td>{renderCell(f.pro)}</td>
                <td>{renderCell(f.enterprise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.section>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
        {FAQS.map((faq, i) => (
          <div key={i} className={styles.faqItem}>
            <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              {faq.q}
              <span className={`${styles.faqArrow} ${openFaq === i ? styles.open : ""}`}>▾</span>
            </button>
            {openFaq === i && (
              <motion.div
                className={styles.faqAnswer}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.25 }}
              >
                {faq.a}
              </motion.div>
            )}
          </div>
        ))}
      </section>

    </div>
    </AppSidebar>
  );
}
