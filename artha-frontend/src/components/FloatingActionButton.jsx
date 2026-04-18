import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./FloatingActionButton.module.css";

export default function FloatingActionButton({ onClick, icon: Icon = Plus, label = "Add" }) {
  return (
    <motion.button
      className={styles.fab}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      aria-label={label}
    >
      <Icon size={24} strokeWidth={2.5} />
    </motion.button>
  );
}
