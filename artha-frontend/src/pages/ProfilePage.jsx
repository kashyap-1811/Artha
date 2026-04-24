import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, User, Mail, Phone, ShieldCheck, LogOut, Edit3, Sparkles,
  BookOpen, CheckCircle2, AlertCircle
} from "lucide-react";
import { getUserById, updateUser } from "../api/users";
import AppSidebar from "../components/AppSidebar";
import styles from "./DashboardPage.module.css";
import profStyles from "./ProfilePage.module.css";

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
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } },
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

    const errors = [];
    if (!editFullName.trim()) errors.push("Full Name is required");
    if (editPhoneNumber.trim() && !/^\+?[\d\s-]{8,20}$/.test(editPhoneNumber.trim())) {
      errors.push("Invalid phone format");
    }

    if (errors.length > 0) {
      setError(errors.join(". "));
      setIsUpdating(false);
      return;
    }

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
      setSuccess("Profile updated.");
      setTimeout(() => setIsEditing(false), 1500);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  }

  const membershipDays = useMemo(() => {
    if (!user?.joinedAt) return 0;
    return Math.floor((new Date() - new Date(user.joinedAt)) / (1000 * 60 * 60 * 24));
  }, [user]);

  return (
    <AppSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      <div className={profStyles.pageContainer}>
        
        {/* Unified Top Bar (Title Only) */}
        <div className={profStyles.unifiedTopBar}>
          <div className={styles.topBarLeft}>
            <p className={styles.metadataLabel}>System Identity</p>
            <h1 className={styles.greetingTitle} style={{ fontSize: 'clamp(1.5rem, 6vw, 2.2rem)' }}>
              Profile Settings <Sparkles size={22} className={styles.sparkle} />
            </h1>
          </div>
        </div>

        <section style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="error" className={`${styles.statusBanner} ${styles.statusError}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AlertCircle size={18} /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div key="success" className={`${styles.statusBanner} ${styles.statusSuccess}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CheckCircle2 size={18} /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Identity Hero */}
          {user && (
            <motion.div className={profStyles.identityHero} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className={profStyles.heroMesh} />
              <div className={profStyles.avatarContainer}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=3b82f6&color=fff&size=200`} className={profStyles.avatarImg} alt="Identity" />
              </div>
              <div className={profStyles.heroContent}>
                <h2 className={profStyles.userName}>{user.fullName}</h2>
                <div className={profStyles.userMeta}>
                  <p style={{ color: '#64748b', fontWeight: 600 }}>{user.email}</p>
                  <span className={profStyles.badge} style={{ background: '#3b82f615', color: '#3b82f6' }}>
                    Active Member · {membershipDays}D
                  </span>
                </div>
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className={styles.btnPrimary}>
                  <Edit3 size={18} /> Update Identity
                </button>
              )}
            </motion.div>
          )}

          {isEditing ? (
            <motion.div className={profStyles.editFormTile} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Edit Information</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Update your personal and work details</p>
              </div>
              
              <form onSubmit={handleUpdate}>
                <div className={profStyles.formGrid}>
                  <div className={profStyles.inputGroup}>
                    <label className={profStyles.inputLabel}>Full Name</label>
                    <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className={profStyles.premiumInput} placeholder="Full Name" required />
                  </div>
                  <div className={profStyles.inputGroup}>
                    <label className={profStyles.inputLabel}>Phone Number</label>
                    <input value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} className={profStyles.premiumInput} placeholder="+91 00000 00000" />
                  </div>
                  <div className={profStyles.inputGroup}>
                    <label className={profStyles.inputLabel}>Job Title</label>
                    <input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} className={profStyles.premiumInput} placeholder="e.g. Finance Head" />
                  </div>
                  <div className={profStyles.checkboxGroup}>
                    <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', accentColor: '#3b82f6' }} id="active-check" />
                    <label htmlFor="active-check" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Active Access</label>
                  </div>
                  <div className={profStyles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                    <label className={profStyles.inputLabel}>Professional Bio</label>
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className={profStyles.premiumInput} rows={3} style={{ resize: 'none' }} placeholder="Tell us about your role..." />
                  </div>
                </div>

                <div className={profStyles.actionRow}>
                  <button type="button" onClick={() => setIsEditing(false)} className={styles.btnSecondary}>Discard</button>
                  <button type="submit" disabled={isUpdating} className={styles.btnGreen}>{isUpdating ? "Processing..." : "Save Changes"}</button>
                </div>
              </form>
            </motion.div>
          ) : user && (
            <>
              <motion.div className={profStyles.profileGrid} variants={containerVariants} initial="hidden" animate="visible">
                <motion.div className={`${profStyles.infoTile} ${profStyles.span4}`} variants={itemVariants}>
                  <h3 className={profStyles.sectionTitle}><User size={16} color="#3b82f6" /> Profile</h3>
                  <div className={profStyles.field}><span className={profStyles.fieldLabel}>Name</span><p className={profStyles.fieldText}>{user.fullName}</p></div>
                  <div className={profStyles.field}><span className={profStyles.fieldLabel}>Role</span><p className={profStyles.fieldText}>{user.jobTitle || "User"}</p></div>
                </motion.div>

                <motion.div className={`${profStyles.infoTile} ${profStyles.span4}`} variants={itemVariants}>
                  <h3 className={profStyles.sectionTitle}><Building2 size={16} color="#10b981" /> Organizations</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {user.memberships?.length > 0 ? user.memberships.map((m) => (
                      <div key={m.companyId} className={profStyles.roleItem}>
                        <span className={profStyles.membershipLabel}>{m.companyName}</span>
                        <span className={profStyles.badge} style={{ background: '#3b82f610', color: '#3b82f6' }}>{m.role}</span>
                      </div>
                    )) : <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No linked orgs</div>}
                  </div>
                </motion.div>

                <motion.div className={`${profStyles.infoTile} ${profStyles.span4}`} variants={itemVariants}>
                  <h3 className={profStyles.sectionTitle}><Mail size={16} color="#4f46e5" /> Contact</h3>
                  <div className={profStyles.field}><span className={profStyles.fieldLabel}>Email</span><p className={profStyles.fieldText} style={{ fontSize: '0.9rem' }}>{user.email}</p></div>
                  <div className={profStyles.field}><span className={profStyles.fieldLabel}>Phone</span><p className={profStyles.fieldText}>{user.phoneNumber || "Not set"}</p></div>
                </motion.div>

                <motion.div className={`${profStyles.infoTile} ${profStyles.span8}`} variants={itemVariants}>
                  <h3 className={profStyles.sectionTitle}><BookOpen size={16} color="#f59e0b" /> Biography</h3>
                  <p className={profStyles.bioText}>{user.bio || "No bio established yet."}</p>
                </motion.div>

                <motion.div className={`${profStyles.infoTile} ${profStyles.span4}`} variants={itemVariants}>
                  <h3 className={profStyles.sectionTitle}><ShieldCheck size={16} color="#6366f1" /> System</h3>
                  <div className={profStyles.field}>
                    <span className={profStyles.fieldLabel}>Account Status</span>
                    <span className={profStyles.badge} style={{ background: user.active ? '#f0fdf4' : '#fef2f2', color: user.active ? '#166534' : '#b91c1c' }}>
                      {user.active ? "FULL ACCESS" : "RESTRICTED"}
                    </span>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div 
                className={profStyles.span12} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.5 }}
                style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}
              >
                <button 
                  onClick={handleLogout} 
                  className={profStyles.logoutButton}
                >
                  <LogOut size={20} strokeWidth={2.5} /> 
                  <span>Logout from Artha</span>
                </button>
              </motion.div>
            </>
          )}
        </section>
      </div>
    </AppSidebar>
  );
}
