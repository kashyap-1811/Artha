import { useEffect, useState, useMemo } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Settings, Menu, X, User, Mail, Phone, ShieldCheck, LogOut, Edit3, Save, XCircle, Sparkles,
  Star, CreditCard, BookOpen, CheckCircle2, AlertCircle
} from "lucide-react";
import { getUserById, updateUser } from "../api/users";
import AppSidebar from "../components/AppSidebar";
import styles from "./DashboardPage.module.css";




function handleLogout() {
  localStorage.removeItem("artha_jwt");
  localStorage.removeItem("artha_user_id");
  localStorage.removeItem("artha_user");
  localStorage.removeItem("artha_user_role");
  window.location.href = "/auth";
}

// Stagger variants for the container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] } },
};

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
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
      setEditPhoneNumber(data.phoneNumber || "");
      setEditBio(data.bio || "");
      setEditJobTitle(data.jobTitle || "");
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
    setSuccess("");

    // --- Pre-flight Frontend Validation ---
    const errors = [];
    if (!editFullName.trim()) errors.push("Full Name is required");
    if (editPhoneNumber.trim() && !/^\+?[\d\s-]{8,20}$/.test(editPhoneNumber.trim())) {
      errors.push("Please enter a valid phone number (e.g. +91 99999 00000)");
    }
    if (editBio.trim().length > 500) errors.push("Bio is too long (max 500 characters)");

    if (errors.length > 0) {
      setError(errors.join(". "));
      setIsUpdating(false);
      return;
    }
    // --------------------------------------

    try {
      await updateUser(userId, {
        fullName: editFullName.trim(),
        phoneNumber: editPhoneNumber.trim(),
        bio: editBio.trim(),
        jobTitle: editJobTitle.trim(),
        active: editActive
      });
      
      try {
        const cur = JSON.parse(localStorage.getItem("artha_user") || "{}");
        localStorage.setItem("artha_user", JSON.stringify({ ...cur, fullName: editFullName.trim() }));
      } catch { /* ignore */ }

      await fetchUserProfile(userId);
      setSuccess("Profile settings updated successfully.");
      setTimeout(() => setIsEditing(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to update profile. Please check your network.");
    } finally {
      setIsUpdating(false);
    }
  }

  const sideNavLinks = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Building2,       label: "Companies",  to: "/companies" },
    { icon: Star,            label: "Features",   to: "/features" },
    { icon: CreditCard,      label: "Pricing",    to: "/pricing" },
    { icon: BookOpen,        label: "Blog",       to: "/blog" },
  ];

  const membershipDays = useMemo(() => {
    if (!user?.joinedAt) return 0;
    return Math.floor((new Date() - new Date(user.joinedAt)) / (1000 * 60 * 60 * 24));
  }, [user]);


  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      <div className={styles.noiseOverlay} />
      
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <p className={styles.greetingLabel}>System / Account Settings</p>
          <h1 className={styles.greetingTitle}>
            Artha Identity <Sparkles size={20} className={styles.sparkle} style={{ color: '#3b82f6' }}/>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>


        <section className={styles.vanguardWorkspace}>
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="error"
                className={`${styles.statusBanner} ${styles.statusError}`} 
                initial={{ opacity: 0, scale: 0.95, x: 0 }} 
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: [0, -10, 10, -10, 10, 0],
                  transition: { type: "spring", stiffness: 300, damping: 20 }
                }} 
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ lineHeight: '1.6' }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> 
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {error.split(". ").map((msg, i) => (
                    <span key={i}>{msg}{i < error.split(". ").length - 1 ? '.' : ''}</span>
                  ))}
                </div>
              </motion.div>
            )}
            {success && (
              <motion.div 
                key="success"
                className={`${styles.statusBanner} ${styles.statusSuccess}`} 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <CheckCircle2 size={18} /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Identity Hero */}
          {user && (
            <motion.div className={styles.vanguardHero} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}>
              <div className={styles.vanguardHeroMesh} />
              <div className={styles.vanguardAvatar}>
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop" alt="Identity" />
              </div>
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
                  {user.fullName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <p style={{ color: '#64748b', fontWeight: 600, fontSize: '1rem' }}>{user.email}</p>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />
                  <p style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Active Member / {membershipDays} Days
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className={styles.primaryBtn} style={{ position: 'relative', zIndex: 2 }}>
                  <Edit3 size={18} /> Update Identity
                </button>
              )}
            </motion.div>
          )}

          {isEditing ? (
            <motion.div className={styles.vanguardTile} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className={styles.panelHeader} style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Global Settings</h2>
                <span className={styles.badge} style={{ background: '#eff6ff', color: '#3b82f6' }}>Draft Mode</span>
              </div>
              
              <form onSubmit={handleUpdate}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
                  {/* Personal */}
                  <div className={styles.vanguardPanelColumn}>
                    <h3 className={styles.classicSectionTitle}><User size={18} color="#3b82f6" /> Primary Information</h3>
                    <div className={styles.classicField}>
                      <label className={styles.classicFieldLabel}>Full Name</label>
                      <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className={styles.smartInput} required placeholder="John Doe" />
                    </div>
                    <div className={styles.classicField}>
                      <label className={styles.classicFieldLabel}>Contact Number</label>
                      <input value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} className={styles.smartInput} placeholder="+91 00000 00000" />
                    </div>
                  </div>

                  {/* Professional */}
                  <div className={styles.vanguardPanelColumn}>
                    <h3 className={styles.classicSectionTitle}><Building2 size={18} color="#10b981" /> Work Environment</h3>
                    <div className={styles.classicField}>
                      <label className={styles.classicFieldLabel}>Internal Job Title</label>
                      <input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} className={styles.smartInput} placeholder="e.g. System Architect" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2.5rem' }}>
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} id="vanguard-active" style={{ width: '1.25rem', height: '1.25rem', accentColor: '#3b82f6' }} />
                      <label htmlFor="vanguard-active" style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Active Profile Access</label>
                    </div>
                  </div>

                  {/* Bio */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <h3 className={styles.classicSectionTitle}><BookOpen size={18} color="#f59e0b" /> Professional Biography</h3>
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className={styles.smartInput} placeholder="Describe your contribution to the platform..." rows={4} style={{ resize: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', paddingTop: '2.5rem', borderTop: '2px solid #f8fafc' }}>
                  <button type="button" onClick={() => setIsEditing(false)} className={styles.secondaryBtn}>Cancel Changes</button>
                  <button type="submit" disabled={isUpdating} className={styles.primaryBtn}>{isUpdating ? "Processing..." : "Commit Update"}</button>
                </div>
              </form>
            </motion.div>
          ) : user && (
            <motion.div className={styles.vanguardGrid} variants={containerVariants} initial="hidden" animate="visible">
              {/* Identity Detail */}
              <motion.div className={styles.vanguardTile} style={{ gridColumn: 'span 4' }} variants={itemVariants}>
                <h3 className={styles.classicSectionTitle}><User size={18} color="#3b82f6" /> Professional Profile</h3>
                <div className={styles.classicField}><p className={styles.classicFieldLabel}>Official Name</p><p className={styles.classicFieldText}>{user.fullName}</p></div>
                <div className={styles.classicField}><p className={styles.classicFieldLabel}>System Job Title</p><p className={styles.classicFieldText}>{user.jobTitle || "Not Specified"}</p></div>
              </motion.div>

              {/* Organization List */}
              <motion.div className={styles.vanguardTile} style={{ gridColumn: 'span 4' }} variants={itemVariants}>
                <h3 className={styles.classicSectionTitle}><Building2 size={18} color="#10b981" /> Linked Organizations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {user.memberships?.length > 0 ? (
                    user.memberships.map((m) => (
                      <div key={m.companyId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{m.companyName}</span>
                        <div className={styles.roleBadge} style={{ background: m.role === 'OWNER' ? '#eff6ff' : '#f8fafc', color: m.role === 'OWNER' ? '#1d4ed8' : '#64748b' }}>{m.role}</div>
                      </div>
                    ))
                  ) : (<div className={styles.roleBadge}>Platform Independent</div>)}
                </div>
              </motion.div>

              {/* Contact Detail */}
              <motion.div className={styles.vanguardTile} style={{ gridColumn: 'span 4' }} variants={itemVariants}>
                <h3 className={styles.classicSectionTitle}><Mail size={18} color="#3b82f6" /> Network Credentials</h3>
                <div className={styles.classicField}><p className={styles.classicFieldLabel}>Primary Email</p><p className={styles.classicFieldText}>{user.email}</p></div>
                <div className={styles.classicField}><p className={styles.classicFieldLabel}>Active Phone</p><p className={styles.classicFieldText}>{user.phoneNumber || "- No Entry -"}</p></div>
              </motion.div>

              {/* Biography Detail */}
              <motion.div className={styles.vanguardTile} style={{ gridColumn: 'span 8' }} variants={itemVariants}>
                <h3 className={styles.classicSectionTitle}><BookOpen size={18} color="#f59e0b" /> Career Narrative</h3>
                <p className={styles.classicBio} style={{ maxWidth: '800px' }}>{user.bio || "No professional biography has been established for this user yet."}</p>
              </motion.div>

              {/* Security Audit */}
              <motion.div className={styles.vanguardTile} style={{ gridColumn: 'span 4' }} variants={itemVariants}>
                <h3 className={styles.classicSectionTitle}><ShieldCheck size={18} color="#6366f1" /> Security Audit</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className={styles.classicField}><p className={styles.classicFieldLabel}>Access Mode</p><span className={styles.badge} style={{ background: user.active ? '#f0fdf4' : '#fef2f2', color: user.active ? '#166534' : '#b91c1c' }}>{user.active ? "FULL SYSTEM ACCESS" : "RESTRICTED"}</span></div>
                  <button className={styles.secondaryBtn} style={{ width: '100%' }} onClick={() => alert("Verification center is currently under maintenance.")}>Initiate MFA</button>
                </div>
              </motion.div>
            </motion.div>
          )}

        </section>
    </AppSidebar>
  );
}
