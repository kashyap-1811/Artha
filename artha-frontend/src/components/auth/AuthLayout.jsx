import styles from './AuthLayout.module.css';

export default function AuthLayout({ children }) {
  return (
    <main className={styles.layout}>
      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.logoMark}>
            <div className={styles.dots}>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
            </div>
            Artha
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
