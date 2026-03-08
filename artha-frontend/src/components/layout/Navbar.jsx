import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Menu, X } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check auth status based on our localStorage setup
  useEffect(() => {
    const token = localStorage.getItem('artha_jwt');
    setIsAuthenticated(!!token);
  }, [location.pathname]); // Re-check on route changes

  // Handle scroll to add a stronger shadow/border if needed
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('artha_jwt');
    localStorage.removeItem('artha_user_id');
    localStorage.removeItem('artha_user');
    setIsAuthenticated(false);
    setProfileDropdownOpen(false);
    navigate('/auth');
  };

  const navLinks = [
    { name: 'Features', path: '/features' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Blog', path: '/blog' },
  ];

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.navbarContainer}>
        {/* Left Side: Logo */}
        <div className={styles.logoSection}>
          <NavLink to="/" className={styles.brandLink}>
            <div className={styles.logoCircle}>A</div>
            <span className={styles.brandName}>Artha</span>
          </NavLink>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className={styles.desktopNav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) => 
                isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Right Side: Auth / Profile */}
        <div className={styles.rightSection}>
          {isAuthenticated ? (
            <div className={styles.authGroup}>
              <button type="button" className={styles.iconButton} aria-label="Notifications">
                <Bell size={20} />
              </button>
              
              <div className={styles.profileDropdownContainer}>
                <button 
                  type="button" 
                  className={styles.avatarButton}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-label="User menu"
                  aria-expanded={profileDropdownOpen}
                >
                  <User size={20} />
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={styles.dropdownMenu}
                    >
                      <button type="button" onClick={() => { setProfileDropdownOpen(false); navigate('/dashboard'); }} className={styles.dropdownItem}>Dashboard</button>
                      <button type="button" onClick={() => { setProfileDropdownOpen(false); navigate('/profile'); }} className={styles.dropdownItem}>Settings</button>
                      <button type="button" onClick={() => setProfileDropdownOpen(false)} className={styles.dropdownItem}>Billing</button>
                      <div className={styles.dropdownDivider} />
                      <button type="button" onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutItem}`}>Logout</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className={styles.guestGroup}>
              <button 
                type="button" 
                className={styles.signInBtn}
                onClick={() => navigate('/auth')}
              >
                Sign In
              </button>
              <button 
                type="button" 
                className={styles.getStartedBtn}
                onClick={() => navigate('/auth', { state: { defaultMode: 'signup' } })}
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button 
            type="button" 
            className={styles.mobileMenuToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={styles.mobileMenu}
          >
            <nav className={styles.mobileNav}>
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </NavLink>
              ))}
              {!isAuthenticated && (
                <div className={styles.mobileGuestActions}>
                  <button type="button" className={styles.mobileSignIn} onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
                    Sign In
                  </button>
                  <button type="button" className={styles.mobileGetStarted} onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}>
                    Get Started
                  </button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
