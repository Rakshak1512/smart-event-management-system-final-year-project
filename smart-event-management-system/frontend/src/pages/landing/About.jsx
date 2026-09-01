import { motion } from "framer-motion";
import { FiTarget, FiHeart, FiTrendingUp, FiShield, FiCpu, FiUsers, FiAward } from "react-icons/fi";
import PublicNavbar from "../../components/landing/PublicNavbar.jsx";
import PublicFooter from "../../components/landing/PublicFooter.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";

const values = [
  {
    icon: FiTarget,
    title: "Purpose-built Architecture",
    text: "Designed specifically around how campus events operate — dynamic seat allocations, department quotas, instant QR tickets, and certified attendance.",
  },
  {
    icon: FiHeart,
    title: "Student-First Experience",
    text: "Every workflow from 1-click registration to downloading signed completion certificates is designed to take seconds with zero friction.",
  },
  {
    icon: FiTrendingUp,
    title: "Real-Time Campus Analytics",
    text: "Faculty and administrators get instant analytics on registration numbers, attendance conversion, and certificate issuance.",
  },
  {
    icon: FiShield,
    title: "Secure & Cloud-Native",
    text: "Built on Google Cloud Firestore with granular role-based security rules protecting student data, registration logs, and certificates.",
  },
];

const stats = [
  { number: "100%", label: "Cloud Firestore Real-time Sync" },
  { number: "< 1s", label: "Instant Ticket Generation" },
  { number: "6-Digit", label: "Encrypted OTP Verification" },
  { number: "Zero", label: "Manual Spreadsheet Hassle" },
];

export default function About() {
  return (
    <PageTransition>
      <PublicNavbar />

      {/* Hero Section */}
      <section style={{ position: "relative", overflow: "hidden", padding: "80px 0 40px" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 540,
            height: 540,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            opacity: 0.14,
            filter: "blur(70px)",
            pointerEvents: "none",
          }}
        />

        <div className="container" style={{ textAlign: "center" }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="badge badge-info"
            style={{ marginBottom: 18, padding: "6px 16px", fontSize: "13px" }}
          >
            🌟 About EventSphere
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: "clamp(32px, 5vw, 46px)", marginBottom: 18, lineHeight: 1.2 }}
          >
            Built to transform the <span className="text-gradient">campus event experience.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              color: "var(--text-secondary)",
              maxWidth: 680,
              margin: "0 auto",
              fontSize: 16.5,
              lineHeight: 1.65,
            }}
          >
            EventSphere was created to replace scattered spreadsheets, manual paper forms, and lost QR codes
            with a unified, state-of-the-art event management ecosystem built for students and educators.
          </motion.p>
        </div>
      </section>

      {/* Mission & Platform Highlights */}
      <section className="container" style={{ padding: "40px 24px 60px" }}>
        <div
          className="about-split-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card float-card"
            style={{
              padding: "36px 32px",
              background: "var(--bg-glass)",
              borderRadius: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: "var(--gradient-soft)",
                color: "#8b5cf6",
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <FiCpu size={16} /> Modern Technology Stack
            </div>
            <h3 style={{ fontSize: 24, marginBottom: 14 }}>Cloud-Powered Performance</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 14.5, marginBottom: 20 }}>
              Backed by Google Cloud Firestore, Python FastAPI, and a reactive glassmorphic frontend, EventSphere delivers
              sub-millisecond data sync, cryptographic JWT authentication, and zero downtime.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "12px 14px",
                    background: "var(--bg-elevated)",
                    borderRadius: "14px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#8b5cf6" }}>{s.number}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <h2 style={{ fontSize: 28, lineHeight: 1.3 }}>
              Why we engineered <span className="text-gradient">EventSphere</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 15 }}>
              Campus fests, technical hackathons, guest seminars, and workshops represent some of the most impactful
              experiences in academic life. Yet organizing them often relies on chaotic WhatsApp groups and manual email blasts.
            </p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 15 }}>
              EventSphere unifies every step — discovery, 6-digit OTP verification, seat reservations, digital QR check-in slips,
              and authenticated certificate downloads — giving campus communities a modern experience they love.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="container" style={{ padding: "30px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>Core Pillars</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>The design principles behind every feature in EventSphere</p>
        </div>

        <div className="grid-cards-2">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`glass-card glass-card-interactive float-card float-delay-${(i % 3) + 1}`}
              style={{ padding: 28, borderRadius: "20px" }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "var(--gradient-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#8b5cf6",
                  marginBottom: 16,
                }}
              >
                <v.icon size={22} />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 10, fontWeight: 700 }}>{v.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{v.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <PublicFooter />

      <style>{`
        @media (max-width: 900px) {
          .about-split-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PageTransition>
  );
}
