import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DarkAuthForm.module.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export function DarkInput({ id, name, label, type = "text", value, onChange, placeholder, required }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword && isPasswordVisible ? "text" : type;

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.label}>
        {label} <span className={styles.requiredStar}>*</span>
      </label>
      <div className={styles.inputWrapper}>
        <input
          id={id}
          name={name || id}
          type={actualType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`${styles.input} ${isPassword ? styles.inputPadRight : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DarkAuthForm({
  mode,
  onModeChange,
  title,
  subtitle,
  error,
  isLoading,
  onSubmit,
  onGoogleLogin,
  children
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={styles.formContainer}
    >
      <motion.div variants={itemVariants} className={styles.headerControls}>
         <div className={styles.switchControls}>
          <button
            type="button"
            className={`${styles.switchBtn} ${mode === 'signup' ? styles.active : ''}`}
            onClick={() => onModeChange('signup')}
          >
            Sign up
          </button>
          <button
            type="button"
            className={`${styles.switchBtn} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => onModeChange('login')}
          >
            Login
          </button>
        </div>
      </motion.div>

      <div className={styles.flipContainer}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, rotateY: mode === 'signup' ? 90 : -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: mode === 'signup' ? -90 : 90 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={styles.animatedContent}
            style={{ transformOrigin: "center" }}
          >
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          
          <div className={styles.googleSection}>
            <button 
              className={styles.googleBtn}
              onClick={onGoogleLogin}
              type="button"
            >
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
          
          <div className={styles.divider}>
            <div className={styles.line}></div>
            <span className={styles.orText}>or</span>
            <div className={styles.line}></div>
          </div>
          
          <form className={styles.form} onSubmit={onSubmit}>
            {children}
            
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.errorText}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={styles.submitWrapper}
            >
              <button
                type="submit"
                disabled={isLoading}
                className={`${styles.submitBtn} ${isHovered ? styles.submitBtnHover : ''}`}
              >
                 <span className={styles.submitInner}>
                  {isLoading ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') : (mode === 'signup' ? 'Get started' : 'Sign in')}
                  {!isLoading && <ArrowRight className={styles.btnArrow} size={18} />}
                </span>
                <AnimatePresence>
                  {isHovered && !isLoading && (
                    <motion.span
                      initial={{ left: "-100%" }}
                      animate={{ left: "100%" }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className={styles.shimmer}
                    />
                  )}
                </AnimatePresence>
              </button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
