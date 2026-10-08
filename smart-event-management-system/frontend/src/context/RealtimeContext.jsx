import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim();
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      let wsUrl = "";
      if (isLocal && (rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://"))) {
        const parsed = new URL(rawApiUrl);
        const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${wsProto}//${parsed.host}/api/ws`;
      } else if (!isLocal && (rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")) && !rawApiUrl.includes("localhost") && !rawApiUrl.includes("127.0.0.1")) {
        const parsed = new URL(rawApiUrl);
        const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${wsProto}//${parsed.host}/api/ws`;
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/api/ws`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start ping heartbeat
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: "ping" }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          listenersRef.current.forEach((callback) => {
            try {
              callback(data);
            } catch (err) {
              console.error("[Realtime] Listener callback error:", err);
            }
          });
        } catch (e) {
          console.error("[Realtime] Message parse error:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Exponential backoff reconnect
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.warn("[Realtime] WebSocket error:", err);
        ws.close();
      };
    } catch (err) {
      console.warn("[Realtime] WebSocket connection failed:", err);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 4000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const subscribeToEvent = useCallback((eventId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && eventId) {
      wsRef.current.send(
        JSON.stringify({
          action: "subscribe",
          event_id: String(eventId),
        })
      );
    }
  }, []);

  const addListener = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        lastMessage,
        subscribeToEvent,
        addListener,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return ctx;
}
