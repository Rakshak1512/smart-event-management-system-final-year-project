import { FiUser, FiCheckCircle } from "react-icons/fi";

export default function StudentDetailsCard({ student }) {
  if (!student) return null;

  return (
    <div
      className="glass-card"
      style={{
        background: "var(--bg-glass, rgba(30, 41, 59, 0.7))",
        padding: "14px 18px",
        borderRadius: "14px",
        marginBottom: 18,
        border: "1px solid var(--border-color)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "var(--gradient-primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
          }}
        >
          <FiUser size={18} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{student.name}</span>
            <FiCheckCircle size={14} color="#10b981" title="Verified Student Record" />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{student.email}</span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          fontSize: 13,
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block", marginBottom: 2 }}>
            Student Name
          </span>
          <strong style={{ color: "var(--text-primary)", fontSize: 13 }}>{student.name}</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block", marginBottom: 2 }}>
            Register Number
          </span>
          <strong
            style={{
              fontFamily: "monospace",
              color: "#a5b4fc",
              background: "rgba(139, 92, 246, 0.12)",
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 12.5,
              display: "inline-block",
            }}
          >
            {student.registration_number}
          </strong>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block", marginBottom: 2 }}>
            Branch / Department
          </span>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
            {student.department || "General"}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: 11.5, display: "block", marginBottom: 2 }}>
            Class / Semester
          </span>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
            {student.semester ? `Semester ${student.semester}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
