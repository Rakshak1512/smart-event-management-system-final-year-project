import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiAward, FiDownload, FiEye, FiX, FiFileText, FiSearch } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { certificateService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";

export default function StudentCertificates() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Preview Modal State
  const [previewCert, setPreviewCert] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [isPdf, setIsPdf] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    certificateService
      .my()
      .then(({ data }) => setCerts(data || []))
      .catch((err) => {
        console.error("Failed to load certificates:", err);
        toast.error("Could not load certificates");
      })
      .finally(() => setLoading(false));
  }, []);

  // Cleanup object URL when modal closes or certificate changes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const handleOpenPreview = async (cert) => {
    setPreviewCert(cert);
    setPreviewLoading(true);
    setPreviewError(null);

    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      // Authenticated blob fetch with Authorization Bearer header
      const blob = await certificateService.downloadBlob(cert.id);
      const isImage = blob.type && blob.type.startsWith("image/");
      setIsPdf(!isImage);
      const typedBlob = isImage ? blob : new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(typedBlob);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error("Certificate preview error:", err);
      let detailMsg = "Unable to preview this certificate. Please try again or download directly.";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          detailMsg = err.response.data;
        } else if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            detailMsg = parsed.detail || detailMsg;
          } catch {
            // keep fallback
          }
        } else if (err.response.data.detail) {
          detailMsg = err.response.data.detail;
        }
      }
      setPreviewError(detailMsg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    setPreviewCert(null);
    setPreviewLoading(false);
    setPreviewError(null);
  };

  const handleDownload = async (cert) => {
    setDownloadingId(cert.id);
    try {
      await certificateService.downloadFile(cert.id, cert.title);
      toast.success("Certificate downloaded successfully!");
    } catch (err) {
      console.error("Certificate download error:", err);
      let detailMsg = "Failed to download certificate";
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          detailMsg = err.response.data;
        } else if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const parsed = JSON.parse(text);
            detailMsg = parsed.detail || detailMsg;
          } catch {
            // keep fallback
          }
        } else if (err.response.data.detail) {
          detailMsg = err.response.data.detail;
        }
      } else if (err.message) {
        detailMsg = err.message;
      }
      toast.error(detailMsg);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredCerts = certs.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const title = (c.title || "").toLowerCase();
    const idStr = `esp-${String(c.id).padStart(6, "0")}`.toLowerCase();
    const numId = String(c.id);
    const dateStr = formatDate(c.issue_date || "").toLowerCase();

    return title.includes(q) || idStr.includes(q) || numId.includes(q) || dateStr.includes(q);
  });

  return (
    <PageTransition>
      <div className="section-head" style={{ flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 className="page-title">My Certificates</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Certificates issued by faculty and matched to your registration number.
          </p>
        </div>

        {certs.length > 0 && (
          <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
            <input
              className="form-input"
              style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FiSearch
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 2,
                }}
                title="Clear search"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonGrid count={4} />
      ) : certs.length === 0 ? (
        <EmptyState
          icon={<FiAward />}
          title="No certificates yet"
          message="Once faculty upload a completion or participation certificate under your registration number, it will appear here."
        />
      ) : filteredCerts.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center", borderRadius: 20 }}>
          <p style={{ color: "var(--text-secondary)", margin: "0 0 12px" }}>
            No certificates matched "<strong>{searchQuery}</strong>".
          </p>
          <button className="btn btn-outline btn-sm" onClick={() => setSearchQuery("")}>
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {filteredCerts.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card glass-card-interactive float-card float-delay-${(i % 3) + 1}`}
              style={{
                padding: 22,
                display: "flex",
                flexDirection: "column",
                borderRadius: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "var(--gradient-soft)",
                    color: "#8b5cf6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FiAward size={24} />
                </div>
                {c.award_standing && (
                  <span className="badge badge-primary" style={{ fontWeight: 700, fontSize: 11.5 }}>
                    {c.award_standing}
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
                {c.title}
              </h3>

              {c.event_title && (
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 4 }}>
                  Event: <strong style={{ color: "var(--text-primary)" }}>{c.event_title}</strong>
                </div>
              )}

              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 18 }}>
                Issued {formatDate(c.uploaded_at)}
              </p>

              <div style={{ marginTop: "auto", display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1, gap: 6 }}
                  onClick={() => handleOpenPreview(c)}
                >
                  <FiEye size={14} /> Preview
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, gap: 6 }}
                  disabled={downloadingId === c.id}
                  onClick={() => handleDownload(c)}
                >
                  <FiDownload size={14} /> {downloadingId === c.id ? "Downloading..." : "Download"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Premium Glassmorphic Certificate Preview Modal */}
      <AnimatePresence>
        {previewCert && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              background: "rgba(3, 7, 18, 0.75)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            onClick={handleClosePreview}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="glass-card"
              style={{
                width: "100%",
                maxWidth: 820,
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                borderRadius: "24px",
                background: "var(--bg-elevated)",
                border: "1.5px solid rgba(139, 92, 246, 0.35)",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45), 0 0 30px rgba(139, 92, 246, 0.2)",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 24px",
                  borderBottom: "1px solid var(--border-color)",
                  background: "var(--bg-glass)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--gradient-soft)",
                      color: "#8b5cf6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FiFileText size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                      {previewCert.title}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                      Certificate Preview
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="icon-btn"
                  aria-label="Close modal"
                  style={{ width: 34, height: 34, borderRadius: "50%" }}
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* Modal Body / Viewer */}
              <div
                style={{
                  flex: 1,
                  minHeight: 380,
                  maxHeight: "68vh",
                  overflow: "hidden",
                  position: "relative",
                  background: "#0d111d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {previewLoading && (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        border: "3px solid rgba(139, 92, 246, 0.2)",
                        borderTopColor: "#8b5cf6",
                        animation: "spin 0.9s linear infinite",
                        margin: "0 auto 16px",
                      }}
                    />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>
                      Loading certificate preview securely...
                    </p>
                  </div>
                )}

                {!previewLoading && previewError && (
                  <div style={{ textAlign: "center", padding: 32, maxWidth: 440 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "rgba(220, 38, 38, 0.15)",
                        color: "var(--danger)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                      }}
                    >
                      <FiAward size={24} />
                    </div>
                    <h4 style={{ fontSize: 16, marginBottom: 8, color: "var(--text-primary)" }}>
                      Unable to display preview
                    </h4>
                    <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20 }}>
                      {previewError}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownload(previewCert)}
                    >
                      <FiDownload size={14} /> Download Certificate Directly
                    </button>
                  </div>
                )}

                {!previewLoading && !previewError && previewBlobUrl && (
                  <div style={{ width: "100%", height: "100%", minHeight: 480, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {isPdf ? (
                      <object
                        data={previewBlobUrl}
                        type="application/pdf"
                        style={{
                          width: "100%",
                          height: "65vh",
                          minHeight: 480,
                          borderRadius: 8,
                          border: "none",
                        }}
                      >
                        <iframe
                          src={previewBlobUrl}
                          title="Certificate PDF Viewer"
                          style={{
                            width: "100%",
                            height: "65vh",
                            minHeight: 480,
                            border: "none",
                            borderRadius: 8,
                          }}
                        />
                      </object>
                    ) : (
                      <img
                        src={previewBlobUrl}
                        alt="Certificate Preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "65vh",
                          objectFit: "contain",
                          padding: 16,
                          borderRadius: 8,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12,
                  padding: "16px 24px",
                  borderTop: "1px solid var(--border-color)",
                  background: "var(--bg-glass)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleClosePreview}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6 }}
                  disabled={downloadingId === previewCert.id}
                  onClick={() => handleDownload(previewCert)}
                >
                  <FiDownload size={14} />
                  {downloadingId === previewCert.id ? "Downloading..." : "Download Certificate"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
