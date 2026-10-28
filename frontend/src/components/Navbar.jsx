import React from "react";
import { ShieldAlert, Activity, LogOut, Users } from "./Icons";

export default function Navbar({ user, onLogout, activeTab, onTabChange, unreadAlertsCount }) {
  return (
    <header className="glass-panel" style={{ margin: "16px 24px", padding: "14px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            padding: "10px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)"
          }}>
            <ShieldAlert size={22} className="glow-text-blue" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Smart Digital Banking
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="pulse-indicator"></div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                MongoDB Change Stream Active
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav style={{ display: "flex", gap: "8px", background: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
            <button
              onClick={() => onTabChange("customer")}
              className={`btn btn-sm ${activeTab === "customer" ? "btn-primary" : "btn-secondary"}`}
            >
              Customer Banking
            </button>

            {user.role === "admin" && (
              <button
                onClick={() => onTabChange("admin")}
                className={`btn btn-sm ${activeTab === "admin" ? "btn-danger" : "btn-secondary"}`}
                style={{ position: "relative" }}
              >
                <ShieldAlert size={14} />
                Fraud Center
                {unreadAlertsCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "50%",
                    fontSize: "0.65rem",
                    padding: "2px 6px",
                    fontWeight: 800
                  }}>
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
            )}
          </nav>
        )}

        {/* User Info & Actions */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{user.name}</div>
              <span className={`badge ${user.role === "admin" ? "badge-critical" : "badge-medium"}`}>
                {user.role}
              </span>
            </div>

            <button onClick={onLogout} className="btn btn-secondary btn-sm" title="Log out">
              <LogOut size={16} />
              Exit
            </button>
          </div>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Authentication Required
          </div>
        )}

      </div>
    </header>
  );
}
