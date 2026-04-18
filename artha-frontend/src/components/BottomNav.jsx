import { NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, User, PieChart } from "lucide-react";
import styles from "./BottomNav.module.css";

const BOTTOM_LINKS = [
  { icon: LayoutDashboard, label: "Home", to: "/dashboard" },
  { icon: Building2,       label: "Companies",  to: "/companies" },
  { icon: User,            label: "Profile",    to: "/profile" },
];

export default function BottomNav() {
  return (
    <nav className={styles.bottomNav}>
      <div className={styles.navContainer}>
        {BOTTOM_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}
          >
            <link.icon size={20} className={styles.icon} />
            <span className={styles.label}>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
