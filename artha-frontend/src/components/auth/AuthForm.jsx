import styles from './AuthForm.module.css';
import GoogleLoginButton from './GoogleLoginButton';

export function InputField({ label, ...props }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.input} {...props} />
    </label>
  );
}

export default function AuthForm({
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
  return (
    <div className={styles.container}>
      <header className={styles.header}>
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
        <span className={styles.stepCount}>
          {mode === 'signup' ? 'Create account' : 'Welcome back'}
        </span>
      </header>

      <div className={styles.copyBlock}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <GoogleLoginButton onClick={onGoogleLogin} />

      <div className={styles.divider}>
        <span>or continue with email</span>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        {children}
        
        {error && <p className={styles.errorText}>{error}</p>}

        <button className={styles.submitBtn} type="submit" disabled={isLoading}>
          {isLoading ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') : (mode === 'signup' ? 'Get started' : 'Login')}
        </button>
      </form>
    </div>
  );
}
