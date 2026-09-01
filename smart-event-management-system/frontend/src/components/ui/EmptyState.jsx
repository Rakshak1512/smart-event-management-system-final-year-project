import { FiInbox } from "react-icons/fi";

export default function EmptyState({ icon, title = "Nothing here yet", message = "", action = null }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "56px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--gradient-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8b5cf6",
          fontSize: 28,
        }}
      >
        {icon || <FiInbox />}
      </div>
      <h3 style={{ fontSize: 17 }}>{title}</h3>
      {message && <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 360 }}>{message}</p>}
      {action}
    </div>
  );
}
