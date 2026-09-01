export function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div className="skeleton" style={{ height: 140, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 16, width: "70%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 12, width: "40%" }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      <td colSpan={100}>
        <div className="skeleton" style={{ height: 40 }} />
      </td>
    </tr>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid-cards">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: "2.5px solid rgba(139,92,246,0.25)",
        borderTopColor: "#8b5cf6",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

export default function PageLoader() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "var(--text-secondary)",
      }}
    >
      <Spinner size={36} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Loading EventSphere...</span>
    </div>
  );
}
