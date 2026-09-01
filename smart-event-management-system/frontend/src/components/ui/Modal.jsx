import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export default function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        background: "rgba(10, 12, 20, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        zIndex: 99999,
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          padding: "24px 28px",
          background: "var(--bg-elevated)",
          borderRadius: "20px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.15)",
          position: "relative",
          margin: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
            position: "sticky",
            top: -24,
            paddingTop: 4,
            paddingBottom: 8,
            background: "var(--bg-elevated)",
            zIndex: 10,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{title}</h3>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
