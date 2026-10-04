import { AWARD_STANDINGS } from "./certificateConstants.js";

export default function AwardStandingSelector({
  value,
  onChange,
  onCustomChange,
  showCustomInput = true,
}) {
  return (
    <div className="form-group">
      <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Position / Award Standing</span>
        <span style={{ fontSize: 11.5, color: "#8b5cf6", fontWeight: 500 }}>Select 1 standing</span>
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {AWARD_STANDINGS.map((preset) => {
          const isSelected = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.18s ease-in-out",
                border: isSelected
                  ? "1.5px solid #8b5cf6"
                  : "1px solid var(--border-color, rgba(255,255,255,0.08))",
                background: isSelected
                  ? "rgba(139, 92, 246, 0.22)"
                  : "var(--bg-elevated, rgba(255,255,255,0.03))",
                color: isSelected ? "var(--text-primary, #ffffff)" : "var(--text-secondary, #94a3b8)",
                boxShadow: isSelected ? "0 0 12px rgba(139, 92, 246, 0.25)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{preset.label}</span>
              {isSelected && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#8b5cf6",
                    boxShadow: "0 0 6px #8b5cf6",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {showCustomInput && (
        <input
          className="form-input"
          value={value || ""}
          onChange={(e) => (onCustomChange ? onCustomChange(e.target.value) : onChange(e.target.value))}
          placeholder="Or enter custom standing (e.g. 1st Place, Best UI Designer, Consolation Prize)"
          required
          style={{ fontSize: 13 }}
        />
      )}
    </div>
  );
}
