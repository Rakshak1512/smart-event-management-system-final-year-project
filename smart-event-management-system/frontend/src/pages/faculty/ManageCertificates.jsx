import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { FiUploadCloud, FiSearch, FiEdit2, FiTrash2, FiDownload, FiUser, FiEye, FiX, FiFileText, FiAward, FiCheckCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../components/ui/Modal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { SkeletonGrid } from "../../components/ui/Loader.jsx";
import PageTransition from "../../components/common/PageTransition.jsx";
import { certificateService, eventService } from "../../api/services.js";
import { formatDate } from "../../utils/format.js";
import AwardStandingSelector from "../../components/certificate/AwardStandingSelector.jsx";
import StudentDetailsCard from "../../components/certificate/StudentDetailsCard.jsx";
import {
  getSuggestedCertificateTitle,
  getSuggestedAchievementText,
} from "../../components/certificate/certificateConstants.js";

const initialFormState = {
  registration_number: "",
  award_standing: "1st Place",
  title: "Winner Certificate",
  achievement_wording: "First Place",
  score_or_remarks: "",
  event_id: "",
};

export default function ManageCertificates() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fullscreen Preview Modal State
  const [previewCert, setPreviewCert] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [isPdf, setIsPdf] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // Upload / Issue Modal State
  const [form, setForm] = useState(initialFormState);
  const [student, setStudent] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [certMode, setCertMode] = useState("auto"); // "auto" | "upload"
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalPreviewBlobUrl, setModalPreviewBlobUrl] = useState(null);
  const [modalPreviewLoading, setModalPreviewLoading] = useState(false);
  const [userEditedTitle, setUserEditedTitle] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = () => {
    setLoading(true);
    certificateService
      .facultyUploaded()
      .then(({ data }) => setCerts(data || []))
      .catch((err) => {
        console.error("Failed to load certificates:", err);
        toast.error("Could not load certificates");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    eventService.list({ page: 1, page_size: 50 }).then(({ data }) => setEvents(data.items || [])).catch(() => {});
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
      if (modalPreviewBlobUrl) {
        window.URL.revokeObjectURL(modalPreviewBlobUrl);
      }
    };
  }, [previewBlobUrl, modalPreviewBlobUrl]);

  const openUpload = () => {
    setForm(initialFormState);
    setCertMode("auto");
    setStudent(null);
    setFile(null);
    setUserEditedTitle(false);
    if (modalPreviewBlobUrl) {
      window.URL.revokeObjectURL(modalPreviewBlobUrl);
      setModalPreviewBlobUrl(null);
    }
    setUploadOpen(true);
  };

  const lookupStudent = async () => {
    if (!form.registration_number.trim()) return;
    setLookupLoading(true);
    setStudent(null);
    try {
      const { data } = await certificateService.studentDetails(form.registration_number.trim());
      setStudent(data);
      if (data.registered_events && data.registered_events.length > 0 && !form.event_id) {
        setForm((f) => ({ ...f, event_id: String(data.registered_events[0].id) }));
      }
      toast.success(`Found student: ${data.name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Student not found");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleStandingChange = (newStanding) => {
    const suggestedTitle = getSuggestedCertificateTitle(newStanding);
    const suggestedAchievement = getSuggestedAchievementText(newStanding);
    setForm((f) => ({
      ...f,
      award_standing: newStanding,
      achievement_wording: suggestedAchievement,
      title: userEditedTitle ? f.title : suggestedTitle,
    }));
  };

  const handleGenerateModalPreview = async () => {
    if (!student) return toast.error("Please look up a student first");
    setModalPreviewLoading(true);
    try {
      if (modalPreviewBlobUrl) {
        window.URL.revokeObjectURL(modalPreviewBlobUrl);
        setModalPreviewBlobUrl(null);
      }
      if (certMode === "auto") {
        const selectedEv = events.find((e) => String(e.id) === String(form.event_id));
        const blob = await certificateService.generatePreview({
          registration_number: form.registration_number.trim(),
          student_name: student.name,
          event_id: form.event_id ? parseInt(form.event_id) : null,
          event_title: selectedEv?.title || "Campus Event",
          position: form.award_standing,
          award_standing: form.award_standing,
          achievement_wording: form.achievement_wording,
          score_or_remarks: form.score_or_remarks,
          title: form.title,
          department: student.department,
          semester: student.semester ? String(student.semester) : "",
        });
        const url = window.URL.createObjectURL(blob);
        setModalPreviewBlobUrl(url);
      } else {
        if (!file) return toast.error("Attach a PDF file to preview");
        const url = window.URL.createObjectURL(file);
        setModalPreviewBlobUrl(url);
      }
    } catch (err) {
      console.error("Preview error:", err);
      toast.error("Could not generate certificate preview.");
    } finally {
      setModalPreviewLoading(false);
    }
  };

  const handleSubmitCertificate = async (e) => {
    e.preventDefault();
    if (!student) return toast.error("Look up a valid registration number first");
    if (!form.title.trim()) return toast.error("Certificate title is required");
    if (certMode === "upload" && !file) return toast.error("Attach the certificate PDF");

    setSaving(true);
    try {
      const selectedEv = events.find((e) => String(e.id) === String(form.event_id));
      let emailRecipient = student.email;

      if (certMode === "auto") {
        const { data } = await certificateService.autoGenerate({
          registration_number: form.registration_number.trim(),
          event_id: form.event_id ? parseInt(form.event_id) : null,
          event_title: selectedEv?.title || "",
          position: form.award_standing,
          award_standing: form.award_standing,
          achievement_wording: form.achievement_wording,
          score_or_remarks: form.score_or_remarks,
          title: form.title.trim(),
          department: student.department,
          semester: student.semester ? String(student.semester) : "",
        });
        if (data?.student_email) emailRecipient = data.student_email;
      } else {
        const fd = new FormData();
        fd.append("registration_number", form.registration_number.trim());
        fd.append("title", form.title.trim());
        if (form.event_id) fd.append("event_id", form.event_id);
        if (form.award_standing) fd.append("award_standing", form.award_standing);
        if (form.achievement_wording) fd.append("achievement_wording", form.achievement_wording);
        if (form.score_or_remarks) fd.append("score_or_remarks", form.score_or_remarks);
        fd.append("file", file);
        const { data } = await certificateService.upload(fd);
        if (data?.student_email) emailRecipient = data.student_email;
      }

      toast.success(
        `Certificate saved and email notification dispatched to: ${emailRecipient || student.email}`,
        { duration: 5000 }
      );
      setUploadOpen(false);
      load();
    } catch (err) {
      console.error("Certificate save error:", err);
      toast.error(err.response?.data?.detail || "Could not issue certificate");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setEditTitle(c.title);
    setEditFile(null);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (editTitle) fd.append("title", editTitle);
      if (editFile) fd.append("file", editFile);
      await certificateService.update(editTarget.id, fd);
      toast.success("Certificate updated");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update certificate");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await certificateService.remove(deleteTarget.id);
      toast.success("Certificate deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete certificate");
    }
  };

  const handleOpenPreview = async (cert) => {
    setPreviewCert(cert);
    setPreviewLoading(true);
    setPreviewError(null);

    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const blob = await certificateService.downloadBlob(cert.id);
      const isImage = blob.type && blob.type.startsWith("image/");
      setIsPdf(!isImage);
      const typedBlob = isImage ? blob : new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(typedBlob);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error("Preview error:", err);
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
      toast.success("Certificate downloaded!");
    } catch (err) {
      console.error("Download error:", err);
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

  return (
    <PageTransition>
      <div className="section-head" style={{ flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 className="page-title">Certificate Management</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Upload and issue certificates by student registration number.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {certs.length > 0 && (
            <div style={{ position: "relative", minWidth: 0, width: "100%", maxWidth: 360 }}>
              <input
                className="form-input"
                style={{ padding: "8px 34px 8px 34px", fontSize: 13 }}
                placeholder="Search certificates, students, reg no..."
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
          <button className="btn btn-primary btn-sm" onClick={openUpload}>
            <FiUploadCloud /> Upload Certificate
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={4} />
      ) : certs.length === 0 ? (
        <EmptyState
          icon={<FiUploadCloud />}
          title="No certificates uploaded yet"
          message="Upload your first certificate to a student's registration number."
          action={
            <button className="btn btn-primary btn-sm" onClick={openUpload}>
              Upload Certificate
            </button>
          }
        />
      ) : (() => {
        const filteredCerts = certs.filter((c) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.trim().toLowerCase();
          const title = (c.title || "").toLowerCase();
          const name = (c.student_name || "").toLowerCase();
          const regNo = (c.registration_number || "").toLowerCase();
          const idStr = `esp-${String(c.id).padStart(6, "0")}`.toLowerCase();
          const numId = String(c.id);

          return title.includes(q) || name.includes(q) || regNo.includes(q) || idStr.includes(q) || numId.includes(q);
        });

        if (filteredCerts.length === 0) {
          return (
            <div className="glass-card" style={{ padding: 40, textAlign: "center", borderRadius: 20 }}>
              <p style={{ color: "var(--text-secondary)", margin: "0 0 12px" }}>
                No certificates matched "<strong>{searchQuery}</strong>".
              </p>
              <button className="btn btn-outline btn-sm" onClick={() => setSearchQuery("")}>
                Clear Search
              </button>
            </div>
          );
        }

        return (
          <div className="grid-cards">
            {filteredCerts.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card glass-card-interactive float-card float-delay-${(i % 3) + 1}`}
                style={{ padding: 22, borderRadius: "20px", display: "flex", flexDirection: "column" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "var(--gradient-soft)",
                      color: "#8b5cf6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FiAward size={22} />
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {c.award_standing && (
                      <span className="badge badge-primary" style={{ fontWeight: 700, fontSize: 11 }}>
                        {c.award_standing}
                      </span>
                    )}
                    <span className="badge badge-info" style={{ fontFamily: "monospace" }}>
                      {c.registration_number}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, color: "var(--text-primary)" }}>
                    {c.student_name || c.title}
                  </h3>
                  {c.student_name && (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                      {c.title}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                  {c.department && <div>Branch: <strong style={{ color: "var(--text-secondary)" }}>{c.department}</strong></div>}
                  {c.event_title && <div>Event: <strong style={{ color: "var(--text-secondary)" }}>{c.event_title}</strong></div>}
                  <div>Issued {formatDate(c.uploaded_at)}</div>
                  {c.email_notification_status === "sent" && (
                    <div style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <FiCheckCircle size={12} /> Email Delivered
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => handleOpenPreview(c)}
                  >
                    <FiEye size={13} /> Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    disabled={downloadingId === c.id}
                    onClick={() => handleDownload(c)}
                  >
                    <FiDownload size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => openEdit(c)}
                  >
                    <FiEdit2 size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: "rgba(220,38,38,0.12)", color: "var(--danger)" }}
                    onClick={() => setDeleteTarget(c)}
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Upload & Issue Certificate Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => !saving && setUploadOpen(false)}
        title="Upload & Issue Certificate"
        width={620}
      >
        <div style={{ maxHeight: "78vh", overflowY: "auto", paddingRight: 4 }}>
          <form onSubmit={handleSubmitCertificate}>
            {/* Step 1: Student Lookup */}
            <div className="form-group">
              <label className="form-label">Student Registration Number</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="form-input"
                  value={form.registration_number}
                  onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      lookupStudent();
                    }
                  }}
                  placeholder="e.g. U1BER24S0036 or 21CS1023"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={lookupStudent}
                  disabled={lookupLoading || !form.registration_number.trim()}
                  style={{ minWidth: 90 }}
                >
                  <FiSearch /> {lookupLoading ? "Searching..." : "Find"}
                </button>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                Enter the student's register number and click Find to load their verified profile.
              </span>
            </div>

            {/* Step 2: Student Details Card */}
            {student && <StudentDetailsCard student={student} />}

            {/* Step 3: Award Standing Selector */}
            <AwardStandingSelector
              value={form.award_standing}
              onChange={handleStandingChange}
              onCustomChange={(val) => setForm((f) => ({ ...f, award_standing: val }))}
            />

            {/* Step 4: Certificate Title */}
            <div className="form-group">
              <label className="form-label">Certificate Title</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  setUserEditedTitle(true);
                }}
                placeholder="e.g. Winner Certificate"
                required
              />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                Auto-suggested from the award standing above; feel free to edit if needed.
              </span>
            </div>

            {/* Step 5: Certificate Achievement Wording */}
            <div className="form-group">
              <label className="form-label">Certificate Achievement Wording</label>
              <input
                className="form-input"
                value={form.achievement_wording}
                onChange={(e) => setForm((f) => ({ ...f, achievement_wording: e.target.value }))}
                placeholder="e.g. First Place, Merit & Achievement, Best Innovation"
                required
              />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                Appears prominently on the official certificate: "for securing <strong>{form.achievement_wording || "[Achievement Wording]"}</strong> in <strong>{events.find((e) => String(e.id) === String(form.event_id))?.title || "[Event Title]"}</strong>".
              </span>
            </div>

            {/* Step 6: Score / Remarks */}
            <div className="form-group">
              <label className="form-label">Score / Remarks (Optional)</label>
              <input
                className="form-input"
                value={form.score_or_remarks}
                onChange={(e) => setForm((f) => ({ ...f, score_or_remarks: e.target.value }))}
                placeholder="e.g. 95/100 points, Best UI & Architecture, Top Performer"
              />
            </div>

            {/* Step 7: Related Event */}
            <div className="form-group">
              <label className="form-label">Related Event</label>
              <select
                className="form-select"
                value={form.event_id}
                onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}
              >
                <option value="">General Campus Award (No specific event)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} {ev.event_date ? `(${formatDate(ev.event_date)})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 8: Certificate Issuance Mode */}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Certificate Issuance Mode</label>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: certMode === "auto" ? "var(--gradient-primary)" : "var(--bg-elevated)",
                    color: certMode === "auto" ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    fontWeight: 600,
                  }}
                  onClick={() => setCertMode("auto")}
                >
                  ✨ Auto-Generate Template
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: certMode === "upload" ? "var(--gradient-primary)" : "var(--bg-elevated)",
                    color: certMode === "upload" ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    fontWeight: 600,
                  }}
                  onClick={() => setCertMode("upload")}
                >
                  📁 Manual File Upload
                </button>
              </div>
            </div>

            {/* Step 9: Issuance Mode Content & File Input */}
            {certMode === "auto" ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    EventSphere will auto-generate the official PDF certificate using verified campus credentials.
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleGenerateModalPreview}
                    disabled={modalPreviewLoading || !student}
                  >
                    <FiEye size={13} /> {modalPreviewLoading ? "Generating..." : "Preview Certificate"}
                  </button>
                </div>

                {modalPreviewBlobUrl && (
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", marginTop: 8 }}>
                    <iframe
                      src={modalPreviewBlobUrl}
                      title="Certificate Preview"
                      style={{ width: "100%", height: "260px", border: "none", background: "#fff" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Certificate PDF</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="form-input"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0] || null;
                    setFile(chosen);
                    if (chosen && chosen.type === "application/pdf") {
                      if (modalPreviewBlobUrl) window.URL.revokeObjectURL(modalPreviewBlobUrl);
                      setModalPreviewBlobUrl(window.URL.createObjectURL(chosen));
                    }
                  }}
                  required={certMode === "upload"}
                />
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                  Attach official PDF document or high-res certificate image.
                </span>

                {modalPreviewBlobUrl && file?.type === "application/pdf" && (
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", marginTop: 10 }}>
                    <iframe
                      src={modalPreviewBlobUrl}
                      title="Uploaded Certificate Preview"
                      style={{ width: "100%", height: "240px", border: "none", background: "#fff" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 11: Notification Banner */}
            <div
              style={{
                background: "rgba(139, 92, 246, 0.08)",
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 12.5,
                color: "#a5b4fc",
                marginBottom: 18,
                border: "1px solid rgba(139, 92, 246, 0.2)",
              }}
            >
              📧 Saving will store the result, issue the digital certificate, and dispatch an email alert to <strong>{student?.email || "the student"}</strong>.
            </div>

            {/* Step 12: Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setUploadOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1.4 }}
                disabled={saving || !student}
              >
                {saving
                  ? "Issuing & Notifying..."
                  : certMode === "auto"
                  ? "Issue Certificate"
                  : "Upload Certificate"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Certificate" width={420}>
        <form onSubmit={handleEditSave}>
          <div className="form-group">
            <label className="form-label">Certificate Title</label>
            <input className="form-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Replace File (optional)</label>
            <input type="file" accept="application/pdf,image/*" className="form-input" onChange={(e) => setEditFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Certificate" width={380}>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
          Delete "{deleteTarget?.title}" for {deleteTarget?.registration_number}? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
      {/* Premium Glassmorphic Certificate Preview Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {previewCert && (
              <div
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
                  zIndex: 99999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 16px",
                  overflowY: "auto",
                  background: "rgba(3, 7, 18, 0.78)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxSizing: "border-box",
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
                    position: "relative",
                    margin: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
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
                          Recipient: {previewCert.registration_number}
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

                  <div
                    style={{
                      flex: 1,
                      minHeight: 380,
                      maxHeight: "68vh",
                      overflowY: "auto",
                      background: "var(--bg-base)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {previewLoading ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-secondary)" }}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                        <span style={{ fontSize: 13 }}>Loading Certificate Preview...</span>
                      </div>
                    ) : previewError ? (
                      <div style={{ textAlign: "center", padding: 24, color: "var(--danger)" }}>
                        <p style={{ fontSize: 14, marginBottom: 12 }}>{previewError}</p>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDownload(previewCert)}
                        >
                          <FiDownload size={13} /> Try Direct Download Instead
                        </button>
                      </div>
                    ) : isPdf ? (
                      <iframe
                        src={previewBlobUrl}
                        title={`Certificate - ${previewCert.title}`}
                        style={{
                          width: "100%",
                          height: "68vh",
                          border: "none",
                          background: "#fff",
                        }}
                      />
                    ) : (
                      <img
                        src={previewBlobUrl}
                        alt={`Certificate - ${previewCert.title}`}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "68vh",
                          objectFit: "contain",
                          padding: 12,
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 10,
                      padding: "14px 24px",
                      borderTop: "1px solid var(--border-color)",
                      background: "var(--bg-glass)",
                    }}
                  >
                    <button type="button" className="btn btn-outline btn-sm" onClick={handleClosePreview}>
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
                      {downloadingId === previewCert.id ? "Downloading..." : "Download"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </PageTransition>
  );
}
