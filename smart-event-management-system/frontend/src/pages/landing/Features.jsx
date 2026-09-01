import { motion } from "framer-motion";
import {
  FiSearch,
  FiAward,
  FiBell,
  FiPieChart,
  FiMoon,
  FiShield,
  FiSmartphone,
  FiUploadCloud,
  FiUsers,
} from "react-icons/fi";
import { BiQr } from "react-icons/bi";
import PublicNavbar from "../../components/landing/PublicNavbar.jsx";
import PublicFooter from "../../components/landing/PublicFooter.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";

const groups = [
  {
    title: "For Students",
    items: [
      { icon: FiSearch, text: "Search, filter and sort events by category, date and venue" },
      { icon: BiQr, text: "Instant QR-code tickets on registration, with email confirmation" },
      { icon: FiAward, text: "Certificates matched automatically to your registration number" },
      { icon: FiBell, text: "Real-time notifications for deadlines, approvals and uploads" },
      { icon: FiPieChart, text: "Personal analytics on participation and completion" },
    ],
  },
  {
    title: "For Faculty",
    items: [
      { icon: FiUploadCloud, text: "Create, edit and manage events with poster uploads and seat limits" },
      { icon: FiUsers, text: "Review, approve and manage every registration for your events" },
      { icon: FiAward, text: "Bulk-friendly certificate uploads scoped to registration numbers" },
      { icon: FiPieChart, text: "Department-wide analytics on turnout and engagement" },
    ],
  },
  {
    title: "Platform",
    items: [
      { icon: FiShield, text: "JWT authentication, hashed passwords, and role-based access control" },
      { icon: FiMoon, text: "Beautiful dark and light themes, saved to your device" },
      { icon: FiSmartphone, text: "Fully responsive across desktop, tablet and mobile" },
    ],
  },
];

export default function Features() {
  return (
    <PageTransition>
      <PublicNavbar />
      <section className="container" style={{ padding: "72px 24px 40px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(30px, 5vw, 42px)", marginBottom: 16 }}>
          Features that make events <span className="text-gradient">effortless</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", fontSize: 16 }}>
          Every tool a college needs to run events end-to-end, wrapped in an interface people actually enjoy.
        </p>
      </section>

      <section className="container" style={{ padding: "20px 24px 90px", display: "flex", flexDirection: "column", gap: 48 }}>
        {groups.map((group) => (
          <div key={group.title}>
            <h2 style={{ fontSize: 22, marginBottom: 20 }}>{group.title}</h2>
            <div className="grid-cards">
              {group.items.map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className={`glass-card glass-card-interactive float-card float-delay-${(i % 3) + 1}`}
                  style={{ padding: 22, display: "flex", gap: 14, alignItems: "flex-start", borderRadius: "18px" }}
                >
                  <div style={{ width: 42, height: 42, minWidth: 42, borderRadius: 12, background: "var(--gradient-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
                    <item.icon size={19} />
                  </div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", paddingTop: 6, lineHeight: 1.5 }}>{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <PublicFooter />
    </PageTransition>
  );
}
