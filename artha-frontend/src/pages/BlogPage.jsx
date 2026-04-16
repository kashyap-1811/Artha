import { useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import styles from "./BlogPage.module.css";
import commonStyles from "./DashboardPage.module.css";


/* ═══ Blog Data ═══ */
const CATEGORIES = ["All", "Personal Finance", "Business Tips", "Budgeting 101", "Product Updates"];

const POSTS = [
  {
    title: "Personal vs Business Finance: Why You Need to Separate Them",
    excerpt: "Mixing personal and business expenses is the #1 financial mistake small business owners make. Learn how separating them gives you clarity, saves on taxes, and makes auditing effortless.",
    category: "Personal Finance",
    author: "Kashyap V.",
    avatar: "K",
    avatarBg: "#3b82f6",
    readTime: "5 min read",
    date: "Apr 14, 2026",
    emoji: "💼",
    gradient: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)",
    tagColor: "#3b82f6",
    tagBg: "#dbeafe",
    featured: true,
  },
  {
    title: "5 Budgeting Mistakes That Cost You Lakhs Every Year",
    excerpt: "From ignoring small expenses to not setting category limits — discover the silent budget killers and how to fix them before they drain your wallet.",
    category: "Budgeting 101",
    author: "Priya S.",
    avatar: "P",
    avatarBg: "#ec4899",
    readTime: "4 min read",
    date: "Apr 12, 2026",
    emoji: "💸",
    gradient: "linear-gradient(135deg, #fce7f3 0%, #fdf4ff 100%)",
    tagColor: "#ec4899",
    tagBg: "#fce7f3",
  },
  {
    title: "How to Set Up Your First Company Budget in Under 5 Minutes",
    excerpt: "A step-by-step walkthrough of creating a fiscal budget in Artha — from naming your period to allocating categories and setting alert thresholds.",
    category: "Product Updates",
    author: "Artha Team",
    avatar: "A",
    avatarBg: "#6366f1",
    readTime: "3 min read",
    date: "Apr 10, 2026",
    emoji: "⚡",
    gradient: "linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)",
    tagColor: "#6366f1",
    tagBg: "#ede9fe",
  },
  {
    title: "The Art of Expense Categorization: A Beginner's Guide",
    excerpt: "Good categories are the foundation of good budgeting. Learn how to design a category system that scales with your business and gives meaningful analytics.",
    category: "Budgeting 101",
    author: "Rahul M.",
    avatar: "R",
    avatarBg: "#10b981",
    readTime: "6 min read",
    date: "Apr 8, 2026",
    emoji: "🗂️",
    gradient: "linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)",
    tagColor: "#10b981",
    tagBg: "#dcfce7",
  },
  {
    title: "Why Real-Time Budget Alerts Save Your Business Money",
    excerpt: "A 10% overspend caught at 80% is far cheaper than one discovered at month-end. See how automated alerts act as your financial guardrails.",
    category: "Business Tips",
    author: "Kashyap V.",
    avatar: "K",
    avatarBg: "#3b82f6",
    readTime: "4 min read",
    date: "Apr 5, 2026",
    emoji: "🔔",
    gradient: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
    tagColor: "#f97316",
    tagBg: "#fff7ed",
  },
  {
    title: "Monthly vs Quarterly Budgets: Which is Right for Your Team?",
    excerpt: "Small teams benefit from monthly cycles. Larger orgs prefer quarterly. Here's a framework to help you decide — with pros, cons, and data.",
    category: "Business Tips",
    author: "Priya S.",
    avatar: "P",
    avatarBg: "#ec4899",
    readTime: "5 min read",
    date: "Apr 3, 2026",
    emoji: "📊",
    gradient: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)",
    tagColor: "#06b6d4",
    tagBg: "#e0f2fe",
  },
  {
    title: "Understanding Financial Health Scores: What They Mean",
    excerpt: "Artha's AI computes a health score for every company and budget. Learn what 'On Track', 'At Risk', and 'Over Budget' really mean under the hood.",
    category: "Product Updates",
    author: "Artha Team",
    avatar: "A",
    avatarBg: "#6366f1",
    readTime: "4 min read",
    date: "Mar 28, 2026",
    emoji: "🏥",
    gradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    tagColor: "#16a34a",
    tagBg: "#dcfce7",
  },
  {
    title: "How Artha's Approval Workflow Prevents Expense Fraud",
    excerpt: "Every expense goes through an owner-approval gate. This simple workflow has saved companies thousands by catching unauthorized spending early.",
    category: "Business Tips",
    author: "Rahul M.",
    avatar: "R",
    avatarBg: "#10b981",
    readTime: "5 min read",
    date: "Mar 24, 2026",
    emoji: "✅",
    gradient: "linear-gradient(135deg, #ede9fe 0%, #dde9fe 100%)",
    tagColor: "#6366f1",
    tagBg: "#ede9fe",
  },
  {
    title: "10 Tax-Saving Tips Every Freelancer Should Know",
    excerpt: "From claiming home office deductions to understanding GST input credit — maximize your savings with these actionable tips for Indian freelancers.",
    category: "Personal Finance",
    author: "Kashyap V.",
    avatar: "K",
    avatarBg: "#3b82f6",
    readTime: "7 min read",
    date: "Mar 20, 2026",
    emoji: "🧾",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%)",
    tagColor: "#f59e0b",
    tagBg: "#fef3c7",
  },
  {
    title: "From Spreadsheets to SaaS: Modernizing Your Finance Stack",
    excerpt: "Still using Excel for budgeting? Here's why modern SaaS tools like Artha offer 10x the visibility, real-time collaboration, and zero formula errors.",
    category: "Personal Finance",
    author: "Priya S.",
    avatar: "P",
    avatarBg: "#ec4899",
    readTime: "6 min read",
    date: "Mar 16, 2026",
    emoji: "🚀",
    gradient: "linear-gradient(135deg, #fce7f3 0%, #fdf4ff 100%)",
    tagColor: "#ec4899",
    tagBg: "#fce7f3",
  },
];

/* ═══ Component ═══ */
export default function BlogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCat, setActiveCat] = useState("All");


  const featured = POSTS.find(p => p.featured);
  const filtered = activeCat === "All"
    ? POSTS.filter(p => !p.featured)
    : POSTS.filter(p => p.category === activeCat && !p.featured);

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
        <span className={styles.badge}>Artha Insights</span>
        <h1 className={styles.heroTitle}>
          Smart reads for<br />
          <span className={styles.heroGradient}>smarter finances</span>
        </h1>
        <p className={styles.heroSub}>
          Tips, guides, and product updates to help you budget better, track smarter, and grow faster.
        </p>
      </motion.section>

      {/* ── Category Filter ── */}
      <div className={styles.categories}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`${styles.catPill} ${activeCat === cat ? styles.active : ""}`}
            onClick={() => setActiveCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Featured Post ── */}
      {featured && activeCat === "All" && (
        <motion.div className={styles.featured}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className={styles.featuredCard}>
            <div className={styles.featuredImgPlaceholder} style={{ background: featured.gradient }}>
              {featured.emoji}
            </div>
            <div className={styles.featuredBody}>
              <span className={styles.featuredTag} style={{ color: featured.tagColor, background: featured.tagBg }}>
                {featured.category}
              </span>
              <h2 className={styles.featuredTitle}>{featured.title}</h2>
              <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
              <div className={styles.featuredMeta}>
                <div className={styles.metaAvatar} style={{ background: featured.avatarBg }}>
                  {featured.avatar}
                </div>
                <div className={styles.metaText}>
                  <span className={styles.metaAuthor}>{featured.author}</span>
                  <span className={styles.metaInfo}>{featured.date} · {featured.readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Blog Grid ── */}
      <section className={styles.gridSection}>
        <h3 className={styles.gridTitle}>
          {activeCat === "All" ? "Latest Articles" : activeCat}
        </h3>
        <div className={styles.grid}>
          {filtered.map((post, i) => (
            <motion.div
              key={post.title}
              className={styles.blogCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.08 }}
            >
              <div className={styles.cardThumb} style={{ background: post.gradient }}>
                {post.emoji}
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardTag} style={{ color: post.tagColor, background: post.tagBg }}>
                  {post.category}
                </span>
                <h4 className={styles.cardTitle}>{post.title}</h4>
                <p className={styles.cardExcerpt}>{post.excerpt}</p>
                <div className={styles.cardMeta}>
                  <div className={styles.cardAuthorRow}>
                    <div className={styles.cardAvatar} style={{ background: post.avatarBg }}>
                      {post.avatar}
                    </div>
                    <span>{post.author}</span>
                  </div>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Newsletter ── */}
      <motion.div className={styles.newsletter}
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h3 className={styles.nlTitle}>Stay in the loop 📬</h3>
        <p className={styles.nlSub}>Get the latest Artha tips and product updates delivered to your inbox.</p>
        <div className={styles.nlForm}>
          <input className={styles.nlInput} type="email" placeholder="you@company.com" />
          <button className={styles.nlBtn}>Subscribe</button>
        </div>
      </motion.div>

      <div className={styles.bottomSpacer} />
    </div>
    </AppSidebar>
  );
}
