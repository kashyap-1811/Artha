import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Star, CreditCard, BookOpen,
  Settings, X
} from "lucide-react";
import styles from "../pages/DashboardPage.module.css";
import BottomNav from "./BottomNav";

const NAV_LINKS = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Building2,       label: "Companies",  to: "/companies" },
  { icon: Star,            label: "Features",   to: "/features" },
  { icon: CreditCard,      label: "Pricing",    to: "/pricing" },
  { icon: BookOpen,        label: "Blog",       to: "/blog" },
];

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

export default function AppSidebar({ children, sidebarOpen: outerOpen, setSidebarOpen: setOuterOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = outerOpen !== undefined ? outerOpen : internalOpen;
  const setOpen = setOuterOpen !== undefined ? setOuterOpen : setInternalOpen;

  return (
    <div className={styles.appShell}>
      {/* ═══ LEFT SIDEBAR ═══ */}
      <>
        <AnimatePresence>
          {isOpen && (
            <motion.div className={styles.sidebarBackdrop}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)} />
          )}
        </AnimatePresence>
        <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarBrand}>
            <NavLink to="/" className={styles.brandLink}>
              <img src="/logo2.svg" alt="Artha Logo" className={styles.brandLogo} />
              <span className={styles.brandText}>Artha</span>
            </NavLink>
            <button type="button" className={styles.sidebarCloseBtn} onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className={styles.sideNav}>
            {NAV_LINKS.map((link) => (
              <SideNavItem key={link.label} {...link} onClick={() => setOpen(false)} />
            ))}
          </nav>
          <div className={styles.sidebarBottom}>
            <SideNavItem icon={Settings} label="Settings" to="/profile" onClick={() => setOpen(false)} />
          </div>
        </aside>
      </>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={styles.mainContent}>
        {children}
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <BottomNav />
    </div>
  );
}
