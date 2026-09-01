import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function useCountUp(target = 0, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export default function StatCard({ icon, label, value, accent = "#8b5cf6", suffix = "" }) {
  const count = useCountUp(Number(value) || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -4 }}
      className="glass-card"
      style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          minWidth: 52,
          borderRadius: 16,
          background: `${accent}22`,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-heading)" }}>
          {count}
          {suffix}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</div>
      </div>
    </motion.div>
  );
}
