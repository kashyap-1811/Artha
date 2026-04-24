import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import styles from "../pages/DashboardPage.module.css";

// ── Animated Counter Hook ──
function useCountUp(end, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof end !== 'number' || isNaN(end) || end === 0) { setCount(end || 0); return; }
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(end * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration]);

  return count;
}

export function AnimatedValue({ value, prefix = "", suffix = "", decimals }) {
  const strVal = String(value || 0).replace(/[₹,]/g, '');
  const hasDecimals = strVal.includes('.');
  const detectedDecimals = hasDecimals ? strVal.split('.')[1].length : 0;
  const decimalCount = decimals !== undefined ? decimals : (prefix === '₹' ? 2 : detectedDecimals);
  const numericVal = parseFloat(strVal);

  const animated = useCountUp(isNaN(numericVal) ? 0 : numericVal);

  if (isNaN(numericVal)) return <>{value}</>;

  return (
    <>
      {prefix}
      {animated.toLocaleString(undefined, { 
        minimumFractionDigits: decimalCount, 
        maximumFractionDigits: decimalCount 
      })}
      {suffix}
    </>
  );
}

export default function StatCard({ icon: Icon, label, value, colorClass, badge, trend, trendLabel }) {
  const isCurrency = typeof value === 'string' && value.startsWith('₹');
  const isPlainNumber = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));

  return (
    <motion.div
      className={`${styles.statCard} ${styles[colorClass]}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
    >
      <div className={styles.statCardGlass} />
      <svg className={styles.cardWave} viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,30 C40,10 80,50 120,30 C160,10 180,40 200,25 L200,60 L0,60 Z" />
      </svg>
      <div className={styles.statCardTop}>
        <div className={styles.statIconWrap}><Icon size={20} /></div>
        <div className={styles.badgeWrap}>
          {badge && <span className={styles.cardBadge}>{badge}</span>}
          {trendLabel && <span className={styles.trendLabelBadge}>{trendLabel}</span>}
        </div>
      </div>
      <div className={styles.statCardBody}>
        <p className={styles.statLabel}>{label}</p>
        <div className={styles.statValueRow}>
          <h3 className={styles.statValue}>
            {isCurrency ? (
              <AnimatedValue value={value} prefix="₹" />
            ) : isPlainNumber ? (
              <AnimatedValue value={value} />
            ) : (
              value
            )}
          </h3>
          {trend !== null && trend !== undefined && (
            <span className={`${styles.statTrend} ${trend > 0 ? styles.trendUp : styles.trendDown}`}>
              {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(trend)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
