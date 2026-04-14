import { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Settings, Menu, X, User, Mail, Phone, ShieldCheck, LogOut, Edit3, Save, XCircle, Sparkles,
  Star, CreditCard, BookOpen
} from "lucide-react";
import { getUserById, updateUser } from "../api/users";
import styles from "./DashboardPage.module.css";

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

function handleLogout() {
  localStorage.removeItem("artha_jwt");
  localStorage.removeItem("artha_user_id");
  localStorage.removeItem("artha_user");
  localStorage.removeItem("artha_user_role");
  window.location.href = "/auth";
}

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("artha_user_id");
    if (!userId) {
      navigate("/auth", { replace: true });
      return;
    }
    fetchUserProfile(userId);
  }, [navigate]);

  async function fetchUserProfile(userId) {
    setIsLoading(true);
    setError("");
    try {
      const data = await getUserById(userId);
      setUser(data);
      setEditFullName(data.fullName || "");
      setEditActive(data.active !== false);
    } catch (err) {
      setError(err.message || "Failed to load user profile");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    const userId = localStorage.getItem("artha_user_id");
    if (!userId) return;

    setIsUpdating(true);
    setError("");
    try {
      await updateUser(userId, {
        fullName: editFullName.trim(),
        active: editActive
      });
      // Also update local storage cache for the dashboard
      try {
        const cur = JSON.parse(localStorage.getItem("artha_user") || "{}");
        localStorage.setItem("artha_user", JSON.stringify({ ...cur, fullName: editFullName.trim() }));
      } catch { /* ignore */ }

      await fetchUserProfile(userId);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  }

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
            <NavLink to="/" className={styles.brandLink}>
              <img src="/logo2.svg" alt="Artha Logo" className={styles.brandLogo} />
              <span className={styles.brandText}>Artha</span>
            </NavLink>
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
            <p className={styles.greetingLabel}>Account & settings</p>
            <h1 className={styles.greetingTitle}>
              My Profile <Sparkles size={20} className={styles.sparkle} style={{ color: 'var(--accent)' }}/>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', padding: '0.45rem 1rem', borderRadius: 'var(--radius-sm, 8px)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {error && (
          <p style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', fontWeight: 600 }}>{error}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '800px' }}>
          
          <motion.div className={styles.panel} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className={styles.panelHeader} style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--edge)', paddingBottom: '1rem' }}>
              <div>
                <h2 className={styles.panelTitle}>Personal Information</h2>
                <p className={styles.panelSub}>Update your personal details here.</p>
              </div>
              {user && !isEditing && (
                <button 
                  onClick={() => setIsEditing(true)} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--text-main)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm, 6px)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
            </div>

            {isLoading ? (
              <div className={styles.skeletonList}>
                <div className={styles.skeleton} style={{ height: '40px' }} />
                <div className={styles.skeleton} style={{ height: '40px' }} />
              </div>
            ) : !user ? (
               <div className={styles.emptyState}>
                 <User size={38} className={styles.emptyIcon} style={{ opacity: 0.5 }}/>
                 <p>No user profile details found.</p>
               </div>
            ) : isEditing ? (
              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                  <input
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Enter full name"
                    autoFocus
                    required
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--edge)', background: 'var(--surface-hover)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.95rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    id="active-toggle"
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="active-toggle" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                     Active Account
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)} 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-hover)', border: '1px solid var(--edge)', color: 'var(--text-muted)', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <XCircle size={16} /> Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUpdating}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', border: 'none', color: '#fff', padding: '0.55rem 1.4rem', borderRadius: '8px', fontWeight: 700, cursor: isUpdating ? 'wait' : 'pointer', opacity: isUpdating ? 0.7 : 1 }}
                  >
                    <Save size={16} /> {isUpdating ? "Updating..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--accent-soft, #DBE4FE)', color: 'var(--accent, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <User size={20} />
                   </div>
                   <div>
                     <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</p>
                     <p style={{ margin: '0.1rem 0 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.fullName || "Not provided"}</p>
                   </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Mail size={20} />
                   </div>
                   <div>
                     <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                     <p style={{ margin: '0.1rem 0 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.email}</p>
                   </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Phone size={20} />
                   </div>
                   <div>
                     <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</p>
                     <p style={{ margin: '0.1rem 0 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.phoneNumber || "Not provided"}</p>
                   </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: user.active ? '#dcfce7' : '#fee2e2', color: user.active ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <ShieldCheck size={20} />
                   </div>
                   <div>
                     <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</p>
                     <span style={{ display: 'inline-block', marginTop: '0.2rem', padding: '0.2rem 0.6rem', background: user.active ? '#dcfce7' : '#fee2e2', color: user.active ? '#166534' : '#991b1b', fontSize: '0.75rem', fontWeight: 700, borderRadius: '999px', letterSpacing: '0.04em' }}>
                        {user.active ? "ACTIVE ACCOUNT" : "INACTIVE"}
                     </span>
                   </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
