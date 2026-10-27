import React, { useState } from "react";
import { api } from "../services/api";
import { ShieldAlert } from "./Icons";

export default function AuthModal({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        await api.register({ name, email, password, phone, role });
        // Automatically login after registration
        const loginRes = await api.login({ email, password });
        localStorage.setItem("bank_token", loginRes.token);
        localStorage.setItem("bank_user", JSON.stringify(loginRes.customer));
        onLoginSuccess(loginRes.customer);
      } else {
        const loginRes = await api.login({ email, password });
        localStorage.setItem("bank_token", loginRes.token);
        localStorage.setItem("bank_user", JSON.stringify(loginRes.customer));
        onLoginSuccess(loginRes.customer);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (type) => {
    if (type === "admin") {
      setEmail("admin@bank.com");
      setPassword("adminpassword123");
    } else {
      setEmail("shubho@gmail.com");
      setPassword("userpass123");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "460px" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            borderRadius: "16px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px",
            boxShadow: "0 8px 24px var(--primary-glow)"
          }}>
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800 }}>
            {isRegister ? "Open Bank Portal Account" : "Access Banking Portal"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Smart Digital Banking System • Review 3
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#fca5a5",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" placeholder="e.g. Shubho Das" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" placeholder="e.g. 9876543210" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">System Role (RBAC)</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="customer">Customer (Standard Banking Access)</option>
                  <option value="admin">Bank Administrator (Fraud Guard & Reports)</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" placeholder="name@bank.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", marginTop: "12px", padding: "12px" }}>
            {loading ? "Authenticating..." : isRegister ? "Create Account & Sign In" : "Sign In to Bank"}
          </button>
        </form>

        {/* Quick Demo Pre-fills */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-color)", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "8px" }}>QUICK FILL DEMO CREDENTIALS:</div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <button type="button" onClick={() => handleQuickDemo("customer")} className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem" }}>
              Customer (Shubho)
            </button>
            <button type="button" onClick={() => handleQuickDemo("admin")} className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem" }}>
              Bank Admin
            </button>
          </div>
        </div>

        {/* Toggle Register / Login */}
        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {isRegister ? "Already registered?" : "Don't have an account yet?"}{" "}
          <span
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
          >
            {isRegister ? "Sign In" : "Register Now"}
          </span>
        </div>

      </div>
    </div>
  );
}
