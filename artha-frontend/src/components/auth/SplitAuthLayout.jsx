import styles from './SplitAuthLayout.module.css';
import { motion } from 'framer-motion';

export default function SplitAuthLayout({ children, LeftVisualComponent }) {
  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={styles.card}
      >
        {/* Left side - Visual/Chart */}
        <div className={styles.leftPane}>
          <div className={styles.visualContainer}>
            {LeftVisualComponent}
            
            {/* Overlay Text */}
            <div className={styles.overlayText}>
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className={styles.iconWrapper}
              >
                <img src="/artha-logo.png" alt="Artha Logo" className={styles.brandLogo} />
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className={styles.subtitle}
              >
                Sign in to access your financial dashboard, track budgets, and monitor expenses.
              </motion.p>
            </div>
          </div>
        </div>
        
        {/* Right side - Sign In Form */}
        <div className={styles.rightPane}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
