export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const rawApiUrl = import.meta.env.VITE_API_URL || "";
const backendBase = rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "") : "";

export function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/api/") || normalized.startsWith("api/")) {
    const cleanApi = normalized.startsWith("/") ? normalized : `/${normalized}`;
    return backendBase ? `${backendBase}${cleanApi}` : cleanApi;
  }
  const cleanPath = normalized.replace(/^\/?(uploads\/)+/, "");
  return backendBase ? `${backendBase}/uploads/${cleanPath}` : `/uploads/${cleanPath}`;
}


export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function statusBadgeClass(status) {
  switch (status) {
    case "approved":
    case "completed":
      return "badge badge-success";
    case "cancelled":
    case "rejected":
      return "badge badge-danger";
    case "pending":
      return "badge badge-warning";
    default:
      return "badge badge-info";
  }
}
