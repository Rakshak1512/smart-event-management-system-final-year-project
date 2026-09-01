import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiBell,
  FiSearch,
  FiChevronDown,
  FiUser,
  FiSettings,
  FiLogOut,
  FiX,
  FiCalendar,
  FiAward,
  FiFileText,
  FiCheckSquare,
  FiUsers,
  FiArrowRight,
} from "react-icons/fi";
import ThemeToggle from "../common/ThemeToggle.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { notificationService, searchService } from "../../api/services.js";
import { fileUrl, initials } from "../../utils/format.js";

export default function Topbar({ onMenuClick, basePath, onSearch, showSearch = true }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Global Search State
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    notificationService
      .unreadCount()
      .then(({ data }) => mounted && setUnread(data.count ?? data.unread_count ?? 0))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Handle outside click for avatar menu and global search dropdown
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced global search execution
  const handleSearchChange = (val) => {
    setQuery(val);
    if (onSearch) onSearch(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await searchService.global(trimmed);
        setSearchResults(data?.results || []);
      } catch (err) {
        console.error("Global search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const handleSelectResult = (item) => {
    setSearchOpen(false);
    setQuery("");
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    if (onSearch) onSearch("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
    } else if (e.key === "Enter" && searchResults.length > 0) {
      e.preventDefault();
      handleSelectResult(searchResults[0]);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Events":
        return <FiCalendar color="#8b5cf6" size={15} />;
      case "Certificates":
        return <FiAward color="#d946ef" size={15} />;
      case "My Registrations":
      case "Student Registrations":
      case "Registrations":
        return <FiFileText color="#3b82f6" size={15} />;
      case "Results & Winners":
        return <FiAward color="#eab308" size={15} />;
      case "Assigned Work":
        return <FiCheckSquare color="#f97316" size={15} />;
      case "Faculty Directory":
        return <FiUsers color="#10b981" size={15} />;
      case "Notifications":
        return <FiBell color="#ec4899" size={15} />;
      default:
        return <FiArrowRight color="#8b5cf6" size={15} />;
    }
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 24px",
        background: "var(--bg-glass)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <button
          className="menu-btn"
          onClick={onMenuClick}
          style={{
            display: "none",
            background: "none",
            border: "none",
            fontSize: 22,
            color: "var(--text-primary)",
          }}
        >
          <FiMenu />
        </button>

        {showSearch && (
          <div
            ref={searchContainerRef}
            style={{
              position: "relative",
              maxWidth: 380,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--input-bg)",
                border: "1.5px solid var(--border-color)",
                borderRadius: 999,
                padding: "9px 16px",
                width: "100%",
                boxShadow: searchOpen ? "0 0 0 2px rgba(139, 92, 246, 0.25)" : "none",
                transition: "box-shadow 0.2s ease",
              }}
            >
              <FiSearch color="var(--text-muted)" size={16} />
              <input
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (query.trim()) setSearchOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search events, certificates, registrations..."
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  color: "var(--text-primary)",
                  width: "100%",
                  fontSize: 13.5,
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 2,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "var(--text-muted)",
                  }}
                  title="Clear search"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>

            {/* Global Search Results Dropdown Overlay */}
            {searchOpen && (
              <div
                className="glass-card"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  maxHeight: 400,
                  overflowY: "auto",
                  background: "var(--bg-elevated)",
                  borderRadius: 18,
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 16px 36px rgba(0, 0, 0, 0.25)",
                  zIndex: 100,
                  padding: "8px 0",
                }}
              >
                {searching ? (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <span className="dot-pulse" /> Searching EventSphere...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div
                    style={{
                      padding: "24px 18px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      fontSize: 13,
                    }}
                  >
                    No matching records found for <strong style={{ color: "var(--text-primary)" }}>"{query}"</strong>.
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        padding: "6px 16px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      Search Results ({searchResults.length})
                    </div>

                    {searchResults.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectResult(item)}
                        style={{
                          padding: "10px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                          borderBottom:
                            idx < searchResults.length - 1
                              ? "1px solid rgba(255, 255, 255, 0.04)"
                              : "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-glass)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: "rgba(139, 92, 246, 0.12)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {getCategoryIcon(item.category)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  marginTop: 2,
                                }}
                              >
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {item.badge && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "rgba(139, 92, 246, 0.15)",
                              color: "#8b5cf6",
                              flexShrink: 0,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />

        <Link
          to={`${basePath}/notifications`}
          style={{
            position: "relative",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary)",
          }}
        >
          <FiBell size={18} />
          {unread > 0 && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                background: "var(--danger)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: "50%",
                minWidth: 17,
                height: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
              }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "none",
              border: "none",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            {user?.profile_picture ? (
              <img
                src={fileUrl(user.profile_picture)}
                alt=""
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--gradient-primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {initials(user?.name)}
              </span>
            )}
            <span style={{ fontSize: 14, fontWeight: 600 }}>{user?.name?.split(" ")[0]}</span>
            <FiChevronDown size={14} color="var(--text-muted)" />
          </button>

          {menuOpen && (
            <div
              className="glass-card"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 200,
                borderRadius: 16,
                padding: 6,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-color)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                zIndex: 60,
              }}
            >
              <Link
                to={`${basePath}/profile`}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  color: "var(--text-primary)",
                  fontSize: 13.5,
                  fontWeight: 500,
                }}
              >
                <FiUser size={16} /> Profile
              </Link>
              <Link
                to={`${basePath}/settings`}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  color: "var(--text-primary)",
                  fontSize: 13.5,
                  fontWeight: 500,
                }}
              >
                <FiSettings size={16} /> Settings
              </Link>
              <button
                onClick={logout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  color: "var(--danger)",
                  fontSize: 13.5,
                  fontWeight: 500,
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <FiLogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
